// src/lib/stores/gradebook/core.ts
// Core gradebook stores - basic state management only

import { writable, derived } from 'svelte/store';
import { gradebookService } from '$lib/services/supabaseService';
import type { Student, Class, Assignment, Grade } from '$lib/types/gradebook';

// Core state stores
export const students = writable<Student[]>([]);
export const classes = writable<Class[]>([]);
export const selectedClassId = writable<string | null>(
	gradebookService.loadFromStorage('selectedClassId', null)
);
export const assignments = writable<Assignment[]>([]);
export const grades = writable<Grade[]>([]);
export const isLoading = writable(false);
export const error = writable<string | null>(null);
export const dataLoaded = writable(false);
export const useSupabase = writable(gradebookService.isUsingSupabase());

// Derived stores - computed values
export const getGlobalStudents = derived(students, ($students) => $students);
export const getClasses = derived(classes, ($classes) => $classes);

export const getSelectedClass = derived(
	[classes, selectedClassId],
	([$classes, $selectedClassId]) => {
		return $selectedClassId 
			? $classes.find((cls) => cls.id === $selectedClassId) || null
			: null;
	}
);

export const getStudentsInSelectedClass = derived(
	[students, classes, selectedClassId],
	([$students, $classes, $selectedClassId]) => {
		if (!$selectedClassId) return [];
		
		const cls = $classes.find((c) => c.id === $selectedClassId);
		return cls ? $students.filter((st) => cls.studentIds.includes(st.id)) : [];
	}
);

export const getAssignmentsForSelectedClass = derived(
	[assignments, selectedClassId],
	([$assignments, $selectedClassId]) => {
		return $selectedClassId 
			? $assignments.filter((asgn) => asgn.classId === $selectedClassId)
			: [];
	}
);

// Create a combined derived store for the entire state
export const store = derived(
	[
		students,
		classes,
		selectedClassId,
		assignments,
		grades,
		isLoading,
		error,
		useSupabase,
		dataLoaded
	],
	([
		$students,
		$classes,
		$selectedClassId,
		$assignments,
		$grades,
		$isLoading,
		$error,
		$useSupabase,
		$dataLoaded
	]) => {
		return {
			// State values
			students: $students,
			classes: $classes,
			selectedClassId: $selectedClassId,
			assignments: $assignments,
			grades: $grades,
			isLoading: $isLoading,
			error: $error,
			useSupabase: $useSupabase,
			dataLoaded: $dataLoaded,

			// Computed values
			getGlobalStudents: $students,
			getClasses: $classes,
			getSelectedClass: $selectedClassId
				? $classes.find((cls) => cls.id === $selectedClassId) || null
				: null,
			getStudentsInSelectedClass: $selectedClassId
				? $students.filter((st) => {
						const cls = $classes.find((c) => c.id === $selectedClassId);
						return cls ? cls.studentIds.includes(st.id) : false;
					})
				: [],
			getAssignmentsForSelectedClass: $selectedClassId
				? $assignments.filter((asgn) => asgn.classId === $selectedClassId)
				: []
		};
	}
);