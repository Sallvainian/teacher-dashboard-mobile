/**
 * @ai-context GRADEBOOK_TYPES - Type definitions for gradebook functionality
 * @ai-dependencies ai-enforcement.ts for branded types
 * @ai-sideEffects None - pure type definitions
 * @ai-exports Student, Class, Assignment, Grade interfaces
 */
import type { StudentId, ClassId, AssignmentId, GradeId } from './ai-enforcement';

export interface Student {
	id: StudentId;
	name: string;
	firstName?: string;
	lastName?: string;
}

// Renamed from Category to Class - represents a class that students attend
export interface Class {
	id: ClassId;
	name: string;
	studentIds: StudentId[];
}

export interface Assignment {
	id: AssignmentId;
	name: string;
	maxPoints: number;
	classId: ClassId; // Renamed from categoryId to classId
	scoreType?: string;
	dueDate?: string;
}

export interface Grade {
	id?: GradeId;
	studentId: StudentId;
	assignmentId: AssignmentId;
	points: number;
}
