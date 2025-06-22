// src/lib/stores/jeopardy/index.ts
// Main jeopardy store that combines all modules

// Core stores
import {
	games,
	loading,
	error,
	wagerAmount,
	getGames,
	getActiveGame,
	getActiveQuestion,
	getLeadingTeam
} from './core';

// Database operations
import { ensureDataLoaded, loadAllGames } from './database';

// Game actions
import {
	createGame,
	deleteGame,
	addCategory,
	deleteCategory,
	addQuestion,
	updateQuestion,
	deleteQuestion,
	addTeam,
	deleteTeam,
	updateTeamScore,
	updateGameSettings
} from './gameActions';

// State actions
import {
	setActiveGame,
	setActiveQuestion,
	markQuestionAnswered,
	setWagerAmount,
	resetAllScores,
	resetGameBoard
} from './stateActions';

// Templates
import { getGameTemplates, applyGameTemplate } from './templates';

// Import/Export
import { importGameData, exportGameData } from './importExport';

// Create the combined jeopardy store
function createJeopardyStore() {
	// Return public API - same as original but now modular
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	return {
		// Stores
		subscribe: games.subscribe,
		getGames,
		getActiveGame,
		getActiveQuestion,
		getLeadingTeam,
		wagerAmount,
		loading: { subscribe: loading.subscribe },
		error: { subscribe: error.subscribe },

		// Data loading
		ensureDataLoaded,
		loadAllGames,

		// Game CRUD
		createGame,
		deleteGame,

		// Category operations
		addCategory,
		deleteCategory,

		// Question operations
		addQuestion,
		updateQuestion,
		deleteQuestion,

		// Team operations
		addTeam,
		deleteTeam,
		updateTeamScore,

		// Settings
		updateGameSettings,

		// Game state
		setActiveGame,
		setActiveQuestion,
		markQuestionAnswered,
		setWagerAmount,

		// Reset operations
		resetAllScores,
		resetGameBoard,

		// Import/Export
		importGameData,
		exportGameData,

		// Templates
		getGameTemplates,
		applyGameTemplate
	};
}

export const jeopardyStore = createJeopardyStore();