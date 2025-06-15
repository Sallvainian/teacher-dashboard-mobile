<script lang="ts">
	import type { Class } from '$lib/types/gradebook';
	
	interface Props {
		selectedClass: Class | null | undefined;
		classStudents: any[];
		allClassAssignments: any[];
		totalGrades: number;
	}
	
	let { selectedClass, classStudents, allClassAssignments, totalGrades }: Props = $props();
</script>

<div class="mb-8">
	<h1 class="text-3xl font-bold text-highlight mb-2">Gradebook</h1>
	<p class="text-text-base">Manage grades and assignments for your classes</p>
	
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
				{totalGrades} grades entered
			</span>
		</div>
	{/if}
</div>