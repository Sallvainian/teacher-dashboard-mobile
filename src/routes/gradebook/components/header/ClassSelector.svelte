<script lang="ts">
	import { gradebookStore } from '$lib/stores/gradebook';
	import type { Class, Student, Assignment } from '$lib/types/gradebook';
	
	interface Props {
		selectedClassId: string | null;
		onClassChange: (classId: string) => void;
		classes: Class[];
		students: Student[];
		assignments: Assignment[];
	}
	
	let { selectedClassId, onClassChange, classes, students, assignments }: Props = $props();
	
	// Binding value that ensures we never have null
	let selectedClassIdForBinding = $derived(selectedClassId || '');
	
	function handleChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		if (target.value) {
			onClassChange(target.value);
		}
	}
</script>

<div class="flex-1">
	<label for="class-select" class="block text-sm font-medium text-text-base mb-2">
		Class / Section
	</label>
	<div class="relative">
		<select
			id="class-select"
			onchange={handleChange}
			bind:value={selectedClassIdForBinding}
			class="input w-full pr-10"
		>
			<option value="">Choose a class / section...</option>
			{#each classes as cls (cls.id)}
				{@const studentCount = students.filter(s => cls.studentIds.includes(s.id)).length}
				{@const assignmentCount = assignments.filter(a => a.classId === cls.id).length}
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
	
	{#if classes.length === 0}
		<p class="text-yellow-400 mt-2">No classes found. Create a class to get started.</p>
	{/if}
</div>