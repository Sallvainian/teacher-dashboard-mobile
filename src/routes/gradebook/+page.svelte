<script lang="ts">
    // Add type checking for undefined values
	import { gradebookStore } from '$lib/stores/gradebook';
	import { authStore } from '$lib/stores/auth';
	import LoadingBounce from '$lib/components/LoadingBounce.svelte';
	import ImportWizard from '$lib/components/ImportWizard.svelte';
	import AssignmentCreationModal from '$lib/components/AssignmentCreationModal.svelte';
	import { goto } from '$app/navigation';
	import { fade } from 'svelte/transition';
	import type { Assignment } from '$lib/types/gradebook';
	import { isHTMLInputElement, getEventTargetValue } from '$lib/utils/domHelpers';
	import type { UnknownError } from '$lib/types/ai-enforcement';

	// State variables
	let newStudentName = $state('');
	let newClassName = $state('');
	// Consolidated modal system
	let activeModal = $state<'newClass' | 'newAssignment' | 'student' | 'import' | 'editAssignment' | null>(null);
	let assignmentCreationResult = $state<{ created: number; failed: number } | null>(null);
	let editingAssignmentId = $state<string | null>(null);
	let editAssignmentName = $state('');
	let editMaxPoints = $state(100);
	let editDueDate = $state('');
	
	// PowerTeacher Pro features
	let selectedCells = $state(new Set<string>());
	let selectedAssignments = $state(new Set<string>());
	let bulkGradeValue = $state('');
	let bulkGradeType = $state<'points' | 'percentage' | 'letter'>('points');
	let colorMode = $state(false);
	let colorScheme = $state<'performance' | 'custom'>('performance');
	let customColors = $state<Record<string, string>>({});
	let showBulkActions = $state(false);
	let showColorPanel = $state(false);
	let showAssignmentActions = $state(false);
	let bulkActionLoading = $state(false);
	let assignmentActionLoading = $state(false);
	
	// Assignment flags - simplified to 3 essential flags
	const FLAGS = {
		missing: { icon: 'M', color: 'bg-red-500 text-white', label: 'Missing', shortcut: 'm' },
		late: { icon: 'L', color: 'bg-orange-500 text-white', label: 'Late', shortcut: 'l' },
		exempt: { icon: 'E', color: 'bg-purple-500 text-white', label: 'Exempt', shortcut: 'e' }
	} as const;
	
	// Type for flag keys
	type FlagKey = keyof typeof FLAGS;
	
	// Grade flags state - stores flags for each student/assignment combination
	let gradeFlags = $state<Map<string, Set<string>>>(new Map());
	
	// Assignment navigation and filtering
	let showAssignmentDropdown = $state(false);
	let selectedCategory = $state<string | null>(null);
	let assignmentSearch = $state('');
	let assignmentPage = $state(0);
	let assignmentsPerPage = 7; // Show 7 assignments per page for better alignment
	
	// UI state

	// Reactive values from store
	let selectedClass = $derived($gradebookStore.classes.find(c => c.id === $gradebookStore.selectedClassId));
	// Use direct computation instead of store derived to fix reactivity issues
	let classStudents = $derived.by(() => {
		if (!$gradebookStore.selectedClassId) return [];
		const cls = $gradebookStore.classes.find(c => c.id === $gradebookStore.selectedClassId);
		if (!cls) return [];
		const students = $gradebookStore.students.filter(student => cls.studentIds.includes(student.id));
		
		// Sort students by last name alphabetically
		return students.sort((a, b) => {
			const lastNameA = a.name.split(' ').pop()?.toLowerCase() || '';
			const lastNameB = b.name.split(' ').pop()?.toLowerCase() || '';
			return lastNameA.localeCompare(lastNameB);
		});
	});
	
	let allClassAssignments = $derived.by(() => {
		const assignments = $gradebookStore.getAssignmentsForSelectedClass;
		
		// Sort assignments by due date (earliest first), then by name
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
	});
	
	// Assignment categories and filtering
	let assignmentCategories = $derived.by(() => {
		const categories = new Set<string>();
		allClassAssignments.forEach(assignment => {
			// Simple category extraction: take first word as subject
			const firstWord = assignment.name.split(' ')[0];
			if (firstWord && firstWord.length > 0) {
				categories.add(firstWord);
			} else {
				categories.add('Other');
			}
		});
		return Array.from(categories).sort();
	});
	
	// Filter assignments based on category and search  
	let filteredAssignments = $derived.by(() => {
		let filtered = allClassAssignments;
		
		if (selectedCategory) {
			filtered = filtered.filter(assignment => {
				const firstWord = assignment.name.split(' ')[0];
				const category = firstWord && firstWord.length > 0 ? firstWord : 'Other';
				return category === selectedCategory;
			});
		}
		
		if (assignmentSearch) {
			filtered = filtered.filter(assignment => 
				assignment.name.toLowerCase().includes(assignmentSearch.toLowerCase())
			);
		}
		
		return filtered;
	});
	
	// Calculate total pages
	let totalPages = $derived(Math.ceil(filteredAssignments.length / assignmentsPerPage));
	
	// Reset page if it's out of bounds after filtering
	$effect(() => {
		if (assignmentPage >= totalPages && totalPages > 0) {
			assignmentPage = 0;
		}
	});
	
	// Get assignments for current page
	let classAssignments = $derived.by(() => {
		const start = assignmentPage * assignmentsPerPage;
		const end = start + assignmentsPerPage;
		return filteredAssignments.slice(start, end);
	});
	
	// Column summary calculations - only for visible assignments
	let showColumnSummary = $state(true);
	let columnSummaries = $derived(
		classAssignments.map(assignment => {
			const grades = $gradebookStore.grades.filter(g => g.assignmentId === assignment.id);
			const scores = grades.map(g => g.points).filter(p => p > 0);
			
			if (scores.length === 0) {
				return {
					assignmentId: assignment.id,
					average: 0,
					median: 0,
					high: 0,
					low: 0,
					submitted: 0,
					missing: classStudents.length,
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
				missing: classStudents.length - scores.length,
				percentage: Math.round((scores.length / classStudents.length) * 100)
			};
		})
	);
	
	// Handle null selectedClassId for binding
	let selectedClassIdForBinding = $derived($gradebookStore.selectedClassId || '');

	async function handleClassChange(event: Event) {
		const classId = getEventTargetValue(event);
		if (!classId) return;
		
		selectedClassIdForBinding = classId;
		
		if (classId) {
			await gradebookStore.selectClass(classId);
		}
	}

	async function createNewClass() {
		if (newClassName.trim()) {
			try {
				await gradebookStore.addClass(newClassName.trim(), $authStore.user?.id);
				newClassName = '';
				activeModal = null;
			} catch (error: UnknownError) {
				console.error('Failed to create class:', error);
			}
		}
	}

	async function addStudent() {
		if (newStudentName.trim() && $gradebookStore.selectedClassId) {
			try {
				const studentId = await gradebookStore.addGlobalStudent(newStudentName.trim(), $authStore.user?.id);
				
				if (studentId) {
					await gradebookStore.assignStudentToClass(studentId, $gradebookStore.selectedClassId);
				}
				
				newStudentName = '';
				activeModal = null;
			} catch (error: UnknownError) {
				console.error('Failed to add student:', error);
			}
		}
	}

	function handleAssignmentCreationComplete(result: { created: number; failed: number }) {
		assignmentCreationResult = result;
		// Clear the result after 3 seconds
		setTimeout(() => {
			assignmentCreationResult = null;
		}, 3000);
	}

	function startEditAssignment(assignment: Assignment) {
		editingAssignmentId = assignment.id;
		editAssignmentName = assignment.name;
		editMaxPoints = assignment.maxPoints;
		editDueDate = assignment.dueDate || '';
		activeModal = 'editAssignment';
	}

	function cancelEditAssignment() {
		editingAssignmentId = null;
		editAssignmentName = '';
		editMaxPoints = 100;
		editDueDate = '';
		activeModal = null;
	}

	async function saveEditAssignment() {
		
		if (editingAssignmentId && editAssignmentName.trim()) {
			try {
				await gradebookStore.updateAssignment(
					editingAssignmentId,
					editAssignmentName.trim(),
					editMaxPoints,
					editDueDate || undefined
				);
				cancelEditAssignment();
			} catch (error: UnknownError) {
				console.error('Failed to update assignment:', error);
			}
		}
	}

	async function deleteAssignmentConfirm(assignmentId: string, assignmentName: string) {
		if (confirm(`Are you sure you want to delete "${assignmentName}"? This will also delete all grades for this assignment.`)) {
			try {
				await gradebookStore.deleteAssignment(assignmentId);
			} catch (error: UnknownError) {
				console.error('Failed to delete assignment:', error);
			}
		}
	}

	async function handleGradeChange(studentId: string, assignmentId: string, maxPoints: number, value: string) {
		const points = parseFloat(value) || 0;
		
		if (points < 0 || points > maxPoints) {
			return; // Invalid grade
		}
		
		try {
			await gradebookStore.recordGrade(studentId, assignmentId, points);
		} catch (error: UnknownError) {
			console.error('Failed to record grade:', error);
		}
	}

	async function handleGradeKeydown(event: KeyboardEvent, studentId: string, assignmentId: string) {
		const key = event.key.toLowerCase();
		
		// Handle flag shortcuts
		if (event.ctrlKey || event.metaKey) {
			let flagToToggle = null;
			switch (key) {
				case 'm':
					flagToToggle = 'missing';
					break;
				case 'l':
					flagToToggle = 'late';
					break;
				case 'e':
					flagToToggle = 'exempt';
					break;
			}
			
			if (flagToToggle) {
				event.preventDefault();
				toggleFlag(studentId, assignmentId, flagToToggle);
				return;
			}
		}
		
		if (event.key === 'Delete' || event.key === 'Backspace') {
			event.preventDefault();
			
			// Check if there's a grade to delete
			const existingGrade = $gradebookStore.grades.find(
				g => g.studentId === studentId && g.assignmentId === assignmentId
			);
			
			if (existingGrade && existingGrade.points > 0) {
				try {
					await gradebookStore.recordGrade(studentId, assignmentId, 0);
					// Clear the input field
					if (isHTMLInputElement(event.target)) {
						event.target.value = '';
					}
				} catch (error: UnknownError) {
					console.error('Failed to delete grade:', error);
				}
			}
		}
	}

	// PowerTeacher Pro-inspired functions
	function toggleCellSelection(studentId: string, assignmentId: string) {
		const cellId = `${studentId}|${assignmentId}`;
		if (selectedCells.has(cellId)) {
			selectedCells.delete(cellId);
		} else {
			selectedCells.add(cellId);
		}
		selectedCells = new Set(selectedCells);
	}

	function selectColumn(assignmentId: string) {
		// Only select cells for the specific column (visible on current page)
		classStudents.forEach(student => {
			selectedCells.add(`${student.id}|${assignmentId}`);
		});
		selectedCells = new Set(selectedCells);
	}

	function selectRow(studentId: string) {
		// Only select cells for assignments visible on current page
		classAssignments.forEach(assignment => {
			selectedCells.add(`${studentId}|${assignment.id}`);
		});
		selectedCells = new Set(selectedCells);
	}

	function clearSelection() {
		selectedCells.clear();
		selectedCells = new Set(selectedCells);
	}
	
	// Assignment selection functions
	function toggleAssignmentSelection(assignmentId: string) {
		if (selectedAssignments.has(assignmentId)) {
			selectedAssignments.delete(assignmentId);
		} else {
			selectedAssignments.add(assignmentId);
		}
		selectedAssignments = new Set(selectedAssignments);
	}
	
	function selectAllAssignments() {
		classAssignments.forEach(assignment => {
			selectedAssignments.add(assignment.id);
		});
		selectedAssignments = new Set(selectedAssignments);
	}
	
	function clearAssignmentSelection() {
		selectedAssignments.clear();
		selectedAssignments = new Set(selectedAssignments);
	}
	
	// Bulk assignment operations
	async function bulkDeleteAssignments() {
		if (selectedAssignments.size === 0) return;
		
		const assignmentNames = Array.from(selectedAssignments).map(id => 
			classAssignments.find(a => a.id === id)?.name || 'Unknown'
		).slice(0, 3).join(', ');
		
		const confirmText = selectedAssignments.size > 3 
			? `${assignmentNames}... and ${selectedAssignments.size - 3} more assignments`
			: assignmentNames;
			
		if (!confirm(`Are you sure you want to delete ${selectedAssignments.size} assignment(s)?\n\n${confirmText}\n\nThis will also delete all grades for these assignments.`)) {
			return;
		}
		
		try {
			const deletePromises = Array.from(selectedAssignments).map(assignmentId =>
				gradebookStore.deleteAssignment(assignmentId)
			);
			
			await Promise.allSettled(deletePromises);
			clearAssignmentSelection();
		} catch (error: UnknownError) {
			console.error('Failed to delete assignments:', error);
		}
	}
	
	async function bulkEditAssignmentDueDates() {
		if (selectedAssignments.size === 0) return;
		
		const dateInput = prompt(`Set due date for ${selectedAssignments.size} assignment(s):\nEnter date as MM/DD/YYYY (e.g., 06/15/2025):`);
		if (!dateInput) return;
		
		// Convert MM/DD/YYYY to YYYY-MM-DD format
		let formattedDate = '';
		try {
			const parts = dateInput.trim().split('/');
			if (parts.length === 3) {
				const month = parts[0].padStart(2, '0');
				const day = parts[1].padStart(2, '0');
				const year = parts[2];
				formattedDate = `${year}-${month}-${day}`;
			} else {
				// Try to parse as entered (maybe already in YYYY-MM-DD format)
				const testDate = new Date(dateInput);
				if (isNaN(testDate.getTime())) {
					alert('Invalid date format. Please use MM/DD/YYYY (e.g., 06/15/2025)');
					return;
				}
				formattedDate = dateInput;
			}
		} catch (error) {
			alert('Invalid date format. Please use MM/DD/YYYY (e.g., 06/15/2025)');
			return;
		}
		
		try {
			const updatePromises = Array.from(selectedAssignments).map(assignmentId => {
				const assignment = classAssignments.find(a => a.id === assignmentId);
				if (assignment) {
					return gradebookStore.updateAssignment(
						assignmentId,
						assignment.name,
						assignment.maxPoints,
						formattedDate
					);
				}
			}).filter(Boolean);
			
			await Promise.allSettled(updatePromises);
			clearAssignmentSelection();
		} catch (error: UnknownError) {
			console.error('Failed to update assignment due dates:', error);
		}
	}

	async function applyBulkGrade() {
		if (!bulkGradeValue || selectedCells.size === 0) return;
		
		bulkActionLoading = true;
		try {

		// Only apply to cells without existing grades
		let skippedCount = 0;
		const gradesToApply: Array<{ studentId: string; assignmentId: string; points: number }> = [];

		for (const cellId of selectedCells) {
			const [studentId, assignmentId] = cellId.split('|');
			const assignment = classAssignments.find(a => a.id === assignmentId);
			
			if (!assignment) continue;

			// Skip if there's already a grade
			const existingGrade = $gradebookStore.grades.find(
				g => g.studentId === studentId && g.assignmentId === assignmentId
			);
			if (existingGrade && existingGrade.points > 0) {
				skippedCount++;
				continue; // Skip this cell
			}

			let points = 0;
			
			if (bulkGradeType === 'points') {
				points = parseFloat(bulkGradeValue);
			} else if (bulkGradeType === 'percentage') {
				points = (parseFloat(bulkGradeValue) / 100) * assignment.maxPoints;
			} else if (bulkGradeType === 'letter') {
				const letterGrades: Record<string, number> = {
					'A+': 97, 'A': 93, 'A-': 90,
					'B+': 87, 'B': 83, 'B-': 80,
					'C+': 77, 'C': 73, 'C-': 70,
					'D+': 67, 'D': 63, 'D-': 60,
					'F': 0
				};
				const percentage = letterGrades[bulkGradeValue.toUpperCase()] || 0;
				points = (percentage / 100) * assignment.maxPoints;
			}

			if (points >= 0 && points <= assignment.maxPoints) {
				gradesToApply.push({ studentId, assignmentId, points });
			}
		}

		// Apply all grades in parallel for better performance
		const results = await Promise.allSettled(
			gradesToApply.map(({ studentId, assignmentId, points }) =>
				gradebookStore.recordGrade(studentId, assignmentId, points)
			)
		);

		// Count successes and failures
		const succeeded = results.filter(r => r.status === 'fulfilled').length;
		const failed = results.filter(r => r.status === 'rejected').length;

		// Show summary message
		let message = `Applied ${succeeded} grade${succeeded !== 1 ? 's' : ''}`;
		if (skippedCount > 0) {
			message += `, skipped ${skippedCount} existing grade${skippedCount !== 1 ? 's' : ''}`;
		}
		if (failed > 0) {
			message += `, ${failed} failed`;
		}
		
		// You could show this in a toast or alert if you want

		clearSelection();
		bulkGradeValue = '';
		showBulkActions = false;
		} catch (error) {
			console.error('Failed to apply bulk grades:', error);
		} finally {
			bulkActionLoading = false;
		}
	}

	async function deleteBulkGrades() {
		if (selectedCells.size === 0) return;
		
		bulkActionLoading = true;
		try {

		const gradesToDelete: Array<{ studentId: string; assignmentId: string }> = [];

		for (const cellId of selectedCells) {
			const [studentId, assignmentId] = cellId.split('|');
			
			// Check if there's a grade to delete
			const existingGrade = $gradebookStore.grades.find(
				g => g.studentId === studentId && g.assignmentId === assignmentId
			);
			if (existingGrade && existingGrade.points > 0) {
				gradesToDelete.push({ studentId, assignmentId });
			}
		}

		if (gradesToDelete.length === 0) {
			return;
		}

		// Confirm deletion
		const confirmed = confirm(
			`Delete ${gradesToDelete.length} grade${gradesToDelete.length !== 1 ? 's' : ''}?`
		);
		if (!confirmed) return;

		// Delete all grades in parallel
		const results = await Promise.allSettled(
			gradesToDelete.map(({ studentId, assignmentId }) =>
				gradebookStore.recordGrade(studentId, assignmentId, 0)
			)
		);

		// Count successes and failures
		const succeeded = results.filter(r => r.status === 'fulfilled').length;
		const failed = results.filter(r => r.status === 'rejected').length;

		// Show summary message
		let message = `Deleted ${succeeded} grade${succeeded !== 1 ? 's' : ''}`;
		if (failed > 0) {
			message += `, ${failed} failed`;
		}

		clearSelection();
		showBulkActions = false;
		} catch (error) {
			console.error('Failed to delete bulk grades:', error);
		} finally {
			bulkActionLoading = false;
		}
	}

	function getGradeColor(points: number, maxPoints: number): string {
		if (!colorMode || !points) return '';
		
		const percentage = (points / maxPoints) * 100;
		
		if (colorScheme === 'performance') {
			if (percentage >= 90) return 'bg-green-100 border-green-300 text-green-800';
			if (percentage >= 80) return 'bg-blue-100 border-blue-300 text-blue-800';
			if (percentage >= 70) return 'bg-yellow-100 border-yellow-300 text-yellow-800';
			if (percentage >= 60) return 'bg-orange-100 border-orange-300 text-orange-800';
			return 'bg-red-100 border-red-300 text-red-800';
		}
		
		return customColors[`${points}-${maxPoints}`] || '';
	}

	function getCellId(studentId: string, assignmentId: string): string {
		return `${studentId}|${assignmentId}`;
	}

	function isSelected(studentId: string, assignmentId: string): boolean {
		return selectedCells.has(getCellId(studentId, assignmentId));
	}
	
	// Flag management functions
	function toggleFlag(studentId: string, assignmentId: string, flag: string) {
		const cellId = getCellId(studentId, assignmentId);
		const cellFlags = gradeFlags.get(cellId) || new Set();
		
		if (cellFlags.has(flag)) {
			cellFlags.delete(flag);
		} else {
			cellFlags.add(flag);
		}
		
		if (cellFlags.size === 0) {
			gradeFlags.delete(cellId);
		} else {
			gradeFlags.set(cellId, cellFlags);
		}
		
		// Force reactivity
		gradeFlags = new Map(gradeFlags);
	}
	
	function hasFlag(studentId: string, assignmentId: string, flag: string): boolean {
		const cellId = getCellId(studentId, assignmentId);
		const cellFlags = gradeFlags.get(cellId);
		return cellFlags ? cellFlags.has(flag) : false;
	}
	
	function getVisibleFlags(studentId: string, assignmentId: string): FlagKey[] {
		const cellId = getCellId(studentId, assignmentId);
		const cellFlags = gradeFlags.get(cellId);
		return cellFlags ? Array.from(cellFlags) as FlagKey[] : [];
	}
	
	// Bulk flag operations
	function applyBulkFlag(flag: string) {
		if (selectedCells.size === 0) return;
		
		selectedCells.forEach(cellId => {
			const [studentId, assignmentId] = cellId.split('|');
			const cellFlags = gradeFlags.get(cellId) || new Set();
			cellFlags.add(flag);
			gradeFlags.set(cellId, cellFlags);
		});
		
		gradeFlags = new Map(gradeFlags);
		clearSelection();
	}
	
	function removeBulkFlag(flag: string) {
		if (selectedCells.size === 0) return;
		
		selectedCells.forEach(cellId => {
			const cellFlags = gradeFlags.get(cellId);
			if (cellFlags) {
				cellFlags.delete(flag);
				if (cellFlags.size === 0) {
					gradeFlags.delete(cellId);
				}
			}
		});
		
		gradeFlags = new Map(gradeFlags);
		clearSelection();
	}

	// Check if user has permission to access this page
	let hasPermission = $derived($authStore.role === 'teacher');

	// Redirect students to their dashboard
	$effect(() => {
		if ($authStore.isInitialized && $authStore.user && $authStore.role === 'student') {
			goto('/student/dashboard');
		}
	});

	// Initialize data
	$effect(() => {
		if (hasPermission) {
			gradebookStore.ensureDataLoaded();
		}
	});
	
	// Keyboard navigation for assignment pages
	$effect(() => {
		const handleKeydown = (e: KeyboardEvent) => {
			if (!$gradebookStore.selectedClassId || totalPages <= 1) return;
			
			// Only handle if no input is focused
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
			
			if (e.key === 'ArrowLeft' && assignmentPage > 0) {
				e.preventDefault();
				assignmentPage = assignmentPage - 1;
				clearSelection();
			} else if (e.key === 'ArrowRight' && assignmentPage < totalPages - 1) {
				e.preventDefault();
				assignmentPage = assignmentPage + 1;
				clearSelection();
			}
		};
		
		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});

</script>

{#if !$authStore.isInitialized || ($authStore.user && !hasPermission)}
	<div class="min-h-screen flex items-center justify-center">
		<div class="text-center">
			<div class="bg-card border border-border rounded-lg p-8 max-w-md">
				<h2 class="text-xl font-bold text-highlight mb-4">Access Restricted</h2>
				<p class="text-text-base mb-6">
					The gradebook is only available to teachers. Students can view their grades through their dashboard.
				</p>
				<button
					onclick={() => goto('/student/dashboard')}
					class="btn btn-primary"
				>
					Go to Student Dashboard
				</button>
			</div>
		</div>
	</div>
{:else if $gradebookStore.isLoading}
	<div class="min-h-screen flex items-center justify-center">
		<div class="text-center">
			<LoadingBounce />
			<p class="mt-4 text-muted">Loading gradebook...</p>
		</div>
	</div>
{:else}
	<div class="min-h-screen">
			<div class="container mx-auto px-4 py-8">
				<!-- Header -->
				<div class="mb-8">
					<h1 class="text-3xl font-bold text-highlight mb-2">Gradebook</h1>
					<p class="text-text-base">Manage grades and assignments for your classes</p>
					<!-- Debug info -->
					{#if $gradebookStore.classes.length === 0}
						<p class="text-yellow-400 mt-2">No classes found. Create a class to get started.</p>
					{/if}
				</div>

				<!-- Controls -->
				<div class="flex flex-col lg:flex-row gap-4 mb-6">
					<!-- Enhanced Class Selector -->
					<div class="flex-1">
						<label for="class-select" class="block text-sm font-medium text-text-base mb-2">
							Class / Section
						</label>
						<div class="relative">
							<select
								id="class-select"
								onchange={handleClassChange}
								bind:value={selectedClassIdForBinding}
								class="input w-full pr-10"
							>
								<option value="">Choose a class / section...</option>
								{#each $gradebookStore.classes as cls (cls.id)}
									{@const studentCount = $gradebookStore.students.filter(s => cls.studentIds.includes(s.id)).length}
									{@const assignmentCount = $gradebookStore.assignments.filter(a => a.classId === cls.id).length}
									<option value={cls.id}>
										{cls.name} ({studentCount} students, {assignmentCount} assignments)
									</option>
								{/each}
							</select>
							<div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
								<svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
								</svg>
							</div>
						</div>
						</div>
						{#if selectedClass}
							<div class="mt-2 text-xs text-muted flex items-center gap-4">
								<span class="flex items-center gap-1">
									<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
									</svg>
									{classStudents.length} enrolled
								</span>
								<span class="flex items-center gap-1">
									<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
									</svg>
									{allClassAssignments.length} assignments
								</span>
								<span class="flex items-center gap-1">
									<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
									</svg>
									{$gradebookStore.grades.filter(g => Array.isArray(allClassAssignments) && allClassAssignments.some(a => a.id === g.assignmentId)).length} grades entered
								</span>
							</div>
						{/if}
					</div>
				

			{#if $gradebookStore.selectedClassId && selectedClass}
				<!-- Success Notification -->
				{#if assignmentCreationResult}
					<div class="mb-4 p-4 rounded-lg bg-green-500/20 border border-green-500/50 text-green-400 flex items-center justify-between" transition:fade={{ duration: 200 }}>
						<div class="flex items-center gap-3">
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							<span>
								Successfully created {assignmentCreationResult.created} assignment{assignmentCreationResult.created !== 1 ? 's' : ''}!
								{#if assignmentCreationResult.failed > 0}
									({assignmentCreationResult.failed} failed)
								{/if}
							</span>
						</div>
						<button
							onclick={() => assignmentCreationResult = null}
							class="text-green-400 hover:text-green-300"
							aria-label="Close assignment creation result notification"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>
				{/if}
				
				{#if totalPages > 1 && assignmentPage < totalPages - 1}
					<div class="mb-4 p-3 rounded-lg bg-purple-900/20 border border-purple-500/30 text-purple-300 text-sm flex items-center gap-2">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<span>
							Showing page {assignmentPage + 1} of {totalPages}. {filteredAssignments.length - (assignmentPage + 1) * assignmentsPerPage} more assignments available. Use arrow keys or pagination controls to navigate.
						</span>
					</div>
				{/if}

				<!-- PowerTeacher Pro Toolbar -->
				<div class="bg-purple-600 rounded-lg p-4 mb-6 text-white sticky top-20 z-10 shadow-lg">
					<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
						<div class="flex items-center gap-6">
							<h2 class="text-xl font-bold">{selectedClass.name}</h2>
							<div class="flex items-center gap-4 text-purple-100">
								<span>{classStudents.length} students</span>
								<span>{classAssignments.length} of {filteredAssignments.length} assignments</span>
								{#if selectedCells.size > 0}
									<span class="bg-white/20 px-2 py-1 rounded text-sm">
										{selectedCells.size} cells selected
									</span>
								{/if}
							</div>
							
							{#if totalPages > 1}
								<div class="flex items-center gap-2 ml-auto">
									<button
										onclick={() => {
											assignmentPage = Math.max(0, assignmentPage - 1);
											clearSelection();
										}}
										disabled={assignmentPage === 0}
										class="p-1 rounded hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
										aria-label="Previous page"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
										</svg>
									</button>
									<select
										bind:value={assignmentPage}
										onchange={() => clearSelection()}
										class="bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white focus:bg-white/20 focus:outline-none"
									>
										{#each Array(totalPages) as _, i (i)}
											<option value={i} class="bg-gray-800">
												Page {i + 1}
											</option>
										{/each}
									</select>
									<span class="text-xs opacity-75">
										(Showing {assignmentPage * assignmentsPerPage + 1}-{Math.min((assignmentPage + 1) * assignmentsPerPage, filteredAssignments.length)})
									</span>
									<button
										onclick={() => {
											assignmentPage = Math.min(totalPages - 1, assignmentPage + 1);
											clearSelection();
										}}
										disabled={assignmentPage === totalPages - 1}
										class="p-1 rounded hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
										aria-label="Next page"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
										</svg>
									</button>
								</div>
							{/if}
						</div>
						
						<div class="flex flex-wrap gap-2">
							{#if selectedAssignments.size > 0}
								<div class="bg-white/20 px-3 py-2 rounded text-sm font-medium flex items-center gap-2">
									<span>{selectedAssignments.size} assignment{selectedAssignments.size !== 1 ? 's' : ''} selected</span>
									<button
										onclick={() => showAssignmentActions = !showAssignmentActions}
										class="bg-white/20 hover:bg-white/30 px-2 py-1 rounded text-xs transition-colors"
									>
										Actions
									</button>
									<button
										onclick={clearAssignmentSelection}
										class="bg-red-500/80 hover:bg-red-500 px-2 py-1 rounded text-xs transition-colors"
									>
										Clear
									</button>
								</div>
							{/if}
							
							<!-- Assignment Filter Dropdown -->
							<div class="relative">
								<button
									onclick={() => showAssignmentDropdown = !showAssignmentDropdown}
									class="bg-white/20 hover:bg-white/30 px-3 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2 {showAssignmentDropdown ? 'bg-white/40' : ''}"
									aria-label="Filter assignments by category or search"
									aria-expanded={showAssignmentDropdown}
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
									</svg>
									Assignments
									{#if selectedCategory || assignmentSearch}
										<span class="bg-yellow-500 text-yellow-900 text-xs px-1.5 py-0.5 rounded-full">!</span>
									{/if}
								</button>
								
								{#if showAssignmentDropdown}
									<div class="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-30">
										<div class="p-4">
											<!-- Search Input -->
											<div class="mb-4">
												<label for="assignment-search" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search Assignments</label>
												<input
													id="assignment-search"
													type="text"
													bind:value={assignmentSearch}
													oninput={() => assignmentPage = 0}
													placeholder="Search by name..."
													class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500"
												/>
											</div>
											
											<!-- Category Chips -->
											<div class="mb-4">
												<fieldset>
													<legend class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Categories</legend>
													<div class="flex flex-wrap gap-2">
													<button
														onclick={() => {
															selectedCategory = null;
															assignmentPage = 0;
														}}
														class="px-3 py-1 rounded-full text-sm transition-colors {selectedCategory === null ? 'bg-purple-500 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'}"
													>
														All ({allClassAssignments.length})
													</button>
													{#each assignmentCategories as category (category)}
														{@const count = allClassAssignments.filter(a => {
															const firstWord = a.name.split(' ')[0];
															const assignmentCategory = firstWord && firstWord.length > 0 ? firstWord : 'Other';
															return assignmentCategory === category;
														}).length}
														<button
															onclick={() => {
																selectedCategory = selectedCategory === category ? null : category;
																assignmentPage = 0;
															}}
															class="px-3 py-1 rounded-full text-sm transition-colors {selectedCategory === category ? 'bg-purple-500 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'}"
														>
															{category} ({count})
														</button>
													{/each}
														</div>
													</fieldset>
												</div>
											
											<!-- Clear Filters -->
											{#if selectedCategory || assignmentSearch}
												<button
													onclick={() => {
														selectedCategory = null;
														assignmentSearch = '';
														assignmentPage = 0;
													}}
													class="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
												>
													Clear All Filters
												</button>
											{/if}
										</div>
									</div>
								{/if}
							</div>
							
							<button
								onclick={() => activeModal = 'newAssignment'}
								class="bg-yellow-500/80 hover:bg-yellow-500 px-3 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2"
								title="Create assignments with templates or bulk creation"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
								</svg>
								Assignment
								<span class="text-xs bg-white/20 px-1.5 py-0.5 rounded">NEW</span>
							</button>
							
							<button
								onclick={() => showBulkActions = !showBulkActions}
								class="bg-white/20 hover:bg-white/30 px-3 py-2 rounded text-sm font-medium transition-colors"
								class:bg-opacity-60={showBulkActions}
							>
								Bulk Actions
							</button>
							
							<button
								onclick={() => colorMode = !colorMode}
								class="bg-white/20 hover:bg-white/30 px-3 py-2 rounded text-sm font-medium transition-colors"
								class:bg-opacity-60={colorMode}
							>
								Color Mode
							</button>
							
							{#if selectedCells.size > 0}
								<button
									onclick={clearSelection}
									class="bg-red-500/80 hover:bg-red-500 px-3 py-2 rounded text-sm font-medium transition-colors"
								>
									Clear Selection
								</button>
							{/if}
						</div>
					</div>
				</div>

				<!-- Assignment Actions Panel -->
		{#if showAssignmentActions && selectedAssignments.size > 0}
			<div class="card-dark p-4 mb-6 border-l-4 border-orange-500">
				<h3 class="font-semibold text-highlight mb-3">Assignment Actions</h3>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<button
						onclick={bulkEditAssignmentDueDates}
						class="btn btn-secondary w-full"
					>
						Set Due Dates
					</button>
					<button
						onclick={selectAllAssignments}
						class="btn btn-outline w-full"
					>
						Select All ({allClassAssignments.length})
					</button>
					<button
						onclick={bulkDeleteAssignments}
						class="btn btn-error w-full"
					>
						Delete Selected
					</button>
				</div>
			</div>
		{/if}

		<!-- Bulk Actions Panel -->
				{#if showBulkActions}
					<div class="card-dark p-4 mb-6 border-l-4 border-blue-500">
						<h3 class="font-semibold text-highlight mb-3">Bulk Actions</h3>
						<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
							<div>
								<label for="bulk-grade-value" class="block text-sm font-medium text-text-base mb-1">Grade Value</label>
								<input
									id="bulk-grade-value"
									bind:value={bulkGradeValue}
									type="text"
									placeholder="Enter grade"
									class="input w-full"
								/>
							</div>
							<div>
								<label for="bulk-grade-type" class="block text-sm font-medium text-text-base mb-1">Grade Type</label>
								<select id="bulk-grade-type" bind:value={bulkGradeType} class="input w-full">
									<option value="points">Points</option>
									<option value="percentage">Percentage</option>
									<option value="letter">Letter Grade</option>
								</select>
							</div>
							<div class="flex items-end">
								<button
									onclick={applyBulkGrade}
									disabled={!bulkGradeValue || selectedCells.size === 0 || bulkActionLoading}
									class="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed {bulkActionLoading ? 'loading' : ''}"
									aria-label="Apply grade value to all selected cells"
								>
{bulkActionLoading ? 'Applying...' : 'Apply to Selected'}
								</button>
							</div>
							<div class="flex items-end">
								<button
									onclick={deleteBulkGrades}
									disabled={selectedCells.size === 0 || bulkActionLoading}
									class="btn btn-error w-full disabled:opacity-50 disabled:cursor-not-allowed {bulkActionLoading ? 'loading' : ''}"
									aria-label="Delete grades from all selected cells"
								>
{bulkActionLoading ? 'Deleting...' : 'Delete Selected Grades'}
								</button>
							</div>
							<div class="flex items-end">
								<button
									onclick={() => showColorPanel = !showColorPanel}
									class="btn btn-outline w-full"
								>
									Color Options
								</button>
							</div>
						</div>

						{#if showColorPanel}
							<div class="mt-4 p-4 bg-bg-base rounded border">
								<h4 class="font-medium text-text-base mb-3">Color Scheme</h4>
								<div class="flex gap-4 mb-4">
									<label class="flex items-center gap-2">
										<input type="radio" bind:group={colorScheme} value="performance" />
										<span class="text-text-base">Performance Based</span>
									</label>
									<label class="flex items-center gap-2">
										<input type="radio" bind:group={colorScheme} value="custom" />
										<span class="text-text-base">Custom Colors</span>
									</label>
								</div>
								
								{#if colorScheme === 'performance'}
									<div class="grid grid-cols-5 gap-2 text-sm">
										<div class="bg-green-100 border-green-300 text-green-800 p-2 rounded text-center">90-100%</div>
										<div class="bg-blue-100 border-blue-300 text-blue-800 p-2 rounded text-center">80-89%</div>
										<div class="bg-yellow-100 border-yellow-300 text-yellow-800 p-2 rounded text-center">70-79%</div>
										<div class="bg-orange-100 border-orange-300 text-orange-800 p-2 rounded text-center">60-69%</div>
										<div class="bg-red-100 border-red-300 text-red-800 p-2 rounded text-center">Below 60%</div>
									</div>
								{/if}
							</div>
						{/if}
						
						<!-- Flag Actions -->
						{#if selectedCells.size > 0}
							<div class="mt-4 p-4 bg-bg-base rounded border border-blue-500">
								<h4 class="font-medium text-text-base mb-3">Assignment Flags</h4>
								<div class="grid grid-cols-3 gap-2">
									{#each Object.entries(FLAGS) as [flag, config] (flag)}
										<div class="flex gap-1">
											<button
												onclick={() => applyBulkFlag(flag)}
												class="flex-1 px-2 py-1 rounded text-xs font-bold {config.color} hover:opacity-80 transition-opacity"
												title="Add {config.label} flag to selected cells (Shortcut: {config.shortcut})"
											>
												{config.icon} +
											</button>
											<button
												onclick={() => removeBulkFlag(flag)}
												class="px-2 py-1 rounded text-xs border border-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
												title="Remove {config.label} flag from selected cells"
											>
												-
											</button>
										</div>
									{/each}
								</div>
								<div class="mt-2 text-xs text-muted">
									💡 Tip: Use keyboard shortcuts (M, L, E) when a cell is focused
								</div>
							</div>
						{/if}
					</div>
				{/if}

				<!-- Column Summary Bar -->
				{#if showColumnSummary && classAssignments.length > 0 && classStudents.length > 0}
					<div class="bg-card-dark border border-border rounded-lg p-4 mb-4">
						<div class="flex items-center justify-between mb-3">
							<h3 class="font-semibold text-highlight">Assignment Summary</h3>
							<button
								onclick={() => showColumnSummary = !showColumnSummary}
								class="text-sm text-purple-400 hover:text-purple-300"
							>
								Hide Summary
							</button>
						</div>
						
						<div class="overflow-x-auto">
							<table class="w-full table-fixed">
								<tbody>
									<tr>
										<!-- Empty cell to align with student column -->
										<td class="w-[200px] min-w-[200px] p-2"></td>
										
										<!-- Assignment Summary Columns -->
										{#each classAssignments as assignment, index (assignment.id)}
											{@const summary = columnSummaries[index]}
											{#if summary}
											<td class="w-[110px] min-w-[110px] p-1 text-center">
												<div class="bg-surface border border-border rounded-lg p-2">
													<div class="space-y-1">
														<div class="text-xs font-medium text-muted">
															{summary.submitted}/{classStudents.length} submitted{summary.submitted > 0 ? ` (${summary.percentage}%)` : ''}
														</div>
														<div class="grid grid-cols-2 gap-1 text-xs">
															<div class="bg-card text-text-base px-1 py-0.5 rounded font-medium" title="Average Score">
																{summary.submitted > 0 ? `${summary.average}%` : '—'}
															</div>
															<div class="bg-card text-text-base px-1 py-0.5 rounded font-medium" title="Median Score">
																{summary.submitted > 0 ? `${summary.median}%` : '—'}
															</div>
															<div class="bg-card text-text-base px-1 py-0.5 rounded font-medium" title="Highest Score">
																{summary.submitted > 0 ? `${summary.high}%` : '—'}
															</div>
															<div class="bg-card text-text-base px-1 py-0.5 rounded font-medium" title="Lowest Score">
																{summary.submitted > 0 ? `${summary.low}%` : '—'}
															</div>
														</div>
														{#if summary.missing > 0}
															<div class="text-xs bg-red-900/30 text-red-400 px-1 py-0.5 rounded font-medium">
																{summary.missing} missing
															</div>
														{:else}
															<div class="text-xs bg-green-900/30 text-green-400 px-1 py-0.5 rounded font-medium">
																Complete ✓
															</div>
														{/if}
													</div>
												</div>
											</td>
											{/if}
										{/each}
										
										<!-- Page Average Column -->
										<td class="w-[110px] min-w-[110px] p-1 text-center">
											<div class="bg-purple-900/30 border border-purple-500/30 rounded-lg p-2">
												{#snippet pageStats()}
													{@const totalSubmitted = columnSummaries.reduce((sum, s) => sum + s.submitted, 0)}
													{@const totalPossible = columnSummaries.length * classStudents.length}
													{@const pageAverage = columnSummaries.length > 0 
														? Math.round(columnSummaries.reduce((sum, s) => sum + s.average, 0) / columnSummaries.length)
														: 0}
													<div class="space-y-1">
														<div class="text-xs font-medium text-purple-300">
															{totalSubmitted}/{totalPossible} {totalPossible > 0 ? `(${Math.round((totalSubmitted/totalPossible) * 100)}%)` : ''}
														</div>
														<div class="text-lg font-bold text-purple-400">
															{pageAverage ? `${pageAverage}%` : '—'}
														</div>
														<div class="text-xs text-purple-300">
															Page Avg
														</div>
													</div>
												{/snippet}
												{@render pageStats()}
											</div>
										</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>
				{:else if !showColumnSummary && classAssignments.length > 0 && classStudents.length > 0}
					<div class="mb-4">
						<button
							onclick={() => showColumnSummary = true}
							class="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 underline"
						>
							Show Assignment Summary
						</button>
					</div>
				{/if}

				<!-- PowerTeacher Pro Gradebook Grid -->
				<div class="card-dark overflow-hidden">
					{#if classStudents.length === 0}
						<div class="text-center py-12">
							<p class="text-muted">No students in this class yet. Add students to get started.</p>
						</div>
					{:else}
						{#if classAssignments.length === 0}
							<div class="mb-4 p-4 bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 rounded-lg">
								<div class="flex items-center gap-3">
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
									</svg>
									<div>
										<p class="font-medium">No assignments created yet</p>
										<p class="text-sm text-yellow-300">Students are listed below. Create assignments to start grading.</p>
									</div>
									<button
										onclick={() => activeModal = 'newAssignment'}
										class="btn btn-primary ml-auto"
									>
										Create Assignments
									</button>
								</div>
							</div>
						{/if}
						<div class="overflow-x-auto">
							<table 
								class="w-full table-fixed"
								role="grid"
								aria-label="Student grades for {selectedClass?.name || 'selected class'}"
							>
								<thead class="bg-card-dark">
									<tr class="border-b-2 border-purple-500">
										<th class="bg-card-dark p-2 text-left border-r border-border w-[200px] min-w-[200px] sticky left-0 z-20">
											<div class="font-medium text-highlight">Student</div>
											<div class="text-xs text-muted mt-1">{classStudents.length} total</div>
										</th>
										{#each classAssignments as assignment, index (assignment.id)}
											<th class="p-2 text-center w-[110px] min-w-[110px] max-w-[110px] border-r border-border {selectedAssignments.has(assignment.id) ? 'bg-purple-500/20' : ''}">
												<div class="space-y-2">
													<div class="flex justify-center mb-1">
														<input
															type="checkbox"
															checked={selectedAssignments.has(assignment.id)}
															onchange={() => toggleAssignmentSelection(assignment.id)}
															class="w-3 h-3 text-purple-600 rounded"
															title="Select assignment for bulk actions"
														/>
													</div>
													<div class="font-medium text-sm text-text-base break-words leading-tight text-center" title="{assignment.name}">{assignment.name}</div>
													<div class="text-[11px] text-muted mt-0.5">Max: {assignment.maxPoints}</div>
													{#if assignment.dueDate}
														<div class="text-[10px] text-orange-400 mt-0.5">Due: {new Date(assignment.dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })}</div>
													{/if}
													<div class="flex flex-wrap gap-0.5 justify-center mt-1">
														<button
															onclick={() => selectColumn(assignment.id)}
															class="text-[11px] text-blue-400 hover:text-blue-300 underline px-1"
														>
															Select
														</button>
														<button
															onclick={() => startEditAssignment(assignment)}
															class="text-[11px] text-yellow-400 hover:text-yellow-300 underline px-1"
															title="Edit assignment"
														>
															Edit
														</button>
														<button
															onclick={() => deleteAssignmentConfirm(assignment.id, assignment.name)}
															class="text-[11px] text-red-400 hover:text-red-300 underline px-1"
															title="Delete assignment"
														>
															Delete
														</button>
													</div>
												</div>
											</th>
										{/each}
									{#if classAssignments.length > 0}
										<th class="p-2 text-center w-[110px] min-w-[110px] max-w-[110px] bg-purple-900/50">
											<div class="font-medium text-purple-400">Average</div>
											<div class="text-xs text-purple-300">This Page</div>
										</th>
									{:else}
										<th class="p-2 text-center bg-yellow-900/30">
											<div class="font-medium text-yellow-400">Actions</div>
											<div class="text-xs text-yellow-300">Create assignments to start grading</div>
										</th>
									{/if}
									</tr>
								</thead>
								<tbody>
								{#each classStudents as student (student.id)}
									<tr class="border-b border-border hover:bg-surface-hover transition-colors">
										<td class="p-2 sticky left-0 bg-surface z-10 w-[200px] min-w-[200px] border-r border-border">
											<button 
												class="hover:text-purple transition-colors" 
												onclick={() => selectRow(student.id)}
												aria-label="Select all grade cells for {student.name}"
											>
												{student.name}
											</button>
										</td>
										{#each classAssignments as assignment (assignment.id)}
											{@const grade = $gradebookStore.grades.find(g => g.studentId === student.id && g.assignmentId === assignment.id)}
											{@const cellId = getCellId(student.id, assignment.id)}
											<td 
												class="p-0 w-[110px] min-w-[110px] max-w-[110px] relative {isSelected(student.id, assignment.id) ? 'bg-purple-500/20' : ''} {getGradeColor(grade?.points ?? 0, assignment.maxPoints)}"
												onclick={() => toggleCellSelection(student.id, assignment.id)} 
											>
												<input
															type="number"
															value={grade?.points || ''}
															placeholder="—"
															min="0"
															max={assignment.maxPoints}
															step="0.1"
															class="w-full h-full px-1 py-2 text-center text-sm bg-transparent border-0 rounded-none text-text-base transition-all focus:ring-1 focus:ring-purple-500 focus:bg-purple-50 dark:focus:bg-purple-900/20 {isSelected(student.id, assignment.id) ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500' : ''} {colorMode && grade ? getGradeColor(grade.points, assignment.maxPoints) : 'hover:bg-muted/10'}"
															onchange={(e) => handleGradeChange(student.id, assignment.id, assignment.maxPoints, (e.target as HTMLInputElement)?.value)}
															onkeydown={(e) => handleGradeKeydown(e, student.id, assignment.id)}
															onclick={() => toggleCellSelection(student.id, assignment.id)}
														/>
														{#if grade && grade.points > 0}
															<div class="absolute top-0 right-0 text-xs text-muted bg-card/90 px-1 rounded-bl text-[10px] leading-tight pointer-events-none">
																{Math.round((grade.points / assignment.maxPoints) * 100)}%
															</div>
														{/if}
														
														<!-- Assignment Flags -->
														{#if getVisibleFlags(student.id, assignment.id).length > 0}
															{@const cellFlags = getVisibleFlags(student.id, assignment.id)}
															<div class="absolute top-0 left-0 flex gap-0.5 p-0.5 pointer-events-none">
																{#each cellFlags as flag (flag)}
																	{@const config = FLAGS[flag]}
																	<div class="w-4 h-4 rounded-sm {config.color} flex items-center justify-center text-[10px] font-bold" title={config.label}>
																		{config.icon}
																	</div>
																{/each}
															</div>
														{/if}
												</td>
											{/each}
											{#if classAssignments.length > 0}
												<td class="p-2 text-center bg-purple-bg/30 w-[110px] min-w-[110px] max-w-[110px]">
													{#snippet averageCalculation()}
														{@const studentGrades = classAssignments.map(assignment => {
															const grade = $gradebookStore.grades.find(g => g.studentId === student.id && g.assignmentId === assignment.id);
															return grade ? grade.points : null;
														}).filter(g => g !== null && g > 0)}
														{@const totalPossible = classAssignments.reduce((sum, assignment) => (sum || 0) + assignment.maxPoints, 0)}
														{@const totalEarned = studentGrades.reduce((sum, g) => (sum ?? 0) + (g ?? 0), 0) as number}
														{@const average = studentGrades.length > 0 ? Math.round((totalEarned / (studentGrades.length * (totalPossible / classAssignments.length))) * 100) : 0}
														<div class="font-bold text-purple-400">
															{average ? `${average}%` : '—'}
														</div>
														<div class="text-xs text-purple-300">
															{studentGrades.length}/{classAssignments.length}
														</div>
													{/snippet}
													{@render averageCalculation()}
												</td>
											{:else}
												<td class="p-2 text-center bg-yellow-900/30 w-[110px] min-w-[110px] max-w-[110px]">
													<div class="text-sm text-yellow-400">Ready</div>
													<div class="text-xs text-yellow-300">for assignments</div>
												</td>
											{/if}
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</div>

				<!-- Grade Distribution Summary -->
				{#if classStudents.length > 0 && classAssignments.length > 0}
					<div class="flex justify-end mt-6">
						<div class="card-dark p-4 w-full md:w-auto">
							<h3 class="font-semibold text-highlight mb-2">Selection Tools</h3>
							<div class="space-y-2">
								<button 
									class="btn btn-outline w-full text-sm"
									onclick={() => {
										// Only select cells visible on current page
										classStudents.forEach(student => {
											classAssignments.forEach(assignment => {
												selectedCells.add(getCellId(student.id, assignment.id));
											});
										});
										selectedCells = new Set(selectedCells);
									}}
								>
									Select Page Cells
								</button>
								<button class="btn btn-outline w-full text-sm" onclick={clearSelection}>
									Clear Selection
								</button>
							</div>
						</div>
					</div>
				{/if}

				{:else if !$gradebookStore.selectedClassId}
					<!-- Empty State -->
					<div class="card-dark p-8 text-center">
						<div class="flex flex-col items-center justify-center py-12">
						<svg
							class="w-16 h-16 text-muted mb-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
						</svg>
						<h3 class="text-lg font-medium text-highlight mb-2">Welcome to PowerTeacher Pro</h3>
						<p class="text-text-base text-center max-w-md mb-6">
							Select a class to access the advanced gradebook with bulk actions, color coding, and professional grading tools.
						</p>
						<button
							onclick={() => activeModal = 'newClass'}
							class="btn btn-primary"
						>
							Create Your First Class
						</button>
					</div>
				</div>
				{/if}
			</div>
		</div>
	{/if}

<!-- Modals -->
{#if activeModal === 'newClass'}
	<div class="fixed inset-0 bg-bg-base/80 backdrop-blur-sm flex items-center justify-center z-50">
		<div class="bg-card border border-border rounded-lg p-6 w-full max-w-md">
			<h3 class="text-xl font-bold text-highlight mb-4">Create New Class</h3>
			<input
				bind:value={newClassName}
				placeholder="Class name"
				class="input w-full mb-4"
			/>
			<div class="flex justify-end gap-2">
				<button
					onclick={() => activeModal = null}
					class="btn btn-outline"
				>
					Cancel
				</button>
				<button
					onclick={createNewClass}
					class="btn btn-primary"
				>
					Create
				</button>
			</div>
		</div>
	</div>
{/if}

{#if activeModal === 'student'}
	<div class="fixed inset-0 bg-bg-base/80 backdrop-blur-sm flex items-center justify-center z-50">
		<div class="bg-card border border-border rounded-lg p-6 w-full max-w-md">
			<h3 class="text-xl font-bold text-highlight mb-4">Add Student</h3>
			<input
				bind:value={newStudentName}
				placeholder="Student name"
				class="input w-full mb-4"
			/>
			<div class="flex justify-end gap-2">
				<button
					onclick={() => activeModal = null}
					class="btn btn-outline"
				>
					Cancel
				</button>
				<button
					onclick={addStudent}
					class="btn btn-primary"
				>
					Add
				</button>
			</div>
		</div>
	</div>
{/if}

{#if activeModal === 'newAssignment'}
	<AssignmentCreationModal
		onclose={() => activeModal = null}
		oncomplete={handleAssignmentCreationComplete}
	/>
{/if}

{#if activeModal === 'editAssignment'}
	<div class="fixed inset-0 bg-bg-base/80 backdrop-blur-sm flex items-center justify-center z-50">
		<div class="bg-card border border-border rounded-lg p-6 w-full max-w-md">
			<h3 class="text-xl font-bold text-highlight mb-4">Edit Assignment</h3>
			<input
				bind:value={editAssignmentName}
				placeholder="Assignment name"
				class="input w-full mb-4"
			/>
			<div class="grid grid-cols-2 gap-4 mb-4">
				<div>
					<label for="edit-max-points" class="block text-sm font-medium text-text-base mb-2">
						Max Points
					</label>
					<input
						id="edit-max-points"
						bind:value={editMaxPoints}
						type="number"
						min="1"
						placeholder="Max points"
						class="input w-full"
					/>
				</div>
				<div>
					<label for="edit-due-date" class="block text-sm font-medium text-text-base mb-2">
						Due Date
					</label>
					<input
						id="edit-due-date"
						bind:value={editDueDate}
						type="date"
						class="input w-full"
					/>
				</div>
			</div>
			<div class="flex justify-end gap-2">
				<button
					onclick={cancelEditAssignment}
					class="btn btn-outline"
				>
					Cancel
				</button>
				<button
					onclick={saveEditAssignment}
					class="btn btn-primary"
				>
					Save Changes
				</button>
			</div>
		</div>
	</div>
{/if}

{#if activeModal === 'import'}
	<ImportWizard
		onClose={() => activeModal = null}
		onComplete={() => {
			// Handle import completion
			activeModal = null;
		}}
	/>
{/if}