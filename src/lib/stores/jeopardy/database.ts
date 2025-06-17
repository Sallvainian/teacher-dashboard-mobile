// src/lib/stores/jeopardy/database.ts
// Database operations for jeopardy games

import { get } from 'svelte/store';
import { v4 as uuidv4 } from 'uuid';
import { supabaseService } from '$lib/services/supabaseService';
import { authStore } from '../auth';
import { games, loading, error, dataLoaded } from './core';
import type { JeopardyGame, Category, Team } from '$lib/types/jeopardy';
import type { User } from '@supabase/supabase-js';
import type { Json } from '$lib/types/database';

// Helper function to get current user
async function getCurrentUser(): Promise<User | null> {
	const { user } = get(authStore);
	return user;
}

// Load all games for the current user
export async function loadAllGames(): Promise<void> {
	loading.set(true);
	error.set(null);

	try {
		const user = await getCurrentUser();
		if (!user) {
			games.set([]);
			return;
		}

		// Load games
		const dbGames = await supabaseService.getItems('games', {
			filters: { user_id: user.id }
		});

		// Load all related data and construct full game objects
		const fullGames: JeopardyGame[] = [];

		for (const dbGame of dbGames) {
			const fullGame = await loadGameWithRelatedData(dbGame);
			if (fullGame) {
				fullGames.push(fullGame);
			}
		}

		games.set(fullGames);
	} catch (err: unknown) {
		console.error('Error loading games:', err);
		error.set(err instanceof Error ? err.message : 'Failed to load games');
	} finally {
		loading.set(false);
	}
}

// Load a single game with all related data
async function loadGameWithRelatedData(dbGame: unknown): Promise<JeopardyGame | null> {
	try {
		const gameRecord = dbGame as Record<string, unknown>;
		
		// Load categories for this game
		const categories = await supabaseService.getItems('game_categories', {
			filters: { game_id: gameRecord.id }
		});

		// Load questions for all categories
		const fullCategories: Category[] = [];
		for (const cat of categories) {
			const categoryRecord = cat as Record<string, unknown>;
			const questions = await supabaseService.getItems('questions', {
				filters: { category_id: categoryRecord.id }
			});

			fullCategories.push({
				id: categoryRecord.id as string,
				name: categoryRecord.category_name as string,
				questions: questions.map((q) => {
					const qRecord = q as Record<string, unknown>;
					return {
						id: qRecord.id as string,
						text: qRecord.question_text as string,
						answer: qRecord.answer_text as string,
						pointValue: qRecord.point_value as number,
						isDoubleJeopardy: (qRecord.is_double_jeopardy as boolean) || false,
						isAnswered: (qRecord.answered as boolean) || false,
						timeLimit: (qRecord.time_limit as number) ?? 30
					};
				})
			});
		}

		// Extract teams from settings (since teams table doesn't exist)
		const gameSettings = gameRecord.settings as Record<string, unknown>;
		const teams = (gameSettings?.teams ?? []) as Team[];
		const settings = gameSettings?.gameSettings ?? {
			useTimer: true,
			timerSize: 'large' as const,
			defaultTimeLimit: 30,
			readingTime: 5,
			autoShowAnswer: false
		};

		return {
			id: gameRecord.id as string,
			name: gameRecord.name as string,
			dateCreated: (gameRecord.created_at as string) ?? new Date().toISOString(),
			categories: fullCategories,
			teams: teams,
			settings: settings,
			lastModified: (gameRecord.last_modified as string) ?? (gameRecord.created_at as string) ?? new Date().toISOString()
		};
	} catch (err: unknown) {
		console.error('Error loading game with related data:', err);
		return null;
	}
}

// Save or update a game in Supabase
export async function saveGameToSupabase(game: JeopardyGame): Promise<string> {
	try {
		const user = await getCurrentUser();
		if (!user) throw new Error('User not authenticated');

		const gameData = {
			name: game.name,
			settings: {
				gameSettings: game.settings,
				teams: game.teams
			} as unknown as Json,
			last_modified: new Date().toISOString(),
			is_public: false,
			owner_role: 'teacher' as const,
			user_id: user.id
		};

		// Check if this game was loaded from the database
		// New games created with temp IDs won't be in the original loaded games
		const loadedGames = get(games);
		const isNewGame = !loadedGames.some(g => g.id === game.id && g.dateCreated !== game.dateCreated);

		// Only include ID for updates, not inserts
		if (!isNewGame && game.id) {
			(gameData as any).id = game.id;
		}

		console.log('Attempting to save game with data:', gameData);
		console.log('Game ID check - game.id:', game.id, 'isNewGame:', isNewGame);
		
		const savedGame = isNewGame
			? await supabaseService.insertItem('games', gameData)
			: await supabaseService.updateItem('games', game.id, gameData);

		console.log('SavedGame result:', savedGame);
		
		if (!savedGame) {
			throw new Error('supabaseService.insertItem returned null - check database connection and table permissions');
		}

		// CRITICAL: Update the game object with the real database ID
		// This prevents duplicate saves on subsequent calls
		if (isNewGame && savedGame.id !== game.id) {
			game.id = savedGame.id;
		}

		// Save categories and questions
		await saveCategoriesAndQuestions(game.categories, savedGame.id);

		return savedGame.id;
	} catch (err: unknown) {
		console.error('Error saving game:', err);
		throw err;
	}
}

// Save categories and their questions
async function saveCategoriesAndQuestions(categories: Category[], gameId: string): Promise<void> {
	for (const [i, cat] of categories.entries()) {
		const categoryData = {
			game_id: gameId,
			category_name: cat.name,
			order_index: i,
			id: cat.id || uuidv4()
		};

		const savedCategory = cat.id && cat.id !== 'new'
			? await supabaseService.updateItem('game_categories', cat.id, categoryData)
			: await supabaseService.insertItem('game_categories', categoryData);

		if (!savedCategory) continue;

		for (const [j, q] of cat.questions.entries()) {
			const questionData = {
				category_id: savedCategory.id,
				question_text: q.text,
				answer_text: q.answer,
				point_value: q.pointValue,
				order_index: j,
				answered: q.isAnswered,
				is_double_jeopardy: q.isDoubleJeopardy,
				id: q.id || uuidv4()
			};

			if (q.id && q.id !== 'new') {
				await supabaseService.updateItem('questions', q.id, questionData);
			} else {
				await supabaseService.insertItem('questions', questionData);
			}
		}
	}
}

// Delete a game from Supabase
export async function deleteGameFromSupabase(gameId: string): Promise<void> {
	try {
		await supabaseService.deleteItem('games', gameId);
	} catch (err: unknown) {
		console.error('Error deleting game:', err);
		throw err;
	}
}

// Delete a category from Supabase
export async function deleteCategoryFromSupabase(categoryId: string): Promise<void> {
	try {
		await supabaseService.deleteItem('game_categories', categoryId);
	} catch (err: unknown) {
		console.error('Error deleting category:', err);
		throw err;
	}
}

// Delete a question from Supabase
export async function deleteQuestionFromSupabase(questionId: string): Promise<void> {
	try {
		await supabaseService.deleteItem('questions', questionId);
	} catch (err: unknown) {
		console.error('Error deleting question:', err);
		throw err;
	}
}

// Ensure data is loaded before using the store
export async function ensureDataLoaded(): Promise<void> {
	if (get(dataLoaded)) return;
	await loadAllGames();
	dataLoaded.set(true);
}