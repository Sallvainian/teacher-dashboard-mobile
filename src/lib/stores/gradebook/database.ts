/**
 * @ai-context GRADEBOOK_DATABASE - Enhanced database operations with parallel loading
 * @ai-dependencies enhanced database service, gradebook stores, model converters
 * @ai-sideEffects Updates gradebook stores, modifies localStorage cache
 * @ai-exports loadAllData, ensureDataLoaded functions with performance optimization
 */

import { get } from 'svelte/store';
import { gradebookService } from '$lib/services/supabaseService';
import {
	dbStudentToAppStudent,
	dbClassToAppClass,
	dbAssignmentToAppAssignment,
	dbGradeToAppGrade
} from '$lib/utils/modelConverters';
import {
	students,
	classes,
	assignments,
	grades,
	selectedClassId,
	isLoading,
	error,
	dataLoaded
} from './core';

// Load all data from Supabase or localStorage with parallel optimization
export async function loadAllData(): Promise<void> {
	isLoading.set(true);
	error.set(null);

	try {
		// ====== PERFORMANCE OPTIMIZATION: PARALLEL LOADING ======
		// Instead of 5 sequential database calls, execute all in parallel
		console.log('🚀 Loading gradebook data in parallel...');
		const startTime = performance.now();

		const [
			studentsData,
			classesData,
			classStudentsData,
			assignmentsData,
			gradesData
		] = await Promise.all([
			gradebookService.getItems('students'),
			gradebookService.getItems('classes'),
			gradebookService.getItems('class_students'),
			gradebookService.getItems('assignments'),
			gradebookService.getItems('grades')
		]);

		const loadTime = performance.now() - startTime;
		console.log(`✅ Parallel loading completed in ${loadTime.toFixed(2)}ms`);

		// Transform data to match our store format
		const transformedStudents = studentsData.map(dbStudentToAppStudent);

		const transformedClasses = classesData.map((cls) =>
			dbClassToAppClass(cls, classStudentsData)
		);

		// Map assignments to their classes directly using assignment.class_id
		const transformedAssignments = assignmentsData.map((assignment) => {
			return dbAssignmentToAppAssignment(assignment, assignment.class_id);
		});

		const transformedGrades = gradesData.map(dbGradeToAppGrade);

		// Update stores
		students.set(transformedStudents);
		classes.set(transformedClasses);
		assignments.set(transformedAssignments);
		grades.set(transformedGrades);

		// Select first class if none selected
		if (classesData.length > 0 && get(selectedClassId) === null) {
			selectedClassId.set(classesData[0].id);
			gradebookService.saveToStorage('selectedClassId', classesData[0].id);
		}

		// Mark data as loaded
		dataLoaded.set(true);
	} catch (err: unknown) {
		console.error('Error loading gradebook data:', err);
		error.set(err instanceof Error ? err.message : 'Failed to load data');
	} finally {
		isLoading.set(false);
	}
}

// Ensure data is loaded before using the store
export async function ensureDataLoaded(): Promise<void> {
	if (get(dataLoaded)) return;
	await loadAllData();
}

// Utility function to save to storage
export function saveToStorage<T>(key: string, value: T): void {
	gradebookService.saveToStorage(key, value);
}

// Utility function to load from storage
export function loadFromStorage<T>(key: string, defaultValue: T): T {
	return gradebookService.loadFromStorage(key, defaultValue);
}