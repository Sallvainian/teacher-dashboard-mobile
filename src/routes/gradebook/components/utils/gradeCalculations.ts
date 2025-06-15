import type { Assignment, Grade, Student } from '$lib/types/gradebook';

export interface ColumnSummary {
	assignmentId: string;
	average: number;
	median: number;
	high: number;
	low: number;
	submitted: number;
	missing: number;
	percentage: number;
}

/**
 * Calculate statistics for an assignment column
 */
export function calculateColumnSummary(
	assignment: Assignment,
	grades: Grade[],
	studentCount: number
): ColumnSummary {
	const assignmentGrades = grades.filter(g => g.assignmentId === assignment.id);
	const scores = assignmentGrades.map(g => g.points).filter(p => p > 0);
	
	if (scores.length === 0) {
		return {
			assignmentId: assignment.id,
			average: 0,
			median: 0,
			high: 0,
			low: 0,
			submitted: 0,
			missing: studentCount,
			percentage: 0
		};
	}
	
	const sorted = [...scores].sort((a, b) => a - b);
	const average = scores.reduce((a, b) => a + b, 0) / scores.length;
	const median = sorted.length % 2 === 0
		? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
		: sorted[Math.floor(sorted.length / 2)];
	
	return {
		assignmentId: assignment.id,
		average: Math.round((average / assignment.maxPoints) * 100),
		median: Math.round((median / assignment.maxPoints) * 100),
		high: Math.round((Math.max(...scores) / assignment.maxPoints) * 100),
		low: Math.round((Math.min(...scores) / assignment.maxPoints) * 100),
		submitted: scores.length,
		missing: studentCount - scores.length,
		percentage: Math.round((scores.length / studentCount) * 100)
	};
}

/**
 * Calculate a student's average for given assignments
 */
export function calculateStudentAverage(
	studentId: string,
	assignments: Assignment[],
	grades: Grade[]
): { average: number; completed: number; total: number } {
	const studentGrades = assignments.map(assignment => {
		const grade = grades.find(g => g.studentId === studentId && g.assignmentId === assignment.id);
		return grade && grade.points > 0 ? grade.points : null;
	}).filter(g => g !== null);
	
	if (studentGrades.length === 0) {
		return { average: 0, completed: 0, total: assignments.length };
	}
	
	const totalPossible = assignments.reduce((sum, assignment) => sum + assignment.maxPoints, 0);
	const totalEarned = studentGrades.reduce((sum, g) => sum + (g ?? 0), 0);
	const average = Math.round((totalEarned / (studentGrades.length * (totalPossible / assignments.length))) * 100);
	
	return {
		average,
		completed: studentGrades.length,
		total: assignments.length
	};
}

/**
 * Generate grade color based on performance
 */
export function getGradeColor(points: number, maxPoints: number): string {
	if (points <= 0 || maxPoints <= 0) return '';
	
	const percentage = (points / maxPoints) * 100;
	
	if (percentage >= 90) return 'bg-green-100 dark:bg-green-900/30';
	if (percentage >= 80) return 'bg-blue-100 dark:bg-blue-900/30';
	if (percentage >= 70) return 'bg-yellow-100 dark:bg-yellow-900/30';
	if (percentage >= 60) return 'bg-orange-100 dark:bg-orange-900/30';
	return 'bg-red-100 dark:bg-red-900/30';
}

/**
 * Sort students by last name alphabetically
 */
export function sortStudentsByLastName(students: Student[]): Student[] {
	return students.sort((a, b) => {
		const lastNameA = a.name.split(' ').pop()?.toLowerCase() || '';
		const lastNameB = b.name.split(' ').pop()?.toLowerCase() || '';
		return lastNameA.localeCompare(lastNameB);
	});
}

/**
 * Sort assignments by due date, then by name
 */
export function sortAssignmentsByDueDate(assignments: Assignment[]): Assignment[] {
	return assignments.sort((a, b) => {
		// If both have due dates, sort by due date
		if (a.dueDate && b.dueDate) {
			return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
		}
		// Put assignments with due dates before those without
		if (a.dueDate && !b.dueDate) return -1;
		if (!a.dueDate && b.dueDate) return 1;
		// If neither has due date, sort by name
		return a.name.localeCompare(b.name);
	});
}

/**
 * Generate assignment categories from assignment names
 */
export function generateAssignmentCategories(assignments: Assignment[]): string[] {
	const categories = new Set<string>();
	assignments.forEach(assignment => {
		const firstWord = assignment.name.split(' ')[0];
		if (firstWord && firstWord.length > 0) {
			categories.add(firstWord);
		} else {
			categories.add('Other');
		}
	});
	return Array.from(categories).sort();
}

/**
 * Filter assignments by category and search term
 */
export function filterAssignments(
	assignments: Assignment[],
	category: string | null,
	searchTerm: string
): Assignment[] {
	let filtered = assignments;
	
	if (category) {
		filtered = filtered.filter(assignment => {
			const firstWord = assignment.name.split(' ')[0];
			const assignmentCategory = firstWord && firstWord.length > 0 ? firstWord : 'Other';
			return assignmentCategory === category;
		});
	}
	
	if (searchTerm) {
		filtered = filtered.filter(assignment => 
			assignment.name.toLowerCase().includes(searchTerm.toLowerCase())
		);
	}
	
	return filtered;
}