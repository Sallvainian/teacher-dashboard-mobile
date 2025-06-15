// src/lib/stores/gradebook/gradeActions.ts
// Grade management and calculation operations

import { get } from 'svelte/store';
import { gradebookService } from '$lib/services/supabaseService';
import { grades, assignments, error } from './core';
import type { Grade, Assignment } from '$lib/types/gradebook';
import type { ActionResult, StudentId, AssignmentId, ClassId } from '$lib/types/ai-enforcement';
import { createStudentId, createAssignmentId, createClassId } from '$lib/types/ai-enforcement';

// Record a grade for a student
export async function recordGrade(
	studentId: StudentId,
	assignmentId: AssignmentId,
	points: number
): Promise<ActionResult<void>> {
	const pts = Math.max(0, points);

	if (pts < 0) {
		return {
			success: false,
			error: 'Grade points cannot be negative',
			recoverable: true
		};
	}

	try {
		// Check if grade already exists
		const existingGrades = await gradebookService.getItems('grades', {
			filters: {
				student_id: studentId,
				assignment_id: assignmentId
			}
		});

		let isUpdate = false;
		if (existingGrades.length > 0) {
			// Update existing grade
			await gradebookService.updateItem('grades', existingGrades[0].id, {
				points: pts
			});
			isUpdate = true;
		} else {
			// Insert new grade
			await gradebookService.insertItem('grades', {
				student_id: studentId,
				assignment_id: assignmentId,
				points: pts
			});
		}

		// Update local store
		grades.update((arr: Grade[]) => {
			const idx = arr.findIndex(
				(g: Grade) => g.studentId === studentId && g.assignmentId === assignmentId
			);
			if (idx > -1) {
				const newArr = [...arr];
				newArr[idx].points = pts;
				return newArr;
			}
			return [...arr, { studentId, assignmentId, points: pts }];
		});

		return {
			success: true,
			data: undefined,
			sideEffects: [
				isUpdate ? 'Updated existing grade' : 'Created new grade',
				'Updated grades store',
				'Updated database'
			]
		};
	} catch (err: unknown) {
		const errorMessage = err instanceof Error ? err.message : 'Failed to record grade';
		console.error('Error recording grade:', err);
		error.set(errorMessage);
		
		return {
			success: false,
			error: errorMessage,
			recoverable: true
		};
	}
}

// Calculate student average in a specific class
export function studentAverageInClass(studentId: string, classId: string): number {
	const assigns = get(assignments).filter((a: Assignment) => a.classId === classId);
	if (assigns.length === 0) return 0;

	const currentGrades = get(grades);
	let earned = 0;
	let possible = 0;

	for (const a of assigns) {
		const g = currentGrades.find(
			(gr: Grade) => gr.assignmentId === a.id && gr.studentId === studentId
		);
		if (g) earned += g.points;
		possible += a.maxPoints;
	}

	return possible > 0 ? parseFloat(((earned / possible) * 100).toFixed(1)) : 0;
}