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


// Toggle storage mode between Supabase and localStorage
export function setUseSupabase(value: boolean): void {
	useSupabase.set(value);
	gradebookService.setUseSupabase(value);
	if (value) {
		// If enabling Supabase, load data from it
		void loadAllData();
	}
}

// Ensure data is loaded with full authentication check
export async function ensureDataLoaded(): Promise<boolean> {
	try {
		// Check if data is already loaded
		if (get(dataLoaded)) {
			return true;
		}

		// Check if we should use Supabase
		if (!get(useSupabase)) {
			dataLoaded.set(true);
			return true;
		}

		// Import supabase client dynamically if needed to ensure it's initialized
		const { supabase } = await import('$lib/supabaseClient');

		// Check authentication state with timeout protection
		try {
			const timeoutPromise = new Promise((_, reject) => {
				setTimeout(() => reject(new Error('Auth session timeout')), 20000);
			});
			await Promise.race([supabase.auth.getSession(), timeoutPromise]);
		} catch (error) {
			console.warn('Auth session check timed out, continuing with data load');
		}

		// Load data
		await loadAllData();
		return true;
	} catch (err: unknown) {
		console.error('Error ensuring data loaded:', err);
		error.set(err instanceof Error ? err.message : String(err));
		throw err;
	}
}