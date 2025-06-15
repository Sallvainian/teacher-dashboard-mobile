<!--
  @ai-context MEMORY_TEST_PAGE - Test page for Mem0 memory functionality
  @ai-dependencies authStore, memoryService
  @ai-sideEffects Creates/reads memories in Mem0 platform
  @ai-exports Memory test component
-->

<script lang="ts">
	import { memoryService } from '$lib/services';
	import { authStore } from '$lib/stores';
	import type { Memory } from '$lib/services/mem0Service';

	let testMessage = 'Student John had difficulty with fractions today. He seems to understand the concept but struggles with mixed numbers.';
	let searchQuery = '';
	let memories: Memory[] = [];
	let searchResults: Memory[] = [];
	let loading = false;
	let status = '';

	const { user } = $derived(authStore);

	async function addTestMemory() {
		if (!user) {
			status = 'Please log in first';
			return;
		}

		loading = true;
		status = 'Adding memory...';

		try {
			const result = await memoryService.addStudentInteraction(
				user,
				'student-john-123',
				testMessage,
				{
					subject: 'mathematics',
					difficulty_level: 'struggling',
					topic: 'fractions'
				}
			);

			if (result) {
				status = `Memory added successfully! ID: ${result.id}`;
				await loadMemories();
			} else {
				status = 'Failed to add memory - check console for errors';
			}
		} catch (error) {
			status = `Error: ${error}`;
		} finally {
			loading = false;
		}
	}

	async function addTeachingNote() {
		if (!user) {
			status = 'Please log in first';
			return;
		}

		loading = true;
		status = 'Adding teaching note...';

		try {
			const result = await memoryService.addTeachingNote(
				user,
				'Need to create more visual aids for fraction lessons. Students learn better with concrete examples.',
				'mathematics',
				'class-5th-grade'
			);

			if (result) {
				status = `Teaching note added! ID: ${result.id}`;
				await loadMemories();
			} else {
				status = 'Failed to add teaching note';
			}
		} catch (error) {
			status = `Error: ${error}`;
		} finally {
			loading = false;
		}
	}

	async function loadMemories() {
		if (!user) {
			status = 'Please log in first';
			return;
		}

		loading = true;
		status = 'Loading memories...';

		try {
			memories = await memoryService.getUserMemories(user.id);
			status = `Loaded ${memories.length} memories`;
		} catch (error) {
			status = `Error loading memories: ${error}`;
		} finally {
			loading = false;
		}
	}

	async function searchMemories() {
		if (!user || !searchQuery.trim()) {
			status = 'Please enter a search query';
			return;
		}

		loading = true;
		status = 'Searching memories...';

		try {
			searchResults = await memoryService.searchMemories(searchQuery, user.id);
			status = `Found ${searchResults.length} matching memories`;
		} catch (error) {
			status = `Error searching: ${error}`;
		} finally {
			loading = false;
		}
	}

	async function deleteMemory(memoryId: string) {
		loading = true;
		status = 'Deleting memory...';

		try {
			const success = await memoryService.deleteMemory(memoryId);
			if (success) {
				status = 'Memory deleted successfully';
				await loadMemories();
				searchResults = searchResults.filter(m => m.id !== memoryId);
			} else {
				status = 'Failed to delete memory';
			}
		} catch (error) {
			status = `Error deleting: ${error}`;
		} finally {
			loading = false;
		}
	}

	// Load memories when component mounts and user is available
	$effect(() => {
		if (user && memoryService.isInitialized()) {
			loadMemories();
		}
	});
</script>

