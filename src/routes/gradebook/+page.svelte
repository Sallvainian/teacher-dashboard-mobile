<script lang="ts">
	// Refactored Gradebook Page using new component architecture
	import { gradebookStore } from '$lib/stores/gradebook';
	import { authStore } from '$lib/stores/auth/index';
	import LoadingBounce from '$lib/components/LoadingBounce.svelte';
	import ImportWizard from '$lib/components/ImportWizard.svelte';
	import AssignmentCreationModal from '$lib/components/AssignmentCreationModal.svelte';
	import { goto } from '$app/navigation';
	import { fade } from 'svelte/transition';
	
	// New component imports
	import GradebookHeader from './components/header/GradebookHeader.svelte';
	import ClassSelector from './components/header/ClassSelector.svelte';
	import QuickActions from './components/header/QuickActions.svelte';
	import StudentTable from './components/students/StudentTable.svelte';
	import EditClassModal from './components/modals/EditClassModal.svelte';
	import NewClassModal from './components/modals/NewClassModal.svelte';
	import AddStudentModal from './components/modals/AddStudentModal.svelte';
	import EditAssignmentModal from './components/modals/EditAssignmentModal.svelte';
	
	// Import utilities
	import { 
		calculateColumnSummary, 
		calculateStudentAverage, 
		getGradeColor,
		sortStudentsByLastName,
		sortAssignmentsByDueDate,
		generateAssignmentCategories,
		filterAssignments,
		type ColumnSummary
	} from './components/utils/gradeCalculations';
	
	import type { Assignment } from '$lib/types/gradebook';
	import { isHTMLInputElement, getEventTargetValue } from '$lib/utils/domHelpers';
	import type { UnknownError, StudentId, AssignmentId, ClassId } from '$lib/types/ai-enforcement';

	// Core state variables
	let newStudentName = $state('');
	let newClassName = $state('');
	let newClassGradeLevel = $state('');
	let newClassSubject = $state('');
	let newClassSchoolYear = $state('');
	let newClassJoinCode = $state('');
	
	// Edit class state variables
	let editClassName = $state('');
	let editClassGradeLevel = $state('');
	let editClassSubject = $state('');
	let editClassSchoolYear = $state('');
	let editClassJoinCode = $state('');
	let editingClassId = $state<string | null>(null);
	
	// Modal system
	type ModalType = 'newClass' | 'newAssignment' | 'student' | 'import' | 'editAssignment' | 'editClass' | null;
	let activeModal = $state<ModalType>(null);
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
	
	type FlagKey = keyof typeof FLAGS;
	let gradeFlags = $state<Map<string, Set<string>>>(new Map());
	
	// Assignment navigation and filtering
	let showAssignmentDropdown = $state(false);
	let selectedCategory = $state<string | null>(null);
	let assignmentSearch = $state('');
	let assignmentPage = $state(0);
	let assignmentsPerPage = 7;
	
	// UI state
	let showColumnSummary = $state(true);
	
	// Check permissions
	let hasPermission = $derived($authStore.user && $authStore.profile?.role === 'teacher');
	
	// Reactive values from store
	let selectedClass = $derived($gradebookStore.classes.find(c => c.id === $gradebookStore.selectedClassId));
	
	let classStudents = $derived.by(() => {
		if (!$gradebookStore.selectedClassId) return [];
		const cls = $gradebookStore.classes.find(c => c.id === $gradebookStore.selectedClassId);
		if (!cls) return [];
		const students = $gradebookStore.students.filter(student => cls.studentIds.includes(student.id));
		return sortStudentsByLastName(students);
	});
	
	let allClassAssignments = $derived.by(() => {
		const assignments = $gradebookStore.getAssignmentsForSelectedClass;
		return sortAssignmentsByDueDate(assignments);
	});
	
	let assignmentCategories = $derived(generateAssignmentCategories(allClassAssignments));
	
	let filteredAssignments = $derived(filterAssignments(allClassAssignments, selectedCategory, assignmentSearch));
	
	let totalPages = $derived(Math.ceil(filteredAssignments.length / assignmentsPerPage));
	
	// Reset page if it's out of bounds after filtering
	$effect(() => {
		if (assignmentPage >= totalPages && totalPages > 0) {
			assignmentPage = 0;
		}
	});
	
	let classAssignments = $derived.by(() => {
		const start = assignmentPage * assignmentsPerPage;
		const end = start + assignmentsPerPage;
		return filteredAssignments.slice(start, end);
	});
	
	let columnSummaries = $derived(
		classAssignments.map(assignment => 
			calculateColumnSummary(assignment, $gradebookStore.grades, classStudents.length)
		)
	);
	
	let selectedClassIdForBinding = $derived($gradebookStore.selectedClassId || '');
	let totalGrades = $derived($gradebookStore.grades.filter(g => 
		Array.isArray(allClassAssignments) && allClassAssignments.some(a => a.id === g.assignmentId)
	).length);
	
	// Event handlers
	async function handleClassChange(classId: string) {
		if (classId) {
			await gradebookStore.selectClass(classId);
		}
	}
	
	async function createNewClass(event?: Event) {
		event?.preventDefault();
		if (newClassName.trim()) {
			const result = await gradebookStore.addClass(
				newClassName.trim(), 
				$authStore.user?.id,
				{
					grade_level: newClassGradeLevel.trim() || null,
					subject: newClassSubject.trim() || null,
					school_year: newClassSchoolYear.trim() || null,
					join_code: newClassJoinCode.trim() || null
				}
			);
			
			if (result.success) {
				newClassName = '';
				newClassGradeLevel = '';
				newClassSubject = '';
				newClassSchoolYear = '';
				newClassJoinCode = '';
				activeModal = null;
			} else {
				console.error('Failed to create class:', result.error);
			}
		}
	}
	
	async function openEditClassModal() {
		if (!selectedClass) return;
		
		editingClassId = selectedClass.id;
		editClassName = selectedClass.name;
		editClassGradeLevel = '';
		editClassSubject = '';
		editClassSchoolYear = '';
		editClassJoinCode = '';
		
		activeModal = 'editClass';
	}
	
	async function saveEditClass(event?: Event) {
		event?.preventDefault();
		if (!editingClassId || !editClassName.trim()) return;
		
		const result = await gradebookStore.updateClass(editingClassId as ClassId, {
			name: editClassName.trim(),
			grade_level: editClassGradeLevel.trim() || null,
			subject: editClassSubject.trim() || null,
			school_year: editClassSchoolYear.trim() || null,
			join_code: editClassJoinCode.trim() || null
		});
		
		if (result.success) {
			cancelEditClass();
		} else {
			console.error('Failed to update class:', result.error);
		}
	}
	
	function cancelEditClass() {
		editingClassId = null;
		editClassName = '';
		editClassGradeLevel = '';
		editClassSubject = '';
		editClassSchoolYear = '';
		editClassJoinCode = '';
		activeModal = null;
	}
	
	async function addStudent(event?: Event) {
		event?.preventDefault();
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
	
	// Student table event handlers
	function getCellId(studentId: string, assignmentId: string): string {
		return `${studentId}-${assignmentId}`;
	}
	
	function isSelected(studentId: string, assignmentId: string): boolean {
		return selectedCells.has(getCellId(studentId, assignmentId));
	}
	
	function toggleCellSelection(studentId: string, assignmentId: string) {
		const cellId = getCellId(studentId, assignmentId);
		if (selectedCells.has(cellId)) {
			selectedCells.delete(cellId);
		} else {
			selectedCells.add(cellId);
		}
		selectedCells = new Set(selectedCells);
	}
	
	function toggleAssignmentSelection(assignmentId: string) {
		if (selectedAssignments.has(assignmentId)) {
			selectedAssignments.delete(assignmentId);
		} else {
			selectedAssignments.add(assignmentId);
		}
		selectedAssignments = new Set(selectedAssignments);
	}
	
	function selectColumn(assignmentId: string) {
		classStudents.forEach(student => {
			selectedCells.add(getCellId(student.id, assignmentId));
		});
		selectedCells = new Set(selectedCells);
	}
	
	function selectRow(studentId: string) {
		classAssignments.forEach(assignment => {
			selectedCells.add(getCellId(studentId, assignment.id));
		});
		selectedCells = new Set(selectedCells);
	}
	
	async function handleGradeChange(studentId: string, assignmentId: string, maxPoints: number, value: string) {
		const points = parseFloat(value) || 0;
		if (points < 0 || points > maxPoints) return;
		
		const result = await gradebookStore.recordGrade(studentId as StudentId, assignmentId as AssignmentId, points);
		if (!result.success) {
			console.error('Failed to record grade:', result.error);
		}
	}
	
	function handleGradeKeydown(event: KeyboardEvent, studentId: string, assignmentId: string) {
		// Handle keyboard navigation and shortcuts
		const key = event.key.toLowerCase();
		
		// Flag shortcuts
		if (FLAGS[key as FlagKey]) {
			event.preventDefault();
			toggleFlag(studentId, assignmentId, key as FlagKey);
		}
	}
	
	function toggleFlag(studentId: string, assignmentId: string, flag: FlagKey) {
		const cellId = getCellId(studentId, assignmentId);
		const cellFlags = gradeFlags.get(cellId) || new Set();
		
		if (cellFlags.has(flag)) {
			cellFlags.delete(flag);
		} else {
			cellFlags.add(flag);
		}
		
		gradeFlags.set(cellId, cellFlags);
		gradeFlags = new Map(gradeFlags);
	}
	
	function getVisibleFlags(studentId: string, assignmentId: string): string[] {
		const cellId = getCellId(studentId, assignmentId);
		const cellFlags = gradeFlags.get(cellId) || new Set();
		return Array.from(cellFlags);
	}
	
	function startEditAssignment(assignment: Assignment) {
		editingAssignmentId = assignment.id;
		editAssignmentName = assignment.name;
		editMaxPoints = assignment.maxPoints;
		editDueDate = assignment.dueDate || '';
		activeModal = 'editAssignment';
	}

	async function saveEditAssignment(event?: Event) {
		event?.preventDefault();
		if (!editingAssignmentId || !editAssignmentName.trim()) return;
		
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

	function cancelEditAssignment() {
		editingAssignmentId = null;
		editAssignmentName = '';
		editMaxPoints = 100;
		editDueDate = '';
		activeModal = null;
	}
	
	async function deleteAssignmentConfirm(assignmentId: string, assignmentName: string) {
		if (confirm(`Are you sure you want to delete "${assignmentName}"? This will remove all grades for this assignment.`)) {
			try {
				await gradebookStore.deleteAssignment(assignmentId);
			} catch (error: UnknownError) {
				console.error('Failed to delete assignment:', error);
			}
		}
	}
	
	function exportGrades() {
		// TODO: Implement export functionality
		console.log('Export grades functionality to be implemented');
	}
	
	// Data loading is handled by AppLayout.svelte globally
	// No need to call ensureDataLoaded() here to avoid double-loading
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
			<!-- Header Component -->
			<GradebookHeader 
				{selectedClass}
				{classStudents}
				allClassAssignments={allClassAssignments}
				{totalGrades}
			/>

			<!-- Controls -->
			<div class="flex flex-col lg:flex-row gap-4 mb-6">
				<!-- Class Selector Component -->
				<ClassSelector 
					selectedClassId={$gradebookStore.selectedClassId}
					onClassChange={handleClassChange}
					classes={$gradebookStore.classes}
					students={$gradebookStore.students}
					assignments={$gradebookStore.assignments}
				/>
				
				<!-- Quick Actions Component -->
				<QuickActions 
					{selectedClass}
					onNewClass={() => activeModal = 'newClass'}
					onEditClass={openEditClassModal}
					onNewStudent={() => activeModal = 'student'}
					onNewAssignment={() => activeModal = 'newAssignment'}
					onImport={() => activeModal = 'import'}
					onExport={exportGrades}
					onToggleColumnSummary={() => showColumnSummary = !showColumnSummary}
					{showColumnSummary}
				/>
			</div>

			{#if selectedClass}
				<!-- Student Table Component -->
				<StudentTable 
					students={classStudents}
					assignments={classAssignments}
					{selectedClass}
					{selectedCells}
					{selectedAssignments}
					{colorMode}
					onGradeChange={handleGradeChange}
					onGradeKeydown={handleGradeKeydown}
					onToggleCellSelection={toggleCellSelection}
					onToggleAssignmentSelection={toggleAssignmentSelection}
					onSelectColumn={selectColumn}
					onSelectRow={selectRow}
					onStartEditAssignment={startEditAssignment}
					onDeleteAssignment={deleteAssignmentConfirm}
					{getCellId}
					{isSelected}
					{getGradeColor}
					{getVisibleFlags}
					{FLAGS}
				/>
			{:else}
				<div class="text-center py-12">
					<p class="text-muted mb-4">Please select a class to view the gradebook.</p>
					<button onclick={() => activeModal = 'newClass'} class="btn btn-primary">
						Create Your First Class
					</button>
				</div>
			{/if}
		</div>
	</div>

	<!-- Modals -->
	
	<!-- Edit Class Modal -->
	<EditClassModal
		isOpen={activeModal === 'editClass'}
		editingClass={selectedClass}
		className={editClassName}
		gradeLevel={editClassGradeLevel}
		subject={editClassSubject}
		schoolYear={editClassSchoolYear}
		joinCode={editClassJoinCode}
		onClose={cancelEditClass}
		onSave={saveEditClass}
		onClassNameChange={(value: string) => editClassName = value}
		onGradeLevelChange={(value: string) => editClassGradeLevel = value}
		onSubjectChange={(value: string) => editClassSubject = value}
		onSchoolYearChange={(value: string) => editClassSchoolYear = value}
		onJoinCodeChange={(value: string) => editClassJoinCode = value}
	/>

	<!-- Import Wizard Modal -->
	{#if activeModal === 'import'}
		<ImportWizard 
			onClose={() => activeModal = null}
			onComplete={() => activeModal = null} 
		/>
	{/if}

	<!-- Assignment Creation Modal -->
	{#if activeModal === 'newAssignment'}
		<AssignmentCreationModal
			onclose={() => activeModal = null}
			oncomplete={(result) => {
				assignmentCreationResult = result;
				activeModal = null;
			}}
		/>
	{/if}

	<!-- New Class Modal -->
	<NewClassModal
		isOpen={activeModal === 'newClass'}
		className={newClassName}
		gradeLevel={newClassGradeLevel}
		subject={newClassSubject}
		schoolYear={newClassSchoolYear}
		joinCode={newClassJoinCode}
		onClose={() => activeModal = null}
		onSave={createNewClass}
		onClassNameChange={(value: string) => newClassName = value}
		onGradeLevelChange={(value: string) => newClassGradeLevel = value}
		onSubjectChange={(value: string) => newClassSubject = value}
		onSchoolYearChange={(value: string) => newClassSchoolYear = value}
		onJoinCodeChange={(value: string) => newClassJoinCode = value}
	/>

	<!-- Add Student Modal -->
	<AddStudentModal
		isOpen={activeModal === 'student'}
		studentName={newStudentName}
		onClose={() => activeModal = null}
		onSave={addStudent}
		onStudentNameChange={(value) => newStudentName = value}
	/>

	<!-- Edit Assignment Modal -->
	<EditAssignmentModal
		isOpen={activeModal === 'editAssignment'}
		assignmentName={editAssignmentName}
		maxPoints={editMaxPoints}
		dueDate={editDueDate}
		onClose={cancelEditAssignment}
		onSave={saveEditAssignment}
		onAssignmentNameChange={(value) => editAssignmentName = value}
		onMaxPointsChange={(value) => editMaxPoints = value}
		onDueDateChange={(value) => editDueDate = value}
	/>
{/if}