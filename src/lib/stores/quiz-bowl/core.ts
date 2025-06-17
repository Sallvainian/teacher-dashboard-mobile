// src/lib/stores/jeopardy/core.ts
// Core jeopardy stores - basic state management only

import { writable, derived } from 'svelte/store';
import type { JeopardyGame } from '$lib/types/jeopardy';

// Core state stores
export const games = writable<JeopardyGame[]>([]);
export const activeGameId = writable<string | null>(null);
export const activeQuestionId = writable<string | null>(null);
export const wagerAmount = writable<number>(0);
export const loading = writable<boolean>(false);
export const error = writable<string | null>(null);
export const dataLoaded = writable<boolean>(false);

// Derived stores
export const getGames = derived(games, ($games) => $games);

export const getActiveGame = derived([games, activeGameId], ([$games, $activeGameId]) => {
	if (!$activeGameId) return null;
	return $games.find((game) => game.id === $activeGameId) || null;
});

export const getActiveQuestion = derived(
	[getActiveGame, activeQuestionId],
	([$activeGame, $activeQuestionId]) => {
		if (!$activeGame || !$activeQuestionId) return null;

		for (const category of $activeGame.categories) {
			const question = category.questions.find((q) => q.id === $activeQuestionId);
			if (question) {
				return {
					...question,
					categoryId: category.id,
					categoryName: category.name
				};
			}
		}
		return null;
	}
);

export const getLeadingTeam = derived(getActiveGame, ($activeGame) => {
	if (!$activeGame || $activeGame.teams.length === 0) return null;
	return $activeGame.teams.reduce(
		(leader, team) => (team.score > leader.score ? team : leader),
		$activeGame.teams[0]
	);
});