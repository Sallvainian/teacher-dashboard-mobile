// src/lib/stores/gradebook/classActions.ts
// Class management operations

import { get } from 'svelte/store';
import { gradebookService } from '$lib/services/supabaseService';
import { classes, selectedClassId, error } from './core';
import { addGlobalStudent, assignStudentToClass } from './studentActions';
import type { Class } from '$lib/types/gradebook';
import { createClassId } from '$lib/types/ai-optimized';

// Add a new class
export async function addClass(name: string, userId?: string): Promise<void> {
	const trimmed = name.trim();
	if (!trimmed) return;

	try {
		// Check if class already exists
		const currentClasses = get(classes);
		const existingClass = currentClasses.find(cls => cls.name === trimmed);
		if (existingClass) {
			console.warn(`Class "${trimmed}" already exists`);
			return;
		}

		// Insert into database or localStorage
		const result = await gradebookService.insertItem('classes', {
			name: trimmed,
			user_id: userId // Include user_id if provided
		});

		if (!result) throw new Error('Failed to add class');

		// Update local store
		const newClass: Class = {
			id: createClassId(result.id),
			name: result.name,
			studentIds: []
		};

		classes.update((arr: Class[]) => [...arr, newClass]);
		selectedClassId.update((cur: string | null) => cur ?? result.id);

		// Save selected class ID
		gradebookService.saveToStorage('selectedClassId', get(selectedClassId));
	} catch (err: unknown) {
		console.error('Error adding class:', err);
		error.set(err instanceof Error ? err.message : 'Failed to add class');
	}
}

// Delete a class
export async function deleteClass(classId: string): Promise<void> {
	try {
		// Delete from database
		await gradebookService.deleteItem('classes', classId);

		// Update local store
		classes.update((arr: Class[]) => arr.filter((cls) => cls.id !== classId));

		// If this was the selected class, clear selection
		if (get(selectedClassId) === classId) {
			selectedClassId.set(null);
			gradebookService.saveToStorage('selectedClassId', null);
		}
	} catch (err: unknown) {
		error.set(err instanceof Error ? err.message : 'Failed to delete class');
	}
}

// Select a class
export function selectClass(id: string | null): void {
	selectedClassId.set(id);
	gradebookService.saveToStorage('selectedClassId', id);
}

// Import classes from JSON
export async function importClassesFromJSON(
	jsonData: Array<{ name: string; students?: Array<{ name: string }> }>,
	userId?: string
): Promise<void> {
	try {
		for (const classData of jsonData) {
			if (classData.name) {
				// Add the class
				await addClass(classData.name, userId);

				// If students are included, add them
				if (classData.students && Array.isArray(classData.students)) {
					const currentClasses = get(classes);
					const newClass = currentClasses[currentClasses.length - 1]; // Get the just-added class

					for (const studentData of classData.students) {
						if (studentData.name) {
							const studentId = await addGlobalStudent(studentData.name, userId);
							if (studentId && newClass) {
								await assignStudentToClass(studentId, newClass.id);
							}
						}
					}
				}
			}
		}
	} catch (err: unknown) {
		error.set(err instanceof Error ? err.message : 'Failed to import classes');
	}
}