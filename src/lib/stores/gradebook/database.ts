// src/lib/stores/gradebook/database.ts
// Database operations for gradebook

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

// Load all data from Supabase or localStorage
export async function loadAllData(): Promise<void> {
	isLoading.set(true);
	error.set(null);

	try {
		// Load students
		const studentsData = await gradebookService.getItems('students');

		// Load classes
		const classesData = await gradebookService.getItems('classes');

		// Load class_students relations
		const classStudentsData = await gradebookService.getItems('class_students');

		// Load assignments with direct class relationships
		const assignmentsData = await gradebookService.getItems('assignments');

		// Load grades
		const gradesData = await gradebookService.getItems('grades');

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