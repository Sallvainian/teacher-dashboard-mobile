// src/lib/stores/gradebook/studentActions.ts
// Student management operations

import { get } from 'svelte/store';
import { gradebookService } from '$lib/services/supabaseService';
import { dbStudentToAppStudent } from '$lib/utils/modelConverters';
import { authStore } from '../auth';
import { students, classes, error } from './core';
import type { Student, Class } from '$lib/types/gradebook';
import { createStudentId } from '$lib/types/ai-enforcement';

// Add a global student
export async function addGlobalStudent(name: string, userId?: string): Promise<string | null> {
	const trimmed = name.trim();
	if (!trimmed) return null;

	try {
		// Get user_id from auth if not provided
		if (!userId) {
			const currentUser = get(authStore).user;
			userId = currentUser?.id;
		}

		// Insert into database or localStorage
		const result = await gradebookService.insertItem('students', {
			name: trimmed,
			user_id: userId
		});

		if (!result) throw new Error('Failed to add student');

		// Update local store
		const newStudent = dbStudentToAppStudent(result);
		students.update((arr: Student[]) => [...arr, newStudent]);

		return newStudent.id;
	} catch (err: unknown) {
		console.error('Error adding student:', err);
		error.set(err instanceof Error ? err.message : 'Failed to add student');
		return null;
	}
}

// Assign student to class
export async function assignStudentToClass(studentId: string, classId: string): Promise<void> {
	try {
		// Insert relationship into database or localStorage
		await gradebookService.insertItem('class_students', {
			class_id: classId,
			student_id: studentId
		});

		// Update local store
		classes.update((clsArray: Class[]) =>
			clsArray.map((cls: Class) =>
				cls.id === classId && !cls.studentIds.includes(createStudentId(studentId))
					? { ...cls, studentIds: [...cls.studentIds, createStudentId(studentId)] }
					: cls
			)
		);
	} catch (err: unknown) {
		console.error('Error assigning student to class:', err);
		error.set(err instanceof Error ? err.message : 'Failed to assign student');
	}
}

// Helper function for removing student from class
function removeStudentFromClassHelper(cls: Class, classId: string, studentId: string): Class {
	if (cls.id !== classId) return cls;
	return { ...cls, studentIds: cls.studentIds.filter((id: string) => id !== studentId) };
}

// Remove student from class
export async function removeStudentFromClass(studentId: string, classId: string): Promise<void> {
	try {
		// Get the specific class_students entry
		const classStudents = await gradebookService.getItems('class_students', {
			filters: {
				class_id: classId,
				student_id: studentId
			}
		});

		if (classStudents.length > 0) {
			// For tables that use composite keys instead of an 'id' field
			await gradebookService.deleteItem('class_students', {
				class_id: classId,
				student_id: studentId
			});
		}

		// Update local store
		classes.update((clsArray: Class[]) =>
			clsArray.map((cls: Class) => removeStudentFromClassHelper(cls, classId, studentId))
		);
	} catch (err: unknown) {
		console.error('Error removing student from class:', err);
		error.set(err instanceof Error ? err.message : 'Failed to remove student');
	}
}

// Import students to existing class from JSON
export async function importStudentsToClass(
	studentsData: Array<{ name: string }>,
	classId: string,
	userId?: string
): Promise<void> {
	try {
		for (const studentData of studentsData) {
			if (studentData.name) {
				const studentId = await addGlobalStudent(studentData.name.trim(), userId);
				if (studentId) {
					await assignStudentToClass(studentId, classId);
				}
			}
		}
	} catch (err: unknown) {
		error.set(err instanceof Error ? err.message : 'Failed to import students to class');
	}
}