<div class="container mx-auto p-6 max-w-4xl">
	<h1 class="text-3xl font-bold mb-6">Mem0 Memory Test</h1>

	{#if !memoryService.isInitialized()}
		<div class="alert alert-warning mb-6">
			<span>⚠️ Mem0 service is not initialized. Check your API key configuration.</span>
		</div>
	{:else if !user}
		<div class="alert alert-info mb-6">
			<span>ℹ️ Please log in to test memory functionality.</span>
		</div>
	{:else}
		<!-- Status Display -->
		{#if status}
			<div class="alert alert-info mb-6">
				<span>{status}</span>
			</div>
		{/if}

		<!-- Test Actions -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
			<div class="card bg-base-100 shadow-lg">
				<div class="card-body">
					<h2 class="card-title">Add Test Memory</h2>
					<textarea 
						bind:value={testMessage}
						class="textarea textarea-bordered w-full h-24"
						placeholder="Enter a memory to add..."
					></textarea>
					<div class="card-actions justify-end">
						<button 
							class="btn btn-primary"
							onclick={addTestMemory}
							disabled={loading}
						>
							{loading ? 'Adding...' : 'Add Student Memory'}
						</button>
					</div>
				</div>
			</div>

			<div class="card bg-base-100 shadow-lg">
				<div class="card-body">
					<h2 class="card-title">Add Teaching Note</h2>
					<p class="text-sm text-gray-600">
						This will add a predefined teaching note about visual aids for fractions.
					</p>
					<div class="card-actions justify-end">
						<button 
							class="btn btn-secondary"
							onclick={addTeachingNote}
							disabled={loading}
						>
							{loading ? 'Adding...' : 'Add Teaching Note'}
						</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Search Section -->
		<div class="card bg-base-100 shadow-lg mb-8">
			<div class="card-body">
				<h2 class="card-title">Search Memories</h2>
				<div class="flex gap-4">
					<input 
						type="text"
						bind:value={searchQuery}
						class="input input-bordered flex-1"
						placeholder="Search for memories..."
					/>
					<button 
						class="btn btn-outline"
						onclick={searchMemories}
						disabled={loading || !searchQuery.trim()}
					>
						{loading ? 'Searching...' : 'Search'}
					</button>
				</div>

				{#if searchResults.length > 0}
					<div class="mt-4">
						<h3 class="font-semibold mb-2">Search Results:</h3>
						<div class="space-y-2">
							{#each searchResults as memory}
								<div class="bg-gray-50 p-3 rounded border">
									<p class="font-medium">{memory.memory}</p>
									<div class="text-sm text-gray-600 mt-1">
										<span>ID: {memory.id}</span>
										{#if memory.metadata}
											<span class="ml-4">Type: {memory.metadata.type || 'N/A'}</span>
											{#if memory.metadata.student_id}
												<span class="ml-4">Student: {memory.metadata.student_id}</span>
											{/if}
										{/if}
									</div>
									<button 
										class="btn btn-xs btn-error mt-2"
										onclick={() => deleteMemory(memory.id)}
									>
										Delete
									</button>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- All Memories Display -->
		<div class="card bg-base-100 shadow-lg">
			<div class="card-body">
				<div class="flex justify-between items-center">
					<h2 class="card-title">All Your Memories ({memories.length})</h2>
					<button 
						class="btn btn-outline btn-sm"
						onclick={loadMemories}
						disabled={loading}
					>
						{loading ? 'Loading...' : 'Refresh'}
					</button>
				</div>

				{#if memories.length === 0}
					<p class="text-gray-600">No memories found. Add some memories to get started!</p>
				{:else}
					<div class="space-y-4 mt-4">
						{#each memories as memory}
							<div class="bg-gray-50 p-4 rounded border">
								<p class="font-medium">{memory.memory}</p>
								<div class="text-sm text-gray-600 mt-2">
									<div>ID: {memory.id}</div>
									<div>Created: {new Date(memory.created_at).toLocaleString()}</div>
									{#if memory.metadata}
										<div>Type: {memory.metadata.type || 'N/A'}</div>
										{#if memory.metadata.student_id}
											<div>Student ID: {memory.metadata.student_id}</div>
										{/if}
										{#if memory.metadata.subject}
											<div>Subject: {memory.metadata.subject}</div>
										{/if}
										{#if memory.metadata.class_id}
											<div>Class ID: {memory.metadata.class_id}</div>
										{/if}
									{/if}
								</div>
								<button 
									class="btn btn-xs btn-error mt-2"
									onclick={() => deleteMemory(memory.id)}
								>
									Delete
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>