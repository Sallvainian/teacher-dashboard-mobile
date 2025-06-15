<script lang="ts">
	interface Props {
		isOpen: boolean;
		studentName: string;
		onClose: () => void;
		onSave: () => void;
		onStudentNameChange: (value: string) => void;
	}
	
	let { 
		isOpen, 
		studentName,
		onClose, 
		onSave,
		onStudentNameChange
	}: Props = $props();
</script>

{#if isOpen}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
		<div class="bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4">
			<h3 class="text-lg font-semibold text-highlight mb-4">Add Student</h3>
			
			<form onsubmit={onSave}>
				<div class="space-y-4">
					<div>
						<label for="student-name" class="block text-sm font-medium text-text-base mb-1">
							Student Name *
						</label>
						<input
							id="student-name"
							type="text"
							bind:value={studentName}
							onchange={(e) => onStudentNameChange(e.target.value)}
							placeholder="Enter student's full name"
							class="input w-full"
							required
							autofocus
						/>
						<p class="text-xs text-muted mt-1">
							The student will be added to the currently selected class.
						</p>
					</div>
				</div>
				
				<div class="flex justify-end gap-2 mt-6">
					<button type="button" onclick={onClose} class="btn btn-ghost">
						Cancel
					</button>
					<button type="submit" class="btn btn-primary">
						Add Student
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}