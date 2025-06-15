// src/lib/stores/gradebook/utilityActions.ts
// Utility operations for gradebook store

import { get } from 'svelte/store';
import { gradebookService } from '$lib/services/supabaseService';
import { 
	students, 
	classes, 
	selectedClassId, 
	assignments, 
	grades, 
	useSupabase, 
	error, 
	dataLoaded 
} from './core';
import { loadAllData } from './database';
import { gradebookActions } from '../appState';


// Toggle storage mode between Supabase and localStorage
export function setUseSupabase(value: boolean): void {
	useSupabase.set(value);
	gradebookService.setUseSupabase(value);
	if (value) {
		// If enabling Supabase, load data from it
		void loadAllData();
	}
}

// Ensure data is loaded - using unified error handling
export async function ensureDataLoaded(): Promise<boolean> {
	// Check if data is already loaded
	if (get(dataLoaded)) {
		return true;
	}

	// Check if we should use Supabase
	if (!get(useSupabase)) {
		dataLoaded.set(true);
		gradebookActions.setDataLoaded(true);
		return true;
	}

	// Load data using unified error handling
	const result = await gradebookActions.withLoadingAndError(loadAllData);
	return result !== null;
}