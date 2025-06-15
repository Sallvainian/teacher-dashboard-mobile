// src/lib/stores/gradebook/classActions.ts
// Class management operations

import { get } from 'svelte/store';
import { gradebookService } from '$lib/services/supabaseService';
import { classes, selectedClassId, error } from './core';
import { addGlobalStudent, assignStudentToClass } from './studentActions';
import type { Class } from '$lib/types/gradebook';
import { createClassId } from '$lib/types/ai-optimized';

// Add a new class
export async function addClass(name: string, userId?: string, additionalFields?: {
	grade_level?: string | null;
	subject?: string | null;
	school_year?: string | null;
	join_code?: string | null;
}): Promise<void> {
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

		// Prepare class data
		const classData: any = {
			name: trimmed,
			user_id: userId
		};

		// Add additional fields if provided
		if (additionalFields) {
			if (additionalFields.grade_level) classData.grade_level = additionalFields.grade_level;
			if (additionalFields.subject) classData.subject = additionalFields.subject;
			if (additionalFields.school_year) classData.school_year = additionalFields.school_year;
			if (additionalFields.join_code) classData.join_code = additionalFields.join_code;
		}

		// Insert into database or localStorage
		const result = await gradebookService.insertItem('classes', classData);

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

// Update a class
export async function updateClass(classId: string, updates: {
	name?: string;
	grade_level?: string | null;
	subject?: string | null;
	school_year?: string | null;
	join_code?: string | null;
}): Promise<void> {
	try {
		// Prepare update data
		const updateData: any = {};
		
		if (updates.name !== undefined) updateData.name = updates.name;
		if (updates.grade_level !== undefined) updateData.grade_level = updates.grade_level;
		if (updates.subject !== undefined) updateData.subject = updates.subject;
		if (updates.school_year !== undefined) updateData.school_year = updates.school_year;
		if (updates.join_code !== undefined) updateData.join_code = updates.join_code;

		// Update in database
		const result = await gradebookService.updateItem('classes', classId, updateData);
		
		if (!result) throw new Error('Failed to update class');

		// Update local store
		classes.update((clsArray: Class[]) =>
			clsArray.map((cls: Class) =>
				cls.id === classId
					? { ...cls, name: updates.name || cls.name }
					: cls
			)
		);
	} catch (err: unknown) {
		console.error('Error updating class:', err);
		error.set(err instanceof Error ? err.message : 'Failed to update class');
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
	jsonData: Array<{ 
		name: string; 
		students?: Array<{ name: string }>;
		grade_level?: string;
		subject?: string;
		school_year?: string;
		join_code?: string;
	}>,
	userId?: string
): Promise<void> {
	try {
		for (const classData of jsonData) {
			if (classData.name) {
				// Prepare additional fields
				const additionalFields = {
					grade_level: classData.grade_level || null,
					subject: classData.subject || null,
					school_year: classData.school_year || null,
					join_code: classData.join_code || null
				};

				// Add the class
				await addClass(classData.name, userId, additionalFields);

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