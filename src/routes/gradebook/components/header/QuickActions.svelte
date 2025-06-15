<script lang="ts">
	import type { Class } from '$lib/types/gradebook';
	
	interface Props {
		selectedClass: Class | null;
		onNewClass: () => void;
		onEditClass: () => void;
		onNewStudent: () => void;
		onNewAssignment: () => void;
		onImport: () => void;
		onExport: () => void;
		onToggleColumnSummary: () => void;
		showColumnSummary: boolean;
	}
	
	let { 
		selectedClass, 
		onNewClass, 
		onEditClass, 
		onNewStudent, 
		onNewAssignment, 
		onImport,
		onExport,
		onToggleColumnSummary,
		showColumnSummary
	}: Props = $props();
</script>

<!-- Quick Actions -->
<div class="flex flex-wrap gap-2">
	<button onclick={onNewClass} class="btn btn-primary text-sm">
		<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
		</svg>
		New Class
	</button>
	
	{#if selectedClass}
		<button onclick={onEditClass} class="btn btn-outline text-sm">
			<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
			</svg>
			Edit Class
		</button>
		
		<button onclick={onNewStudent} class="btn btn-secondary text-sm">
			<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
			</svg>
			Add Student
		</button>
		
		<button onclick={onNewAssignment} class="btn btn-secondary text-sm">
			<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
			</svg>
			New Assignment
		</button>
	{/if}
	
	<button onclick={onImport} class="btn btn-ghost text-sm">
		<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
		</svg>
		Import
	</button>
	
	{#if selectedClass}
		<button onclick={onExport} class="btn btn-ghost text-sm">
			<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
			</svg>
			Export
		</button>
		
		<button 
			onclick={onToggleColumnSummary} 
			class="btn btn-ghost text-sm {showColumnSummary ? 'bg-accent' : ''}"
		>
			<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
			</svg>
			{showColumnSummary ? 'Hide' : 'Show'} Summary
		</button>
	{/if}
</div>