// src/lib/stores/jeopardy/stateActions.ts
// Game state management

import { get } from 'svelte/store';
import { games, activeGameId, activeQuestionId, wagerAmount, getActiveGame } from './core';
import { saveGameToSupabase } from './database';
import type { Question } from '$lib/types/jeopardy';

// Game state operations
export function setActiveGame(gameId: string | null): void {
	activeGameId.set(gameId);
}

export function setActiveQuestion(
	question: (Question & { categoryId: string; categoryName: string }) | null
): void {
	activeQuestionId.set(question?.id ?? null);
}

export function markQuestionAnswered(categoryId: string, questionId: string): void {
	games.update((allGames) =>
		allGames.map((game) => ({
			...game,
			categories: game.categories.map((cat) =>
				cat.id === categoryId
					? {
							...cat,
							questions: cat.questions.map((q) =>
								q.id === questionId ? { ...q, isAnswered: true } : q
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
		saveGameToSupabase(game).catch((_err) => {
			console.error('Error saving game after marking question answered');
		});
	}
}

export function setWagerAmount(amount: number): void {
	wagerAmount.set(amount);
}

// Reset operations
export function resetAllScores(): void {
	games.update((allGames) =>
		allGames.map((game) => ({
			...game,
			teams: game.teams.map((team) => ({ ...team, score: 0 })),
			lastModified: new Date().toISOString()
		}))
	);

	// Update in Supabase asynchronously
	const game = get(getActiveGame);
	if (game) {
		saveGameToSupabase(game).catch((_err) => {
			console.error('Error saving game after resetting scores');
		});
	}
}

export function resetGameBoard(): void {
	games.update((allGames) =>
		allGames.map((game) => ({
			...game,
			categories: game.categories.map((cat) => ({
				...cat,
				questions: cat.questions.map((q) => ({ ...q, isAnswered: false }))
			})),
			teams: game.teams.map((team) => ({ ...team, score: 0 })),
			lastModified: new Date().toISOString()
		}))
	);

	// Update in Supabase asynchronously
	const game = get(getActiveGame);
	if (game) {
		saveGameToSupabase(game).catch((_err) => {
			console.error('Error saving game after resetting board');
		});
	}
}