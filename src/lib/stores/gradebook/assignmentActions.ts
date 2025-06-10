// src/lib/stores/gradebook/assignmentActions.ts
// Assignment management operations

import { gradebookService } from '$lib/services/supabaseService';
import { dbAssignmentToAppAssignment } from '$lib/utils/modelConverters';
import { assignments, grades, error } from './core';
import type { Assignment } from '$lib/types/gradebook';

// Assignment template types
export const ASSIGNMENT_TEMPLATES = {
	EXPLORATION: 'Exploration',
	PHENOMENON: 'Can You Explain the Phenomenon?',
	GATHER_DATA: 'Gather Data',
	REFLECT_SUMMARIZE: 'Reflect and Summarize'
} as const;

export type AssignmentTemplate = typeof ASSIGNMENT_TEMPLATES[keyof typeof ASSIGNMENT_TEMPLATES];

// Template configuration for bulk creation
export interface AssignmentTemplateConfig {
	discipline: string; // e.g., "PS" for Physical Science, "LS" for Life Science, "ESS" for Earth & Space
	unit: number;       // e.g., 1, 2, 3...
	lesson: number;     // e.g., 1, 2, 3...
	templates: AssignmentTemplate[];
	maxPoints: number;
	dueDate?: string;   // Optional due date for all assignments
}

// Assignment creation data type
interface AssignmentCreateData {
	name: string;
	max_points: number;
	class_id: string;
	due_date?: string;
}

// Assignment update data type
interface AssignmentUpdateData {
	name: string;
	max_points: number;
	due_date?: string;
}

// Generate assignment name from template
export function generateAssignmentName(
	discipline: string,
	unit: number,
	lesson: number,
	template: AssignmentTemplate
): string {
	return `${discipline}S U${unit}L${lesson} ${template}`;
}

// Add assignment to class
export async function addAssignmentToClass(
	name: string,
	maxPoints: number,
	classId: string,
	dueDate?: string
): Promise<void> {
	const trimmed = name.trim();
	if (!trimmed || maxPoints <= 0) return;

	try {
		// Verify the class exists first
		const classData = await gradebookService.getItems('classes', {
			filters: { id: classId }
		});
		
		if (!classData || classData.length === 0) {
			throw new Error(`Class with ID ${classId} not found`);
		}

		// Insert assignment with direct class_id reference
		const assignmentData: AssignmentCreateData = {
			name: trimmed,
			max_points: maxPoints,
			class_id: classId
		};
		
		if (dueDate) {
			assignmentData.due_date = dueDate;
		}

		const result = await gradebookService.insertItem('assignments', assignmentData);

		if (!result) throw new Error('Failed to add assignment');

		// Update local store
		const newAssignment = dbAssignmentToAppAssignment(result, classId);
		assignments.update((arr: Assignment[]) => [...arr, newAssignment]);
	} catch (err: unknown) {
		console.error('Error adding assignment:', err);
		error.set(err instanceof Error ? err.message : 'Failed to add assignment');
	}
}

// Update assignment
export async function updateAssignment(assignmentId: string, name: string, maxPoints: number, dueDate?: string): Promise<void> {
	try {
		// Update in database
		const updateData: AssignmentUpdateData = {
			name,
			max_points: maxPoints
		};
		
		if (dueDate !== undefined) {
			updateData.due_date = dueDate;
		}

		const updatedAssignment = await gradebookService.updateItem('assignments', assignmentId, updateData);

		if (updatedAssignment) {
			// Update local store
			assignments.update((arr: Assignment[]) => 
				arr.map(a => a.id === assignmentId ? {
					...a,
					name,
					maxPoints,
					dueDate: dueDate || a.dueDate
				} : a)
			);
		}
	} catch (err: unknown) {
		console.error('Error updating assignment:', err);
		error.set(err instanceof Error ? err.message : 'Failed to update assignment');
	}
}

// Delete assignment
export async function deleteAssignment(assignmentId: string): Promise<void> {
	try {
		// Delete from database
		await gradebookService.deleteItem('assignments', assignmentId);

		// Delete all grades for this assignment
		const gradesToDelete = await gradebookService.getItems('grades', {
			filters: { assignment_id: assignmentId }
		});

		for (const grade of gradesToDelete) {
			await gradebookService.deleteItem('grades', grade.id);
		}

		// Update local stores
		assignments.update((arr: Assignment[]) => 
			arr.filter(a => a.id !== assignmentId)
		);
		
		grades.update((arr) => 
			arr.filter(g => g.assignmentId !== assignmentId)
		);
	} catch (err: unknown) {
		console.error('Error deleting assignment:', err);
		error.set(err instanceof Error ? err.message : 'Failed to delete assignment');
	}
}

// Bulk add assignments to multiple classes
export async function bulkAddAssignments(
	templateConfig: AssignmentTemplateConfig,
	classIds: string[]
): Promise<{ created: number; failed: number; errors: string[] }> {
	const results = { created: 0, failed: 0, errors: [] as string[] };
	
	if (classIds.length === 0 || templateConfig.templates.length === 0) {
		return results;
	}

	try {
		// Generate all assignment names
		const assignmentNames = templateConfig.templates.map(template =>
			generateAssignmentName(
				templateConfig.discipline,
				templateConfig.unit,
				templateConfig.lesson,
				template
			)
		);

		// Create assignments for each class in parallel
		const createPromises: Promise<unknown>[] = [];
		
		for (const classId of classIds) {
			for (const name of assignmentNames) {
				const assignmentData: AssignmentCreateData = {
					name,
					max_points: templateConfig.maxPoints,
					class_id: classId
				};
				
				if (templateConfig.dueDate) {
					assignmentData.due_date = templateConfig.dueDate;
				}
				
				createPromises.push(
					gradebookService.insertItem('assignments', assignmentData).then(result => {
						if (result) {
							const newAssignment = dbAssignmentToAppAssignment(result, classId);
							assignments.update((arr: Assignment[]) => [...arr, newAssignment]);
							results.created++;
						}
					}).catch(err => {
						results.failed++;
						results.errors.push(`Failed to create "${name}" for class: ${err.message}`);
					})
				);
			}
		}

		// Wait for all operations to complete
		await Promise.allSettled(createPromises);
		
	} catch (err: unknown) {
		console.error('Error in bulk assignment creation:', err);
		error.set(err instanceof Error ? err.message : 'Failed to create assignments');
	}

	return results;
}