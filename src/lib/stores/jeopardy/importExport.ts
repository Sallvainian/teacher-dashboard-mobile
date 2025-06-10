// src/lib/stores/jeopardy/importExport.ts
// Import/export operations

import { get } from 'svelte/store';
import { v4 as uuidv4 } from 'uuid';
import { games } from './core';
import { saveGameToSupabase } from './database';
import type { Category, Question } from '$lib/types/jeopardy';

// Import/Export operations
export function importGameData(gameId: string, jsonData: Record<string, unknown>): boolean {
	try {
		// Validate the required structure
		if (!jsonData || typeof jsonData !== 'object') {
			return false;
		}

		// Check for categories array
		if (!Array.isArray(jsonData.categories)) {
			return false;
		}

		const categories: Category[] = [];

		for (const catData of jsonData.categories) {
			if (!catData.name || !Array.isArray(catData.questions)) {
				continue;
			}

			const questions: Question[] = [];

			for (const qData of catData.questions) {
				if (!qData.text || !qData.answer || typeof qData.pointValue !== 'number') {
					continue;
				}

				questions.push({
					id: uuidv4(),
					text: qData.text,
					answer: qData.answer,
					pointValue: qData.pointValue,
					isDoubleJeopardy: Boolean(qData.isDoubleJeopardy),
					isAnswered: false,
					timeLimit: typeof qData.timeLimit === 'number' ? qData.timeLimit : undefined
				});
			}

			categories.push({
				id: uuidv4(),
				name: catData.name,
				questions
			});
		}

		// Update the game with imported data
		games.update((allGames) =>
			allGames.map((game) =>
				game.id === gameId
					? { ...game, categories, lastModified: new Date().toISOString() }
					: game
			)
		);

		// Save to Supabase asynchronously
		const game = get(games).find((g) => g.id === gameId);
		if (game) {
			saveGameToSupabase(game).catch((_err) => {
				console.error('Error saving game after import');
			});
		}

		return true;
	} catch (_error: unknown) {
		return false;
	}
}

export function exportGameData(gameId: string): string {
	const game = get(games).find((g) => g.id === gameId);
	if (!game) return '';

	const exportData = {
		name: game.name,
		categories: game.categories.map((cat) => ({
			name: cat.name,
			questions: cat.questions.map((q) => ({
				text: q.text,
				answer: q.answer,
				pointValue: q.pointValue,
				isDoubleJeopardy: q.isDoubleJeopardy,
				timeLimit: q.timeLimit
			}))
		}))
	};

	return JSON.stringify(exportData, null, 2);
}