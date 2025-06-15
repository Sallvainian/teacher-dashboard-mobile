<script lang="ts">
	interface Props {
		isOpen: boolean;
		assignmentName: string;
		maxPoints: number;
		dueDate: string;
		onClose: () => void;
		onSave: () => void;
		onAssignmentNameChange: (value: string) => void;
		onMaxPointsChange: (value: number) => void;
		onDueDateChange: (value: string) => void;
	}
	
	let { 
		isOpen, 
		assignmentName,
		maxPoints,
		dueDate,
		onClose, 
		onSave,
		onAssignmentNameChange,
		onMaxPointsChange,
		onDueDateChange
	}: Props = $props();
</script>

{#if isOpen}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
		<div class="bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4">
			<h3 class="text-lg font-semibold text-highlight mb-4">Edit Assignment</h3>
			
			<form onsubmit={onSave}>
				<div class="space-y-4">
					<div>
						<label for="edit-assignment-name" class="block text-sm font-medium text-text-base mb-1">
							Assignment Name *
						</label>
						<input
							id="edit-assignment-name"
							type="text"
							bind:value={assignmentName}
							onchange={(e) => onAssignmentNameChange(e.target.value)}
							placeholder="e.g., Chapter 5 Quiz"
							class="input w-full"
							required
						/>
					</div>
					
					<div>
						<label for="edit-max-points" class="block text-sm font-medium text-text-base mb-1">
							Maximum Points *
						</label>
						<input
							id="edit-max-points"
							type="number"
							bind:value={maxPoints}
							onchange={(e) => onMaxPointsChange(parseFloat(e.target.value) || 0)}
							min="0.1"
							step="0.1"
							class="input w-full"
							required
						/>
					</div>
					
					<div>
						<label for="edit-due-date" class="block text-sm font-medium text-text-base mb-1">
							Due Date
						</label>
						<input
							id="edit-due-date"
							type="date"
							bind:value={dueDate}
							onchange={(e) => onDueDateChange(e.target.value)}
							class="input w-full"
						/>
					</div>
				</div>
				
				<div class="flex justify-end gap-2 mt-6">
					<button type="button" onclick={onClose} class="btn btn-ghost">
						Cancel
					</button>
					<button type="submit" class="btn btn-primary">
						Save Changes
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}