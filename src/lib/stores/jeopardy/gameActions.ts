// src/lib/stores/jeopardy/gameActions.ts
// Game CRUD operations

import { get } from 'svelte/store';
import { v4 as uuidv4 } from 'uuid';
import { games, error } from './core';
import { saveGameToSupabase, deleteGameFromSupabase, deleteCategoryFromSupabase, deleteQuestionFromSupabase } from './database';
import { setActiveGame } from './stateActions';
import type { JeopardyGame, Category, Question, Team, GameSettings } from '$lib/types/jeopardy';

// Game CRUD operations
export async function createGame(name: string): Promise<string> {
	const tempId = uuidv4();
	const newGame: JeopardyGame = {
		id: tempId,
		name,
		dateCreated: new Date().toISOString(),
		categories: [],
		teams: [],
		settings: {
			useTimer: true,
			timerSize: 'large' as const,
			defaultTimeLimit: 30,
			readingTime: 5,
			autoShowAnswer: false
		},
		lastModified: new Date().toISOString()
	};

	// Add to local store first
	games.update((g) => [...g, newGame]);
	setActiveGame(tempId);

	try {
		// Save to Supabase and get the real ID
		const realGameId = await saveGameToSupabase(newGame);
		
		// Update local store with real database ID
		games.update((g) => 
			g.map(game => 
				game.id === tempId 
					? { ...game, id: realGameId }
					: game
			)
		);
		setActiveGame(realGameId);
		
		return realGameId;
	} catch (err) {
		console.error('Error saving new game:', err);
		// Remove from local store on failure
		games.update((g) => g.filter(game => game.id !== tempId));
		throw err;
	}
}

export async function deleteGame(gameId: string): Promise<void> {
	try {
		await deleteGameFromSupabase(gameId);
		games.update((g) => g.filter((game) => game.id !== gameId));

		const { activeGameId } = await import('./core');
		if (get(activeGameId) === gameId) {
			setActiveGame(null);
		}
	} catch (err: unknown) {
		if (err instanceof Error) {
			error.set(err.message || 'Failed to delete game');
		} else {
			error.set('An unknown error occurred while deleting the game.');
		}
	}
}

// Category operations
export function addCategory(gameId: string, categoryName: string): void {
	const newCategory: Category = {
		id: uuidv4(),
		name: categoryName,
		questions: []
	};

	games.update((allGames) =>
		allGames.map((game) =>
			game.id === gameId
				? {
						...game,
						categories: [...game.categories, newCategory],
						lastModified: new Date().toISOString()
					}
				: game
		)
	);

	// Save to Supabase asynchronously
	const game = get(games).find((g) => g.id === gameId);
	if (game) {
		saveGameToSupabase(game).catch((err) => {
			console.error('Error saving game after adding category:', err);
		});
	}
}

export function deleteCategory(categoryId: string): void {
	games.update((allGames) =>
		allGames.map((game) => ({
			...game,
			categories: game.categories.filter((cat) => cat.id !== categoryId),
			lastModified: new Date().toISOString()
		}))
	);

	// Delete from Supabase asynchronously
	deleteCategoryFromSupabase(categoryId).catch((err) => {
		console.error('Error deleting category from Supabase:', err);
	});
}

// Question operations
export function addQuestion(categoryId: string, question: Omit<Question, 'id'>): void {
	const newQuestion: Question = {
		id: uuidv4(),
		...question,
		isAnswered: false
	};

	games.update((allGames) =>
		allGames.map((game) => ({
			...game,
			categories: game.categories.map((cat) =>
				cat.id === categoryId ? { ...cat, questions: [...cat.questions, newQuestion] } : cat
			),
			lastModified: new Date().toISOString()
		}))
	);

	// Save to Supabase asynchronously
	const game = get(games).find((g) => g.categories.some((c) => c.id === categoryId));
	if (game) {
		saveGameToSupabase(game).catch((err) => {
			console.error('Error saving game after adding question:', err);
		});
	}
}

