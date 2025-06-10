<!-- src/lib/components/AssignmentCreationModal.svelte -->
<script lang="ts">
	import { gradebookStore } from '$lib/stores/gradebook';
	import type { AssignmentTemplate, AssignmentTemplateConfig } from '$lib/stores/gradebook/assignmentActions';
	import { fade, slide } from 'svelte/transition';
	
	interface Props {
		onclose: () => void;
		oncomplete?: (result: { created: number; failed: number }) => void;
	}
	
	let { onclose, oncomplete }: Props = $props();
	
	// Mode selection
	let mode = $state<'single' | 'bulk'>('single');
	
	// Single assignment state
	let singleAssignmentName = $state('');
	let singleMaxPoints = $state(100);
	let singleDueDate = $state('');
	
	// Bulk assignment state  
	let selectedClassIds = $state(new Set<string>());
	let discipline = $state('');
	let unit = $state(1);
	let lesson = $state(1);
	let selectedTemplates = $state(new Set<AssignmentTemplate>());
	let bulkMaxPoints = $state(100);
	let bulkDueDate = $state('');
	
	// Preview state
	let previewNames = $state<string[]>([]);
	
	// Loading state
	let isCreating = $state(false);
	let creationResult = $state<{ created: number; failed: number; errors: string[] } | null>(null);
	
	// Get all available templates
	const templates = Object.values(gradebookStore.ASSIGNMENT_TEMPLATES);
	
	// Selected class for single mode
	let selectedClassId = $derived($gradebookStore.selectedClassId);
	
	// Toggle class selection
	function toggleClassSelection(classId: string) {
		if (selectedClassIds.has(classId)) {
			selectedClassIds.delete(classId);
		} else {
			selectedClassIds.add(classId);
		}
		selectedClassIds = new Set(selectedClassIds);
		updatePreview();
	}
	
	// Toggle template selection
	function toggleTemplateSelection(template: AssignmentTemplate) {
		if (selectedTemplates.has(template)) {
			selectedTemplates.delete(template);
		} else {
			selectedTemplates.add(template);
		}
		selectedTemplates = new Set(selectedTemplates);
		updatePreview();
	}
	
	// Select all templates for quick creation
	function selectAllTemplates() {
		selectedTemplates = new Set(templates);
		updatePreview();
	}
	
	// Clear all template selections
	function clearTemplateSelection() {
		selectedTemplates.clear();
		selectedTemplates = new Set(selectedTemplates);
		updatePreview();
	}
	
	// Update preview
	function updatePreview() {
		if (mode === 'bulk' && discipline && unit && lesson && selectedTemplates.size > 0) {
			previewNames = Array.from(selectedTemplates).map(template =>
				gradebookStore.generateAssignmentName(discipline, unit, lesson, template)
			);
		} else {
			previewNames = [];
		}
	}
	
	// Watch for changes to update preview
	$effect(() => {
		updatePreview();
	});
	
	// Create single assignment
	async function createSingleAssignment() {
		if (!singleAssignmentName.trim() || !selectedClassId) return;
		
		isCreating = true;
		try {
			await gradebookStore.addAssignmentToClass(
				singleAssignmentName.trim(),
				singleMaxPoints,
				selectedClassId,
				singleDueDate || undefined
			);
			
			oncomplete?.({ created: 1, failed: 0 });
			onclose();
		} catch (error) {
			console.error('Failed to create assignment:', error);
		} finally {
			isCreating = false;
		}
	}
	
	// Create bulk assignments
	async function createBulkAssignments() {
		if (selectedClassIds.size === 0 || selectedTemplates.size === 0 || !discipline) return;
		
		isCreating = true;
		creationResult = null;
		
		try {
			const config: AssignmentTemplateConfig = {
				discipline,
				unit,
				lesson,
				templates: Array.from(selectedTemplates),
				maxPoints: bulkMaxPoints,
				dueDate: bulkDueDate || undefined
			};
			
			const result = await gradebookStore.bulkAddAssignments(
				config,
				Array.from(selectedClassIds)
			);
			
			creationResult = result;
			
			if (result.failed === 0) {
				oncomplete?.(result);
				setTimeout(() => onclose(), 1500); // Show success briefly
			}
		} catch (error) {
			console.error('Failed to create bulk assignments:', error);
		} finally {
			isCreating = false;
		}
	}
	
	// Quick template presets
	function applyQuickTemplate(preset: 'current-lesson' | 'next-5-lessons') {
		if (preset === 'current-lesson') {
			selectAllTemplates();
		} else if (preset === 'next-5-lessons') {
			// This would need more complex UI for multiple lessons
			// For now, just show a message
			alert('Multi-lesson creation coming soon! For now, create one lesson at a time.');
		}
	}
</script>

