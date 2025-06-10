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

// Clear all data
export async function clearAllData(): Promise<void> {
	try {
		// Clear tables with id field
		const tablesWithId = ['grades', 'assignments', 'classes', 'students'] as const;

		for (const table of tablesWithId) {
			const items = await gradebookService.getItems(table);
			for (const item of items) {
				await gradebookService.deleteItem(table, item.id);
			}
		}

		// Handle class_students with composite key
		const classStudents = await gradebookService.getItems('class_students');
		for (const item of classStudents) {
			// Pass composite key as an object
			await gradebookService.deleteItem('class_students', {
				class_id: item.class_id,
				student_id: item.student_id
			});
		}

		// Clear local stores
		students.set([]);
		classes.set([]);
		selectedClassId.set(null);
		assignments.set([]);
		grades.set([]);

		// Clear localStorage
		gradebookService.removeFromStorage('selectedClassId');
	} catch (err: unknown) {
		error.set(err instanceof Error ? err.message : 'Failed to clear data');
	}
}

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

		// Check authentication state
		await supabase.auth.getSession();

		// Load data
		await loadAllData();
		return true;
	} catch (err: unknown) {
		console.error('Error ensuring data loaded:', err);
		error.set(err instanceof Error ? err.message : String(err));
		throw err;
	}
}