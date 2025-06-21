<script lang="ts">
 import { onMount } from 'svelte';
 import {
 	filesActions,
 	uploadProgress,
 	userStats,
 	files // Keep for getFolderStats - needs access to ALL files, not just current folder
 } from '$lib/stores/files';
 import { filePageStore, filePageActions } from '$lib/stores';
 import FilePreviewModal from '$lib/components/FilePreviewModal.svelte';
 import FileShareModal from '$lib/components/FileShareModal.svelte';
 import FolderTree from '$lib/components/FolderTree.svelte';
 import type { FileMetadata, FileFolder } from '$lib/types/files';
 import { formatFileSize, getFileIcon } from '$lib/types/files';
 import { supabase } from '$lib/supabaseClient';
 import { isAuthenticated } from '$lib/stores/auth';
 import { goto } from '$app/navigation';
 import { getEventTargetFiles } from '$lib/utils/domHelpers';

	// Define interface for file page data
	interface FilePageData {
		files: FileMetadata[];
		folders: FileFolder[];
		currentFolder: {
			name: string;
			path: FileFolder[];
		};
		selectedFiles: FileMetadata[];
		ui: {
			view: 'grid' | 'list';
			searchQuery: string;
			sortBy: 'name' | 'modified' | 'size' | 'type';
			sortDirection: 'asc' | 'desc';
			selectedFileIds: Set<string>;
			modals: {
				newFolder: boolean;
				preview: boolean;
				share: boolean;
			};
			selectedFile: FileMetadata | null;
			fileToShare: FileMetadata | null;
			newFolderName: string;
		};
		loading: boolean;
		error: string | null;
		stats: {
			totalFiles: number;
			selectedCount: number;
			selectedSize: number;
			hasSelection: boolean;
			canDelete: boolean;
			canShare: boolean;
		};
		isEmpty: boolean;
		showingTrash: boolean;
		hasSearchQuery: boolean;
	}

	// Get all file page data from composite store
	const pageData = $derived($filePageStore as FilePageData);

	// File input for uploads
	let fileInput = $state<HTMLInputElement | null>(null);

 onMount(async () => {
 	// Check auth state
 	const {
 		data: { user }
 	} = await supabase.auth.getUser();

 	// Only load files if user is authenticated
 	if (user) {
 		await filesActions.ensureDataLoaded();
 	}
 });

	function toggleSort(column: string) {
		filePageActions.setSorting(column as 'name' | 'modified' | 'size' | 'type');
	}

	function formatDate(dateString: string) {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	async function handleFileUpload(event: Event) {
		const files = getEventTargetFiles(event);
		if (!files || files.length === 0) return;

		// Get current folder ID from composite store (will be null for root)
		const currentFolderId = pageData.currentFolder.name === 'All Files' ? null : 
			pageData.folders.length > 0 ? pageData.folders[0]?.parent_id : null;

		for (const file of Array.from(files)) {
			await filesActions.uploadFile(file, currentFolderId || undefined);
		}

		// Clear the input
		if (fileInput) {
			fileInput.value = '';
		}
	}

	async function createNewFolder() {
		if (!pageData.ui.newFolderName.trim()) return;

		// Use the current folder from composite store data
		const currentFolderId = pageData.currentFolder.name === 'All Files' ? null :
			pageData.currentFolder.path.length > 0 ? 
				pageData.currentFolder.path[pageData.currentFolder.path.length - 1]?.id : null;

		const result = await filesActions.createFolder(
			pageData.ui.newFolderName.trim(),
			currentFolderId || undefined
		);

		if (result) {
			filePageActions.closeNewFolderModal();
		} else {
			console.error('Failed to create folder');
			// Keep modal open on error
		}
	}

	async function deleteFile(file: FileMetadata) {
		try {
			const confirmed = confirm(`Are you sure you want to delete "${file.name}"?\n\nThis action cannot be undone.`);
			
			if (!confirmed) {
				return;
			}
			await filesActions.deleteFile(file.id);
		} catch (error: unknown) {
			console.error('Error deleting file:', error);
			alert('Failed to delete file. Please try again.');
		}
	}

	async function downloadFile(file: FileMetadata) {
		await filesActions.downloadFile(file.id, file.name);
	}

	function shareFile(file: FileMetadata) {
		filePageActions.openShareModal(file);
	}

	function openFilePreview(file: FileMetadata) {
		filePageActions.openPreviewModal(file);
	}

	function navigateToFolder(folderId: string | null) {
		filesActions.setCurrentFolder(folderId);
	}

	// Compute folder stats (requires all files store since composite only has current folder files)
	function getFolderStats(folder: FileFolder) {
		const folderFiles = $files.filter((f) => f.folder_id === folder.id);
		const totalSize = folderFiles.reduce((sum, file) => sum + file.size, 0);
		return {
			fileCount: folderFiles.length,
			size: formatFileSize(totalSize)
		};
	}
</script>

<div class="min-h-screen">
	<div class="container mx-auto px-4 py-8">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="text-3xl font-bold text-highlight mb-2">
				{pageData.showingTrash ? 'Trash' : 'File Storage'}
			</h1>
			<p class="text-text-base">
				{pageData.showingTrash ? 'Recover deleted files or permanently remove them' : 'Organize and manage your teaching materials'}
			</p>
		</div>

		{#if !$isAuthenticated}
			<div class="card-dark p-8 text-center">
				<div class="flex flex-col items-center justify-center py-12">
					<svg
						class="w-16 h-16 text-muted mb-4"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
					>
						<path d="M12 15v2m0 0v2m0-2h2m-2 0H9.5"></path>
						<path d="M4 21V8a2 2 0 012-2h12a2 2 0 012 2v13a2 2 0 01-2 2H6a2 2 0 01-2-2z"></path>
						<path d="M8 10V7a4 4 0 118 0v3"></path>
					</svg>
					<h3 class="text-lg font-medium text-highlight mb-2">Authentication Required</h3>
					<p class="text-text-base text-center max-w-md mb-6">
						You need to be signed in to view and manage your files.
					</p>
					<button class="btn btn-primary" onclick={() => goto('/auth/login')}>
						Sign In
					</button>
				</div>
			</div>
		{:else}

		<!-- Actions Bar -->
		<div class="flex flex-wrap gap-4 mb-6">
			<div class="flex-1">
				<div class="relative">
					<input
						type="text"
						value={pageData.ui.searchQuery}
						oninput={(e) => filePageActions.setSearchQuery((e.target as HTMLInputElement).value)}
						placeholder="Search files..."
						class="input w-full pl-10"
					/>
					<svg
						class="w-5 h-5 text-muted absolute left-3 top-1/2 transform -translate-y-1/2"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<circle cx="11" cy="11" r="8"></circle>
						<line x1="21" y1="21" x2="16.65" y2="16.65"></line>
					</svg>
				</div>
			</div>

			<div class="flex gap-2">
				<input
					type="file"
					multiple
					bind:this={fileInput}
					onchange={(e) => handleFileUpload(e)}
					class="hidden"
				/>
				<button class="btn btn-primary" onclick={() => fileInput?.click()} disabled={pageData.loading || pageData.showingTrash}>
					<svg
						class="w-5 h-5 mr-2"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
						<polyline points="17 8 12 3 7 8"></polyline>
						<line x1="12" y1="3" x2="12" y2="15"></line>
					</svg>
					Upload
				</button>

				{#if !pageData.showingTrash}
					<button class="btn btn-secondary" onclick={() => filePageActions.openNewFolderModal()}>
						<svg
							class="w-5 h-5 mr-2"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
							></path>
							<line x1="12" y1="11" x2="12" y2="17"></line>
							<line x1="9" y1="14" x2="15" y2="14"></line>
						</svg>
						New Folder
					</button>
				{/if}

				<button
					class={`btn ${pageData.showingTrash ? 'btn-error' : 'btn-secondary'}`}
					onclick={() => {
						filesActions.toggleTrash();
						if (!pageData.showingTrash) {
							filesActions.loadDeletedFiles();
						}
					}}
				>
					<svg
						class="w-5 h-5 mr-2"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<polyline points="3 6 5 6 21 6"></polyline>
						<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
					</svg>
					{pageData.showingTrash ? 'Exit Trash' : 'View Trash'}
				</button>

				<div class="flex border border-border rounded-lg overflow-hidden">
					<button
						class={`p-2 ${pageData.ui.view === 'grid' ? 'bg-purple text-highlight' : 'bg-surface text-text-base hover:bg-accent hover:text-text-hover'}`}
						onclick={() => filePageActions.setView('grid')}
						title="Grid view"
						aria-label="Grid view"
					>
						<svg
							class="w-5 h-5"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<rect x="3" y="3" width="7" height="7"></rect>
							<rect x="14" y="3" width="7" height="7"></rect>
							<rect x="14" y="14" width="7" height="7"></rect>
							<rect x="3" y="14" width="7" height="7"></rect>
						</svg>
					</button>
					<button
						class={`p-2 ${pageData.ui.view === 'list' ? 'bg-purple text-highlight' : 'bg-surface text-text-base hover:bg-accent hover:text-text-hover'}`}
						onclick={() => filePageActions.setView('list')}
						title="List view"
						aria-label="List view"
					>
						<svg
							class="w-5 h-5"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<line x1="8" y1="6" x2="21" y2="6"></line>
							<line x1="8" y1="12" x2="21" y2="12"></line>
							<line x1="8" y1="18" x2="21" y2="18"></line>
							<line x1="3" y1="6" x2="3.01" y2="6"></line>
							<line x1="3" y1="12" x2="3.01" y2="12"></line>
							<line x1="3" y1="18" x2="3.01" y2="18"></line>
						</svg>
					</button>
				</div>
			</div>
		</div>

		<!-- Upload Progress -->
		{#if $uploadProgress.length > 0}
			<div class="card-dark mb-6 space-y-3">
				{#each $uploadProgress as progress (progress.file.name)}
					<div>
						<div class="flex items-center gap-3 mb-2">
							{#if progress.status === 'uploading'}
								<svg
									class="w-5 h-5 text-purple animate-pulse"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
									<polyline points="17 8 12 3 7 8"></polyline>
									<line x1="12" y1="3" x2="12" y2="15"></line>
								</svg>
							{:else if progress.status === 'success'}
								<svg
									class="w-5 h-5 text-success"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<circle cx="12" cy="12" r="10"></circle>
									<path d="M9 12l2 2 4-4"></path>
								</svg>
							{:else}
								<svg
									class="w-5 h-5 text-error"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<circle cx="12" cy="12" r="10"></circle>
									<line x1="15" y1="9" x2="9" y2="15"></line>
									<line x1="9" y1="9" x2="15" y2="15"></line>
								</svg>
							{/if}
							<span class="text-highlight flex-1">{progress.file.name}</span>
							<span class="text-text-base">{progress.progress}%</span>
						</div>

						<div class="w-full bg-surface rounded-full h-2 overflow-hidden">
							<div
								class={`h-full transition-all duration-300 ${
									progress.status === 'error'
										? 'bg-error'
										: progress.status === 'success'
											? 'bg-success'
											: 'bg-purple'
								}`}
								style={`width: ${progress.progress}%`}
							></div>
						</div>

						{#if progress.error}
							<p class="text-error text-sm mt-1">{progress.error}</p>
						{/if}
					</div>
				{/each}
			</div>
		{/if}

		<!-- Main Content -->
		<div class="flex flex-col lg:flex-row gap-6">
			<!-- Sidebar -->
			<div class="lg:w-64 flex-shrink-0">
				<div class="card-dark">
					<h3 class="text-sm font-medium text-highlight mb-3">Folders</h3>

					<div class="space-y-0.5">
						<button
							class={`w-full text-left px-2 py-0.5 rounded-lg flex items-center gap-1 transition-colors text-xs ${pageData.currentFolder.name === 'All Files' ? 'bg-purple-bg text-highlight' : 'hover:bg-surface text-text-base hover:text-text-hover'}`}
							onclick={() => navigateToFolder(null)}
						>
							<svg
								class="w-3.5 h-3.5"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<path d="M3 6l9-4 9 4v12l-9 4-9-4V6z"></path>
								<path d="M3 6l9 4 9-4"></path>
								<path d="M12 10v10"></path>
							</svg>
							All Files
						</button>

						<!-- Folder Tree -->
						{#if pageData.folders.length === 0}
							<div class="px-3 py-4 text-center">
								<p class="text-sm text-muted mb-2">No folders yet</p>
								<button
									class="text-xs text-purple hover:text-purple-hover transition-colors"
									onclick={() => filePageActions.openNewFolderModal()}
								>
									Create your first folder
								</button>
							</div>
						{:else}
							<FolderTree folders={pageData.folders} parentId={null} />
						{/if}
					</div>

					{#if $userStats}
						<div class="mt-6 pt-6 border-t border-border">
							<div class="text-sm text-text-base mb-2">Storage</div>
							<div class="w-full bg-surface rounded-full h-2 mb-2">
								<div
									class="bg-purple h-full"
									style={`width: ${Math.min(($userStats.total_size_bytes / (1024 * 1024 * 1024)) * 100, 100)}%`}
								></div>
							</div>
							<div class="flex justify-between text-xs">
								<span class="text-text-base"
									>{formatFileSize($userStats.total_size_bytes)} used</span
								>
								<span class="text-text-base">1 GB total</span>
							</div>
						</div>
					{/if}
				</div>
			</div>

			<!-- Files Display -->
			<div class="flex-1">
				<div class="card-dark">
					<!-- Breadcrumb Navigation -->
					{#if pageData.currentFolder.path.length > 0}
						<div class="flex items-center gap-2 mb-4 text-sm">
							<button
								onclick={() => navigateToFolder(null)}
								class="text-text-base hover:text-highlight transition-colors"
							>
								All Files
							</button>
							{#each pageData.currentFolder.path as folder, i (i)}
								<svg
									class="w-4 h-4 text-muted"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<polyline points="9 18 15 12 9 6"></polyline>
								</svg>
								{#if i === pageData.currentFolder.path.length - 1}
									<span class="text-highlight font-medium">{folder.name}</span>
								{:else}
									<button
										onclick={() => navigateToFolder(folder.id)}
										class="text-text-base hover:text-highlight transition-colors"
									>
										{folder.name}
									</button>
								{/if}
							{/each}
						</div>
					{/if}

					<div class="flex justify-between items-center mb-6">
						<h2 class="text-xl font-bold text-highlight">{pageData.currentFolder.name}</h2>

						<div class="flex items-center gap-2">
							<span class="text-sm text-text-base">Sort by:</span>
							<select
								value={pageData.ui.sortBy}
								onchange={(e) => filePageActions.setSorting((e.target as HTMLSelectElement).value as 'name' | 'modified' | 'size' | 'type', pageData.ui.sortDirection)}
								class="bg-surface border border-border rounded-lg text-text-hover text-sm py-1 px-2"
							>
								<option value="name">Name</option>
								<option value="modified">Date</option>
								<option value="size">Size</option>
							</select>

							<button
								onclick={() => filePageActions.setSorting(pageData.ui.sortBy, pageData.ui.sortDirection === 'asc' ? 'desc' : 'asc')}
								class="p-1 text-text-base hover:text-text-hover"
								title={pageData.ui.sortDirection === 'asc' ? 'Ascending' : 'Descending'}
							>
								<svg
									class="w-5 h-5"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									{#if pageData.ui.sortDirection === 'asc'}
										<path d="M3 4h13M3 8h9M3 12h5M7 20V8"></path>
										<path d="M18 20l3-3-3-3"></path>
										<path d="M21 17h-8"></path>
									{:else}
										<path d="M3 4h13M3 8h9M3 12h5M7 20V8"></path>
										<path d="M18 8l3 3-3 3"></path>
										<path d="M21 11h-8"></path>
									{/if}
								</svg>
							</button>
						</div>
					</div>

					{#if pageData.error}
						<div class="bg-error/20 text-error px-4 py-3 rounded mb-4" role="alert">
							<p>{pageData.error}</p>
						</div>
					{/if}

					{#if pageData.loading}
						<div class="flex justify-center py-12">
							<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple"></div>
						</div>
					{:else if pageData.isEmpty}
						<div class="flex flex-col items-center justify-center py-12">
							<svg
								class="w-16 h-16 text-muted mb-4"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="1.5"
							>
								<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
								<polyline points="14 2 14 8 20 8"></polyline>
								<line x1="12" y1="18" x2="12" y2="12"></line>
								<line x1="9" y1="15" x2="15" y2="15"></line>
							</svg>
							<h3 class="text-lg font-medium text-highlight mb-2">No files or folders found</h3>
							<p class="text-text-base text-center max-w-md">
								{pageData.hasSearchQuery
									? `No items matching "${pageData.ui.searchQuery}"`
									: `This folder is empty. Create folders or upload files to get started.`}
							</p>
						</div>
					{:else if pageData.ui.view === 'grid'}
						<!-- Folders Section -->
						{#if pageData.folders.length > 0}
							<div class="mb-8">
								<h3 class="text-sm font-medium text-text-base mb-3">Folders</h3>
								<div
									class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3"
								>
									{#each pageData.folders as folder (folder.id)}
										{@const stats = getFolderStats(folder)}
										<div
											class="bg-surface/50 border border-border rounded-lg hover:bg-surface hover:border-purple/50 transition-all duration-200 cursor-pointer group relative p-2"
											onclick={() => navigateToFolder(folder.id)}
											onkeydown={(e) => {
												if (e.key === 'Enter' || e.key === ' ') {
													e.preventDefault();
													navigateToFolder(folder.id);
												}
											}}
											role="button"
											tabindex="0"
											aria-label={`Open folder ${folder.name}`}
										>
											<div class="flex items-center gap-3">
												<svg
													class="w-10 h-10 text-accent-hover flex-shrink-0"
													viewBox="0 0 24 24"
													fill="currentColor"
												>
													<path
														d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"
													/>
												</svg>
												<div class="flex-1 min-w-0">
													<h5 class="text-sm font-medium text-text-hover truncate">
														{folder.name}
													</h5>
													<p class="text-xs text-text-base">
														{stats.fileCount}
														{stats.fileCount === 1 ? 'item' : 'items'}
													</p>
												</div>
											</div>

											<!-- Folder actions -->
											<div
												class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
											>
												<button
													onclick={async (e) => {
														e.stopPropagation();
														await filesActions.deleteFolder(folder.id);
													}}
													class="p-1 rounded hover:bg-error/20 hover:text-error transition-colors"
													title="Delete folder"
													aria-label="Delete folder"
												>
													<svg
														class="w-4 h-4"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														stroke-width="2"
													>
														<polyline points="3 6 5 6 21 6"></polyline>
														<path
															d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
														></path>
													</svg>
												</button>
											</div>
										</div>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Files Section -->
						{#if pageData.files.length > 0}
							<div>
								<h3 class="text-sm font-medium text-text-base mb-3">Files</h3>
								<div
									class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3"
								>
									{#each pageData.files as file (file.id)}
										<div
											class="bg-surface/50 border border-border rounded-lg hover:bg-surface hover:border-purple/50 transition-all duration-200 cursor-pointer group relative p-4"
											onclick={() => openFilePreview(file)}
											onkeydown={(e) => {
												if (e.key === 'Enter' || e.key === ' ') {
													e.preventDefault();
													openFilePreview(file);
												}
											}}
											role="button"
											tabindex="0"
											aria-label={`Open ${file.name}`}
										>
											<div class="flex flex-col items-center">
												{#if file.type.toLowerCase() === 'pdf'}
													<svg
														class="w-12 h-12 text-error mb-2"
														viewBox="0 0 24 24"
														fill="currentColor"
													>
														<path
															d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M10,17L8,14H10V11H14V14H16L12,17"
														/>
													</svg>
												{:else if file.type.toLowerCase() === 'doc' || file.type.toLowerCase() === 'docx'}
													<svg
														class="w-12 h-12 text-accent-hover mb-2"
														viewBox="0 0 24 24"
														fill="currentColor"
													>
														<path
															d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M13,17V13H17V11H13V7H11V11H7V13H11V17H13Z"
														/>
													</svg>
												{:else}
													<div
														class="w-12 h-12 bg-surface border border-border rounded flex items-center justify-center text-xl mb-2"
													>
														{getFileIcon(file.type)}
													</div>
												{/if}
												<div class="w-full text-center">
													<div
														class="text-sm font-medium text-text-hover truncate"
														title={file.name}
													>
														{file.name}
													</div>
													<div class="text-xs text-text-base mt-1">
														{formatFileSize(file.size)}
													</div>
												</div>
											</div>

											<div
												class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
											>
												<button
													class="p-1 rounded hover:bg-error/20 hover:text-error transition-colors"
													onclick={(e) => {
														e.stopPropagation();
														// Show context menu
													}}
													aria-label="File options"
												>
													<svg
														class="w-4 h-4"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														stroke-width="2"
													>
														<circle cx="12" cy="12" r="1"></circle>
														<circle cx="19" cy="12" r="1"></circle>
														<circle cx="5" cy="12" r="1"></circle>
													</svg>
												</button>
											</div>
										</div>
									{/each}
								</div>
							</div>
						{/if}
					{:else}
						<div class="overflow-x-auto">
							<table class="w-full">
								<thead class="text-left border-b border-border">
									<tr>
										<th class="pb-3 text-text-base font-medium">
											<button class="flex items-center gap-1" onclick={() => toggleSort('name')}>
												Name
												{#if pageData.ui.sortBy === 'name'}
													<svg
														class="w-4 h-4"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														stroke-width="2"
													>
														{#if pageData.ui.sortDirection === 'asc'}
															<polyline points="18 15 12 9 6 15"></polyline>
														{:else}
															<polyline points="6 9 12 15 18 9"></polyline>
														{/if}
													</svg>
												{/if}
											</button>
										</th>
										<th class="pb-3 text-text-base font-medium">Type</th>
										<th class="pb-3 text-text-base font-medium">
											<button class="flex items-center gap-1" onclick={() => toggleSort('size')}>
												Size
												{#if pageData.ui.sortBy === 'size'}
													<svg
														class="w-4 h-4"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														stroke-width="2"
													>
														{#if pageData.ui.sortDirection === 'asc'}
															<polyline points="18 15 12 9 6 15"></polyline>
														{:else}
															<polyline points="6 9 12 15 18 9"></polyline>
														{/if}
													</svg>
												{/if}
											</button>
										</th>
										<th class="pb-3 text-text-base font-medium">
											<button
												class="flex items-center gap-1"
												onclick={() => toggleSort('modified')}
											>
												Modified
												{#if pageData.ui.sortBy === 'modified'}
													<svg
														class="w-4 h-4"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														stroke-width="2"
													>
														{#if pageData.ui.sortDirection === 'asc'}
															<polyline points="18 15 12 9 6 15"></polyline>
														{:else}
															<polyline points="6 9 12 15 18 9"></polyline>
														{/if}
													</svg>
												{/if}
											</button>
										</th>
										<th class="pb-3 text-text-base font-medium text-right">Actions</th>
									</tr>
								</thead>
								<tbody>
									{#each pageData.files as file (file.id)}
										<tr class="border-b border-border/50 hover:bg-surface/50 transition-colors">
											<td class="py-3 text-highlight">
												<button
													class="flex items-center gap-2 hover:underline"
													onclick={() => openFilePreview(file)}
												>
													{#if file.type.toLowerCase() === 'pdf'}
														<svg
															class="w-5 h-5 text-error"
															viewBox="0 0 24 24"
															fill="none"
															stroke="currentColor"
															stroke-width="2"
														>
															<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
															></path>
															<polyline points="14 2 14 8 20 8"></polyline>
														</svg>
													{:else}
														<div class="w-5 h-5 text-purple">
															{getFileIcon(file.type)}
														</div>
													{/if}
													<span>{file.name}</span>
												</button>
											</td>
											<td class="py-3 text-text-base uppercase text-xs">{file.type}</td>
											<td class="py-3 text-text-base">{formatFileSize(file.size)}</td>
											<td class="py-3 text-text-base">{formatDate(file.updated_at)}</td>
											<td class="py-3 text-right">
												<div class="flex justify-end gap-2">
													<button
														class="p-1 text-text-base hover:text-purple transition-colors"
														title="Share"
														aria-label="Share file"
														onclick={() => shareFile(file)}
													>
														<svg
															class="w-5 h-5"
															viewBox="0 0 24 24"
															fill="none"
															stroke="currentColor"
															stroke-width="2"
														>
															<circle cx="18" cy="5" r="3"></circle>
															<circle cx="6" cy="12" r="3"></circle>
															<circle cx="18" cy="19" r="3"></circle>
															<line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
															<line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
														</svg>
													</button>
													<button
														class="p-1 text-text-base hover:text-purple transition-colors"
														title="Download"
														aria-label="Download file"
														onclick={() => downloadFile(file)}
													>
														<svg
															class="w-5 h-5"
															viewBox="0 0 24 24"
															fill="none"
															stroke="currentColor"
															stroke-width="2"
														>
															<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
															<polyline points="7 10 12 15 17 10"></polyline>
															<line x1="12" y1="15" x2="12" y2="3"></line>
														</svg>
													</button>
													<button
														class="p-1 text-text-base hover:text-error transition-colors"
														title="Delete"
														aria-label="Delete file"
														onclick={() => deleteFile(file)}
													>
														<svg
															class="w-5 h-5"
															viewBox="0 0 24 24"
															fill="none"
															stroke="currentColor"
															stroke-width="2"
														>
															<polyline points="3 6 5 6 21 6"></polyline>
															<path
																d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
															></path>
														</svg>
													</button>
												</div>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</div>
			</div>
		</div>
{/if}
	</div>
</div>

<!-- New Folder Modal -->
{#if pageData.ui.modals.newFolder}
	<div class="fixed inset-0 bg-bg-base/80 backdrop-blur-sm flex items-center justify-center z-50">
		<div class="bg-card border border-border rounded-lg p-6 w-full max-w-md">
			<h3 class="text-xl font-bold text-highlight mb-4">Create New Folder</h3>

			{#if pageData.currentFolder.name !== 'All Files'}
				<div class="mb-4 p-3 bg-purple-bg rounded-lg">
					<p class="text-sm text-text-base">
						Creating subfolder in: <span class="font-medium text-highlight"
							>{pageData.currentFolder.name}</span
						>
					</p>
				</div>
			{/if}

			<div class="mb-4">
				<label for="folder-name" class="block text-sm font-medium text-text-base mb-2"
					>Folder Name</label
				>
				<input
					id="folder-name"
					type="text"
					value={pageData.ui.newFolderName}
					oninput={(e) => filePageActions.setNewFolderName((e.target as HTMLInputElement).value)}
					placeholder="Enter folder name"
					class="input w-full"
					onkeydown={(e) => e.key === 'Enter' && createNewFolder()}
				/>
			</div>

			<div class="flex justify-end gap-3">
				<button
					class="btn btn-secondary"
					onclick={() => filePageActions.closeNewFolderModal()}
				>
					Cancel
				</button>
				<button class="btn btn-primary" onclick={createNewFolder} disabled={!pageData.ui.newFolderName.trim()}>
					Create Folder
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- File Preview Modal -->
<FilePreviewModal 
	isOpen={pageData.ui.modals.preview} 
	file={pageData.ui.selectedFile} 
	onClose={() => filePageActions.closePreviewModal()}
	onDelete={deleteFile} 
/>

<!-- File Share Modal -->
<FileShareModal
	isOpen={pageData.ui.modals.share}
	file={pageData.ui.fileToShare}
	onClose={() => filePageActions.closeShareModal()}
/>