<div class="fixed inset-0 bg-bg-base/80 backdrop-blur-sm flex items-center justify-center z-50" transition:fade={{ duration: 200 }}>
	<div class="bg-card border border-border rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
		<!-- Header -->
		<div class="p-6 border-b border-border">
			<h3 class="text-xl font-bold text-highlight">Create Assignments</h3>
			<p class="text-muted text-sm mt-1">Add assignments to your classes with templates or custom names</p>
		</div>
		
		<!-- Mode Selection -->
		<div class="p-6 border-b border-border bg-card-dark">
			<div class="flex gap-4">
				<button
					onclick={() => mode = 'single'}
					class="flex-1 p-4 rounded-lg border-2 transition-all {mode === 'single' ? 'border-purple-500 bg-purple-500/10' : 'border-border hover:border-purple-500/50'}"
				>
					<h4 class="font-semibold text-text-base mb-1">Single Assignment</h4>
					<p class="text-sm text-muted">Create one assignment for the current class</p>
				</button>
				
				<button
					onclick={() => mode = 'bulk'}
					class="flex-1 p-4 rounded-lg border-2 transition-all {mode === 'bulk' ? 'border-purple-500 bg-purple-500/10' : 'border-border hover:border-purple-500/50'}"
				>
					<h4 class="font-semibold text-text-base mb-1">Bulk Creation</h4>
					<p class="text-sm text-muted">Create multiple assignments across classes</p>
				</button>
			</div>
		</div>
		
		<!-- Content -->
		<div class="flex-1 overflow-y-auto p-6">
			{#if mode === 'single'}
				<!-- Single Assignment Form -->
				<div class="space-y-4" transition:slide={{ duration: 200 }}>
					<div>
						<label for="single-name" class="block text-sm font-medium text-text-base mb-2">
							Assignment Name
						</label>
						<input
							id="single-name"
							bind:value={singleAssignmentName}
							placeholder="e.g., 1S U1L1 Exploration"
							class="input w-full"
						/>
					</div>
					
					<div class="grid grid-cols-2 gap-4">
						<div>
							<label for="single-points" class="block text-sm font-medium text-text-base mb-2">
								Max Points
							</label>
							<input
								id="single-points"
								bind:value={singleMaxPoints}
								type="number"
								min="1"
								class="input w-full"
							/>
						</div>
						
						<div>
							<label for="single-due-date" class="block text-sm font-medium text-text-base mb-2">
								Due Date
							</label>
							<input
								id="single-due-date"
								bind:value={singleDueDate}
								type="date"
								class="input w-full"
							/>
						</div>
					</div>
					
					<div class="card-dark p-4">
						<p class="text-sm text-muted">
							This assignment will be created for: 
							<span class="font-semibold text-highlight">
								{$gradebookStore.classes.find(c => c.id === selectedClassId)?.name || 'Current Class'}
							</span>
						</p>
					</div>
				</div>
			{:else}
				<!-- Bulk Assignment Form -->
				<div class="space-y-6" transition:slide={{ duration: 200 }}>
					<!-- Quick Templates -->
					<div class="card-dark p-4">
						<h4 class="font-semibold text-highlight mb-3">Quick Templates</h4>
						<div class="flex gap-3">
							<button
								onclick={() => applyQuickTemplate('current-lesson')}
								class="btn btn-secondary text-sm"
							>
								All 4 Types for Current Lesson
							</button>
							<button
								onclick={() => applyQuickTemplate('next-5-lessons')}
								class="btn btn-outline text-sm"
							>
								Next 5 Lessons (Coming Soon)
							</button>
						</div>
					</div>
					
					<!-- Template Configuration -->
					<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div>
							<label for="discipline" class="block text-sm font-medium text-text-base mb-2">
								Science Discipline
							</label>
							<input
								id="discipline"
								bind:value={discipline}
								placeholder="PS, LS, or ESS"
								class="input w-full"
							/>
							<p class="text-xs text-muted mt-1">
								PS = Physical, LS = Life, ESS = Earth & Space
							</p>
						</div>
						
						<div>
							<label for="unit" class="block text-sm font-medium text-text-base mb-2">
								Unit Number
							</label>
							<input
								id="unit"
								bind:value={unit}
								type="number"
								min="1"
								class="input w-full"
							/>
						</div>
						
						<div>
							<label for="lesson" class="block text-sm font-medium text-text-base mb-2">
								Lesson Number
							</label>
							<input
								id="lesson"
								bind:value={lesson}
								type="number"
								min="1"
								class="input w-full"
							/>
						</div>
					</div>
					
					<!-- Template Selection -->
					<div>
						<div class="flex items-center justify-between mb-3">
							<h4 class="font-semibold text-text-base">Assignment Types</h4>
							<div class="flex gap-2">
								<button
									onclick={selectAllTemplates}
									class="text-sm text-purple-400 hover:text-purple-300"
								>
									Select All
								</button>
								<button
									onclick={clearTemplateSelection}
									class="text-sm text-muted hover:text-text-base"
								>
									Clear
								</button>
							</div>
						</div>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-2">
							{#each templates as template (template)}
								<label class="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:bg-card-dark {selectedTemplates.has(template) ? 'border-purple-500 bg-purple-500/10' : 'border-border'}">
									<input
										type="checkbox"
										checked={selectedTemplates.has(template)}
										onchange={() => toggleTemplateSelection(template)}
										class="w-4 h-4 text-purple-600"
									/>
									<span class="text-text-base">{template}</span>
								</label>
							{/each}
						</div>
					</div>
					
					<!-- Class Selection -->
					<div>
						<h4 class="font-semibold text-text-base mb-3">Apply to Classes</h4>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
							{#each $gradebookStore.classes as cls (cls.id)}
								<label class="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:bg-card-dark {selectedClassIds.has(cls.id) ? 'border-purple-500 bg-purple-500/10' : 'border-border'}">
									<input
										type="checkbox"
										checked={selectedClassIds.has(cls.id)}
										onchange={() => toggleClassSelection(cls.id)}
										class="w-4 h-4 text-purple-600"
									/>
									<span class="text-text-base">{cls.name}</span>
								</label>
							{/each}
						</div>
					</div>
					
					<!-- Settings -->
					<div class="grid grid-cols-2 gap-4">
						<div>
							<label for="bulk-points" class="block text-sm font-medium text-text-base mb-2">
								Max Points (for all assignments)
							</label>
							<input
								id="bulk-points"
								bind:value={bulkMaxPoints}
								type="number"
								min="1"
								class="input w-full"
							/>
						</div>
						
						<div>
							<label for="bulk-due-date" class="block text-sm font-medium text-text-base mb-2">
								Due Date (for all assignments)
							</label>
							<input
								id="bulk-due-date"
								bind:value={bulkDueDate}
								type="date"
								class="input w-full"
							/>
						</div>
					</div>
					
					<!-- Preview -->
					{#if previewNames.length > 0}
						<div class="card-dark p-4" transition:slide={{ duration: 200 }}>
							<h4 class="font-semibold text-highlight mb-3">Preview</h4>
							<p class="text-sm text-muted mb-2">
								Creating {previewNames.length} assignment{previewNames.length !== 1 ? 's' : ''} for {selectedClassIds.size} class{selectedClassIds.size !== 1 ? 'es' : ''}:
							</p>
							<ul class="space-y-1">
								{#each previewNames as name, index (index)}
									<li class="text-sm text-text-base flex items-center gap-2">
										<svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
										{name}
									</li>
								{/each}
							</ul>
						</div>
					{/if}
					
					<!-- Creation Result -->
					{#if creationResult}
						<div class="card-dark p-4 border-l-4 {creationResult.failed === 0 ? 'border-green-500' : 'border-yellow-500'}" transition:slide={{ duration: 200 }}>
							<h4 class="font-semibold {creationResult.failed === 0 ? 'text-green-400' : 'text-yellow-400'} mb-2">
								Creation Complete
							</h4>
							<p class="text-sm text-text-base">
								Successfully created {creationResult.created} assignment{creationResult.created !== 1 ? 's' : ''}.
								{#if creationResult.failed > 0}
									{creationResult.failed} failed.
								{/if}
							</p>
							{#if creationResult.errors.length > 0}
								<ul class="mt-2 text-sm text-red-400">
									{#each creationResult.errors.slice(0, 3) as error, index (index)}
										<li>• {error}</li>
									{/each}
									{#if creationResult.errors.length > 3}
										<li>• ...and {creationResult.errors.length - 3} more errors</li>
									{/if}
								</ul>
							{/if}
						</div>
					{/if}
				</div>
			{/if}
		</div>
		
		<!-- Footer -->
		<div class="p-6 border-t border-border bg-card-dark">
			<div class="flex justify-between items-center">
				<div>
					{#if mode === 'bulk'}
						<p class="text-sm text-muted">
							{selectedTemplates.size} template{selectedTemplates.size !== 1 ? 's' : ''} × {selectedClassIds.size} class{selectedClassIds.size !== 1 ? 'es' : ''} = 
							<span class="font-semibold text-highlight">
								{selectedTemplates.size * selectedClassIds.size} assignment{(selectedTemplates.size * selectedClassIds.size) !== 1 ? 's' : ''}
							</span>
						</p>
					{/if}
				</div>
				
				<div class="flex gap-3">
					<button
						onclick={onclose}
						class="btn btn-outline"
						disabled={isCreating}
					>
						{creationResult?.failed === 0 ? 'Close' : 'Cancel'}
					</button>
					
					{#if mode === 'single'}
						<button
							onclick={createSingleAssignment}
							class="btn btn-primary"
							disabled={!singleAssignmentName.trim() || isCreating}
						>
							{isCreating ? 'Creating...' : 'Create Assignment'}
						</button>
					{:else}
						<button
							onclick={createBulkAssignments}
							class="btn btn-primary"
							disabled={selectedClassIds.size === 0 || selectedTemplates.size === 0 || !discipline || isCreating}
						>
							{isCreating ? 'Creating...' : `Create ${selectedTemplates.size * selectedClassIds.size} Assignments`}
						</button>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>