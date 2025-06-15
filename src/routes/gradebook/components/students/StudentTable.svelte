<script lang="ts">
	import { gradebookStore } from '$lib/stores/gradebook';
	import type { Student, Assignment, Grade, Class } from '$lib/types/gradebook';
	
	interface Props {
		students: Student[];
		assignments: Assignment[];
		selectedClass: Class | null;
		selectedCells: Set<string>;
		selectedAssignments: Set<string>;
		colorMode: boolean;
		onGradeChange: (studentId: string, assignmentId: string, maxPoints: number, value: string) => void;
		onGradeKeydown: (event: KeyboardEvent, studentId: string, assignmentId: string) => void;
		onToggleCellSelection: (studentId: string, assignmentId: string) => void;
		onToggleAssignmentSelection: (assignmentId: string) => void;
		onSelectColumn: (assignmentId: string) => void;
		onSelectRow: (studentId: string) => void;
		onStartEditAssignment: (assignment: Assignment) => void;
		onDeleteAssignment: (assignmentId: string, assignmentName: string) => void;
		getCellId: (studentId: string, assignmentId: string) => string;
		isSelected: (studentId: string, assignmentId: string) => boolean;
		getGradeColor: (points: number, maxPoints: number) => string;
		getVisibleFlags: (studentId: string, assignmentId: string) => string[];
		FLAGS: Record<string, { icon: string; color: string; label: string; shortcut: string }>;
	}
	
	let { 
		students, 
		assignments, 
		selectedClass,
		selectedCells,
		selectedAssignments,
		colorMode,
		onGradeChange,
		onGradeKeydown,
		onToggleCellSelection,
		onToggleAssignmentSelection,
		onSelectColumn,
		onSelectRow,
		onStartEditAssignment,
		onDeleteAssignment,
		getCellId,
		isSelected,
		getGradeColor,
		getVisibleFlags,
		FLAGS
	}: Props = $props();
</script>

<div class="card-dark overflow-hidden">
	{#if students.length === 0}
		<div class="text-center py-12">
			<p class="text-muted">No students in this class yet. Add students to get started.</p>
		</div>
	{:else}
		{#if assignments.length === 0}
			<div class="mb-4 p-4 bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 rounded-lg">
				<div class="flex items-center gap-3">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
					</svg>
					<div>
						<p class="font-medium">No assignments created yet</p>
						<p class="text-sm text-yellow-300">Students are listed below. Create assignments to start grading.</p>
					</div>
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
							<div class="text-xs text-muted mt-1">{students.length} total</div>
						</th>
						{#each assignments as assignment, index (assignment.id)}
							<th class="p-2 text-center w-[110px] min-w-[110px] max-w-[110px] border-r border-border {selectedAssignments.has(assignment.id) ? 'bg-purple-500/20' : ''}">
								<div class="space-y-2">
									<div class="flex justify-center mb-1">
										<input
											type="checkbox"
											checked={selectedAssignments.has(assignment.id)}
											onchange={() => onToggleAssignmentSelection(assignment.id)}
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
											onclick={() => onSelectColumn(assignment.id)}
											class="text-[11px] text-blue-400 hover:text-blue-300 underline px-1"
										>
											Select
										</button>
										<button
											onclick={() => onStartEditAssignment(assignment)}
											class="text-[11px] text-yellow-400 hover:text-yellow-300 underline px-1"
											title="Edit assignment"
										>
											Edit
										</button>
										<button
											onclick={() => onDeleteAssignment(assignment.id, assignment.name)}
											class="text-[11px] text-red-400 hover:text-red-300 underline px-1"
											title="Delete assignment"
										>
											Delete
										</button>
									</div>
								</div>
							</th>
						{/each}
						{#if assignments.length > 0}
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
					{#each students as student (student.id)}
						<tr class="border-b border-border hover:bg-surface-hover transition-colors">
							<td class="p-2 sticky left-0 bg-surface z-10 w-[200px] min-w-[200px] border-r border-border">
								<button 
									class="hover:text-purple transition-colors" 
									onclick={() => onSelectRow(student.id)}
									aria-label="Select all grade cells for {student.name}"
								>
									{student.name}
								</button>
							</td>
							{#each assignments as assignment (assignment.id)}
								{@const grade = $gradebookStore.grades.find(g => g.studentId === student.id && g.assignmentId === assignment.id)}
								{@const cellId = getCellId(student.id, assignment.id)}
								<td 
									class="p-0 w-[110px] min-w-[110px] max-w-[110px] relative {isSelected(student.id, assignment.id) ? 'bg-purple-500/20' : ''} {getGradeColor(grade?.points ?? 0, assignment.maxPoints)}"
									onclick={() => onToggleCellSelection(student.id, assignment.id)} 
								>
									<input
										type="number"
										value={grade?.points || ''}
										placeholder="—"
										min="0"
										max={assignment.maxPoints}
										step="0.1"
										class="w-full h-full px-1 py-2 text-center text-sm bg-transparent border-0 rounded-none text-text-base transition-all focus:ring-1 focus:ring-purple-500 focus:bg-purple-50 dark:focus:bg-purple-900/20 {isSelected(student.id, assignment.id) ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500' : ''} {colorMode && grade ? getGradeColor(grade.points, assignment.maxPoints) : 'hover:bg-muted/10'}"
										onchange={(e) => onGradeChange(student.id, assignment.id, assignment.maxPoints, (e.target as HTMLInputElement)?.value)}
										onkeydown={(e) => onGradeKeydown(e, student.id, assignment.id)}
										onclick={() => onToggleCellSelection(student.id, assignment.id)}
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
							{#if assignments.length > 0}
								<td class="p-2 text-center bg-purple-bg/30 w-[110px] min-w-[110px] max-w-[110px]">
									{#snippet averageCalculation()}
										{@const studentGrades = assignments.map(assignment => {
											const grade = $gradebookStore.grades.find(g => g.studentId === student.id && g.assignmentId === assignment.id);
											return grade ? grade.points : null;
										}).filter(g => g !== null && g > 0)}
										{@const totalPossible = assignments.reduce((sum, assignment) => (sum || 0) + assignment.maxPoints, 0)}
										{@const totalEarned = studentGrades.reduce((sum, g) => (sum ?? 0) + (g ?? 0), 0) as number}
										{@const average = studentGrades.length > 0 ? Math.round((totalEarned / (studentGrades.length * (totalPossible / assignments.length))) * 100) : 0}
										<div class="font-bold text-purple-400">
											{average ? `${average}%` : '—'}
										</div>
										<div class="text-xs text-purple-300">
											{studentGrades.length}/{assignments.length}
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