export function updateQuestion(
	categoryId: string,
	questionId: string,
	updatedQuestion: Partial<Question>
): void {
	games.update((allGames) =>
		allGames.map((game) => ({
			...game,
			categories: game.categories.map((cat) =>
				cat.id === categoryId
					? {
							...cat,
							questions: cat.questions.map((q) =>
								q.id === questionId ? { ...q, ...updatedQuestion } : q
							)
						}
					: cat
			),
			lastModified: new Date().toISOString()
		}))
	);

	// Update in Supabase asynchronously
	const game = get(games).find((g) => g.categories.some((c) => c.id === categoryId));
	if (game) {
		saveGameToSupabase(game).catch((err) => {
			console.error('Error saving game after updating question:', err);
		});
	}
}

export function deleteQuestion(categoryId: string, questionId: string): void {
	games.update((allGames) =>
		allGames.map((game) => ({
			...game,
			categories: game.categories.map((cat) =>
				cat.id === categoryId
					? { ...cat, questions: cat.questions.filter((q) => q.id !== questionId) }
					: cat
			),
			lastModified: new Date().toISOString()
		}))
	);

	// Delete from Supabase asynchronously
	deleteQuestionFromSupabase(questionId).catch((err) => {
		console.error('Error deleting question from Supabase:', err);
	});
}

// Team operations
export function addTeam(gameId: string, teamName: string): void {
	const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
	const existingColors =
		get(games)
			.find((g) => g.id === gameId)
			?.teams.map((t) => t.color) || [];

	const availableColors = colors.filter((c) => !existingColors.includes(c));
	const teamColor = availableColors[0] || colors[Math.floor(Math.random() * colors.length)];

	const newTeam: Team = {
		id: uuidv4(),
		name: teamName,
		score: 0,
		color: teamColor
	};

	games.update((allGames) =>
		allGames.map((game) =>
			game.id === gameId
				? { ...game, teams: [...game.teams, newTeam], lastModified: new Date().toISOString() }
				: game
		)
	);

	// Save to Supabase asynchronously
	const game = get(games).find((g) => g.id === gameId);
	if (game) {
		saveGameToSupabase(game).catch((_err) => {
			console.error('Error saving game after adding team');
		});
	}
}

export function deleteTeam(teamId: string): void {
	games.update((allGames) =>
		allGames.map((game) => ({
			...game,
			teams: game.teams.filter((team) => team.id !== teamId),
			lastModified: new Date().toISOString()
		}))
	);

	// Save game after team deletion
	const game = get(games).find((g) => g.teams.some((t) => t.id === teamId));
	if (game) {
		saveGameToSupabase(game).catch((_err) => {
			console.error('Error saving game after deleting team');
		});
	}
}

export function updateTeamScore(teamId: string, points: number): void {
	games.update((allGames) =>
		allGames.map((game) => ({
			...game,
			teams: game.teams.map((team) =>
				team.id === teamId ? { ...team, score: team.score + points } : team
			),
			lastModified: new Date().toISOString()
		}))
	);

	// Update in Supabase asynchronously
	const game = get(games).find((g) => g.teams.some((t) => t.id === teamId));
	if (game) {
		saveGameToSupabase(game).catch((_err) => {
			console.error('Error saving game after updating team score');
		});
	}
}

// Settings operations
export function updateGameSettings(gameId: string, settings: Partial<GameSettings>): void {
	games.update((allGames) =>
		allGames.map((game) =>
			game.id === gameId
				? {
						...game,
						settings: { ...game.settings, ...settings },
						lastModified: new Date().toISOString()
					}
				: game
		)
	);

	// Save to Supabase asynchronously
	const game = get(games).find((g) => g.id === gameId);
	if (game) {
		saveGameToSupabase(game).catch((_err) => {
			console.error('Error saving game after updating settings');
		});
	}
}