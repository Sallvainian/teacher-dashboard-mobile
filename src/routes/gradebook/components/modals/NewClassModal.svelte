<script lang="ts">
	interface Props {
		isOpen: boolean;
		className: string;
		gradeLevel: string;
		subject: string;
		schoolYear: string;
		joinCode: string;
		onClose: () => void;
		onSave: () => void;
		onClassNameChange: (value: string) => void;
		onGradeLevelChange: (value: string) => void;
		onSubjectChange: (value: string) => void;
		onSchoolYearChange: (value: string) => void;
		onJoinCodeChange: (value: string) => void;
	}
	
	let { 
		isOpen, 
		className, 
		gradeLevel, 
		subject, 
		schoolYear, 
		joinCode,
		onClose, 
		onSave,
		onClassNameChange,
		onGradeLevelChange,
		onSubjectChange,
		onSchoolYearChange,
		onJoinCodeChange
	}: Props = $props();
</script>

{#if isOpen}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
		<div class="bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4">
			<h3 class="text-lg font-semibold text-highlight mb-4">Create New Class</h3>
			
			<form onsubmit={onSave}>
				<div class="space-y-4">
					<div>
						<label for="new-class-name" class="block text-sm font-medium text-text-base mb-1">
							Class Name *
						</label>
						<input
							id="new-class-name"
							type="text"
							bind:value={className}
							onchange={(e) => onClassNameChange((e.target as HTMLInputElement).value)}
							placeholder="e.g., Math Period 1"
							class="input w-full"
							required
						/>
					</div>
					
					<div>
						<label for="new-grade-level" class="block text-sm font-medium text-text-base mb-1">
							Grade Level
						</label>
						<input
							id="new-grade-level"
							type="text"
							bind:value={gradeLevel}
							onchange={(e) => onGradeLevelChange((e.target as HTMLInputElement).value)}
							placeholder="e.g., 9th, 10th, K-2"
							class="input w-full"
						/>
					</div>
					
					<div>
						<label for="new-subject" class="block text-sm font-medium text-text-base mb-1">
							Subject
						</label>
						<input
							id="new-subject"
							type="text"
							bind:value={subject}
							onchange={(e) => onSubjectChange((e.target as HTMLInputElement).value)}
							placeholder="e.g., Mathematics, English"
							class="input w-full"
						/>
					</div>
					
					<div>
						<label for="new-school-year" class="block text-sm font-medium text-text-base mb-1">
							School Year
						</label>
						<input
							id="new-school-year"
							type="text"
							bind:value={schoolYear}
							onchange={(e) => onSchoolYearChange((e.target as HTMLInputElement).value)}
							placeholder="e.g., 2023-2024"
							class="input w-full"
						/>
					</div>
					
					<div>
						<label for="new-join-code" class="block text-sm font-medium text-text-base mb-1">
							Join Code
						</label>
						<input
							id="new-join-code"
							type="text"
							bind:value={joinCode}
							onchange={(e) => onJoinCodeChange((e.target as HTMLInputElement).value)}
							placeholder="e.g., MATH2024"
							class="input w-full"
						/>
					</div>
				</div>
				
				<div class="flex justify-end gap-2 mt-6">
					<button type="button" onclick={onClose} class="btn btn-ghost">
						Cancel
					</button>
					<button type="submit" class="btn btn-primary">
						Create Class
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}