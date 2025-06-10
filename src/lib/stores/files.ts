/**
 * @ai-context FILES_STORE - File and folder management with upload progress and trash functionality
 * @ai-dependencies fileService, uiStore, appState, memoize utilities
 * @ai-sideEffects Updates file/folder stores, uploads files to storage, modifies UI state
 * @ai-exports filesStore, filesActions, derived stores for files/folders/stats
 */
import { writable, derived, get } from 'svelte/store';
import type {
	FileFolder,
	FileFolderWithChildren,
	FileMetadataWithFolder,
	UserFileStats,
	FileUploadProgress,
	FileMetadata
} from '$lib/types/files';
import type { UnknownError } from '$lib/types/ai-enforcement';
import { fileService } from '$lib/services/fileService';
import { uiStore } from './ui';
import { filesState, filesActions as appFilesActions } from './appState';
import { memoizeArrayOperation } from '$lib/utils/memoize';

// Store state interface (loading/error/dataLoaded moved to unified app state)
interface FileStoreState {
	folders: FileFolder[];
	files: FileMetadataWithFolder[];
	deletedFiles: FileMetadataWithFolder[];
	currentFolderId: string | null;
	uploadProgress: FileUploadProgress[];
	userStats: UserFileStats | null;
	showTrash: boolean;
}

// Initial state (loading/error/dataLoaded now in unified app state)
const initialState: FileStoreState = {
	folders: [],
	files: [],
	deletedFiles: [],
	currentFolderId: null,
	uploadProgress: [],
	userStats: null,
	showTrash: false
};

// Create the main store
const fileStore = writable<FileStoreState>(initialState);

// Helper function to update store
function updateStore(updater: (state: FileStoreState) => FileStoreState) {
	fileStore.update(updater);
}

// Derived stores for computed values
export const folders = derived(fileStore, ($store) => $store.folders);
export const files = derived(fileStore, ($store) => $store.files);
export const deletedFiles = derived(fileStore, ($store) => $store.deletedFiles);
export const currentFolderId = derived(fileStore, ($store) => $store.currentFolderId);
export const uploadProgress = derived(fileStore, ($store) => $store.uploadProgress);
export const userStats = derived(fileStore, ($store) => $store.userStats);
export const showTrash = derived(fileStore, ($store) => $store.showTrash);

// Loading/error/dataLoaded states now come from unified app state
export const isLoading = derived(filesState, ($state: { loading: boolean; error: string | null; dataLoaded: boolean; }) => $state.loading);
export const error = derived(filesState, ($state: { loading: boolean; error: string | null; dataLoaded: boolean; }) => $state.error);
export const dataLoaded = derived(filesState, ($state: { loading: boolean; error: string | null; dataLoaded: boolean; }) => $state.dataLoaded);

// Memoized folder tree builder for performance optimization
const memoizedBuildFolderTree = memoizeArrayOperation(
	buildFolderTree,
	{
		itemKeyExtractor: (folder: FileFolder) => `${folder.id}:${folder.parent_id ?? 'root'}`,
		maxSize: 50,
		ttl: 300000 // 5 minutes
	}
);

// memoizationManager.register(memoizedBuildFolderTree); // Removed due to type error, memoizeArrayOperation might handle its own lifecycle or not need this type of registration.

// Derived store for folder tree with memoization
export const folderTree = derived(fileStore, ($store) => {
	return memoizedBuildFolderTree($store.folders);
});

// Derived store for current folder files
export const currentFolderFiles = derived([fileStore], ([$store]) => {
	if ($store.currentFolderId === null) {
		// Root level files (no folder)
		return $store.files.filter((file) => !file.folder_id);
	} else {
		return $store.files.filter((file) => file.folder_id === $store.currentFolderId);
	}
});

// Memoized file statistics calculation
const memoizedCalculateFileStats = memoizeArrayOperation(
	(items: { files: FileMetadataWithFolder[], folders: FileFolder[] }[]) => {
		const data = items[0];
		if (!data) return { totalFiles: 0, totalSize: 0, folderCount: 0, formattedSize: formatFileSize(0) };

		const totalFiles = data.files.length;
		const totalSize = data.files.reduce((sum, file) => sum + file.size, 0);
		const folderCount = data.folders.length;

		return {
			totalFiles,
			totalSize,
			folderCount,
			formattedSize: formatFileSize(totalSize)
		};
	},
	{
		itemKeyExtractor: (item: { files: FileMetadataWithFolder[], folders: FileFolder[] }) => 
			`${item.files.length}:${item.files.reduce((sum, f) => sum + f.size, 0)}:${item.folders.length}`,
		maxSize: 10,
		ttl: 300000 // 5 minutes
	}
);

// memoizationManager.register(memoizedCalculateFileStats); // Removed due to type error

// Derived store for file statistics with memoization
export const fileStats = derived(fileStore, ($store) => {
	return memoizedCalculateFileStats([{ files: $store.files, folders: $store.folders }]);
});

// Helper function to build folder tree
function buildFolderTree(folders: FileFolder[]): FileFolderWithChildren[] {
	const folderMap = new Map<string, FileFolderWithChildren>();
	const rootFolders: FileFolderWithChildren[] = [];

	// Create folder map
	folders.forEach((folder) => {
		folderMap.set(folder.id, { ...folder, children: [] });
	});

	// Build tree structure
	folders.forEach((folder) => {
		const folderWithChildren = folderMap.get(folder.id)!;

		if (folder.parent_id) {
			const parent = folderMap.get(folder.parent_id);
			if (parent) {
				parent.children!.push(folderWithChildren);
			}
		} else {
			rootFolders.push(folderWithChildren);
		}
	});

	return rootFolders;
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
	if (bytes === 0) return '0 Bytes';

	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// =================== ACTIONS ===================

const actions = {
	// Ensure data is loaded
	async ensureDataLoaded() {
		const state: { loading: boolean; error: string | null; dataLoaded: boolean; } = get(filesState);
		if (state.dataLoaded) return;
		await this.loadAllData();
	},

	// Load all files and folders with unified state management
	async loadAllData() {
		return await appFilesActions.withLoadingAndError(async () => {
			const [folders, files, stats] = await Promise.all([
				fileService.getFolders(),
				fileService.getFiles(),
				fileService.getUserStats()
			]);

			updateStore((state) => ({
				...state,
				folders,
				files,
				userStats: stats
			}));

			return { folders, files, stats };
		});
	},

	// Set current folder
	setCurrentFolder(folderId: string | null) {
		updateStore((state) => ({ ...state, currentFolderId: folderId }));
	},

	// Create folder with unified error handling
	async createFolder(name: string, parentId?: string) {
		return await appFilesActions.withLoadingAndError(async () => {
			const newFolder = await fileService.createFolder(name, parentId);

			if (newFolder) {
				updateStore((state) => ({
					...state,
					folders: [...state.folders, newFolder]
				}));
				return newFolder;
			}
			throw new Error('Failed to create folder');
		});
	},

	// Delete folder
	async deleteFolder(folderId: string) {
		return await appFilesActions.withLoadingAndError(async () => {
			const success = await fileService.deleteFolder(folderId);

			if (success) {
				updateStore((state) => ({
					...state,
					folders: state.folders.filter((f) => f.id !== folderId),
					files: state.files.filter((f) => f.folder_id !== folderId)
				}));
				return true;
			}
			throw new Error('Failed to delete folder');
		});
	},

	// Upload file
	async uploadFile(file: File, folderId?: string) {
		try {
			appFilesActions.clearError();

			// Add to upload progress
			const progressItem: FileUploadProgress = {
				file,
				progress: 0,
				status: 'uploading'
			};

			updateStore((state) => ({
				...state,
				uploadProgress: [...state.uploadProgress, progressItem]
			}));

			// Upload file with progress tracking
			const uploadedFile = await fileService.uploadFile(file, folderId, (progress) => {
				updateStore((state) => ({
					...state,
					uploadProgress: state.uploadProgress.map((item) =>
						item.file === file ? { ...item, progress } : item
					)
				}));
			});

			if (uploadedFile) {
				// Add to files list
				updateStore((state) => ({
					...state,
					files: [uploadedFile, ...state.files],
					uploadProgress: state.uploadProgress.map((item) =>
						item.file === file ? { ...item, progress: 100, status: 'success' } : item
					)
				}));

				// Remove from progress after 2 seconds
				setTimeout(() => {
					updateStore((state) => ({
						...state,
						uploadProgress: state.uploadProgress.filter((item) => item.file !== file)
					}));
				}, 2000);

				return uploadedFile;
			}
			throw new Error('Failed to upload file');
		} catch (err: UnknownError) {
			console.error('Error uploading file:', err);
			const errorMessage = err instanceof Error ? err.message : 'Failed to upload file';
			appFilesActions.setError(errorMessage);

			// Update progress with error
			updateStore((state) => ({
				...state,
				uploadProgress: state.uploadProgress.map((item) =>
					item.file === file ? { ...item, status: 'error', error: errorMessage } : item
				)
			}));

			return null;
		}
	},

	// Delete file
	async deleteFile(fileId: string) {
		return await appFilesActions.withLoadingAndError(async () => {
			const success = await fileService.deleteFile(fileId);

			if (success) {
				updateStore((state) => ({
					...state,
					files: state.files.filter((f) => f.id !== fileId)
				}));
				return true;
			}
			throw new Error('Failed to delete file');
		});
	},

	// Move file to different folder
	async moveFile(fileId: string, newFolderId: string | null) {
		try {
			const success = await fileService.moveFile(fileId, newFolderId);

			if (success) {
				updateStore((state) => ({
					...state,
					files: state.files.map((f) => (f.id === fileId ? { ...f, folder_id: newFolderId } : f))
				}));
				return true;
			}
			throw new Error('Failed to move file');
		} catch (err: UnknownError) {
			console.error('Error moving file:', err);
			appFilesActions.setError(err instanceof Error ? err.message : 'Failed to move file');
			return false;
		}
	},

	// Download file
	async downloadFile(fileId: string, fileName: string) {
		try {
			appFilesActions.clearError();
			const downloadUrl = await fileService.downloadFile(fileId);

			if (downloadUrl) {
				// Create download link
				const link = document.createElement('a');
				link.href = downloadUrl;
				link.download = fileName;
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
				return true;
			}
			throw new Error('Failed to get download URL');
		} catch (err: unknown) {
			console.error('Error downloading file:', err);
			appFilesActions.setError(err instanceof Error ? err.message : 'Failed to download file');
			return false;
		}
	},

	// Clear error
	clearError() {
		appFilesActions.clearError();
	},

	// Refresh data
	async refresh() {
		updateStore((state) => ({ ...state, dataLoaded: false }));
		await this.loadAllData();
	},

	// Share file with another user
	async shareFile(
		fileId: string,
		shareWith: string,
		permission: 'view' | 'edit' | 'delete' = 'view',
		expiresAt: string | null = null
	) {
		try {
			appFilesActions.clearError();
			const share = await fileService.shareFile(fileId, shareWith, permission, expiresAt);

			if (share) {
				// Optionally update local state or trigger a refresh
				return share;
			}
			throw new Error('Failed to share file');
		} catch (err: unknown) {
			console.error('Error sharing file:', err);
			appFilesActions.setError(err instanceof Error ? err.message : 'Failed to share file');
			return null;
		}
	},

	// Get file shares
	async getFileShares(fileId: string) {
		try {
			appFilesActions.clearError();
			return await fileService.getFileShares(fileId);
		} catch (err: unknown) {
			console.error('Error getting file shares:', err);
			appFilesActions.setError(err instanceof Error ? err.message : 'Failed to get file shares');
			return [];
		}
	},

	// Revoke file share
	async revokeShare(shareId: string) {
		try {
			appFilesActions.clearError();
			const success = await fileService.revokeShare(shareId);

			if (success) {
				return true;
			}
			throw new Error('Failed to revoke share');
		} catch (err: unknown) {
			console.error('Error revoking share:', err);
			appFilesActions.setError(err instanceof Error ? err.message : 'Failed to revoke share');
			return false;
		}
	},

	// Get files shared with me
	async getSharedWithMe() {
		try {
			appFilesActions.clearError();
			return await fileService.getSharedWithMe();
		} catch (err: unknown) {
			console.error('Error getting shared files:', err);
			appFilesActions.setError(err instanceof Error ? err.message : 'Failed to get shared files');
			return [];
		}
	},

	// Toggle trash view
	toggleTrash() {
		updateStore((state) => ({
			...state,
			showTrash: !state.showTrash
		}));
	},

	// Load deleted files
	async loadDeletedFiles() {
		try {
			appFilesActions.setLoading(true);
			appFilesActions.clearError();
			const deletedFiles = await fileService.getDeletedFiles();
			updateStore((state) => ({
				...state,
				deletedFiles
			}));
		} catch (err: unknown) {
			console.error('Error loading deleted files:', err);
			appFilesActions.setError(err instanceof Error ? err.message : 'Failed to load deleted files');
		} finally {
			appFilesActions.setLoading(false);
		}
	},

	// Restore a deleted file
	async restoreFile(fileId: string) {
		try {
			appFilesActions.clearError();
			const success = await fileService.restoreFile(fileId);
			
			if (success) {
				// Move file from deleted to active
				const state = get(fileStore);
				const restoredFile = state.deletedFiles.find(f => f.id === fileId);
				
				if (restoredFile) {
					updateStore((state) => ({
						...state,
						deletedFiles: state.deletedFiles.filter(f => f.id !== fileId),
						files: [restoredFile, ...state.files]
					}));
				}
				
				return true;
			}
			throw new Error('Failed to restore file');
		} catch (err: unknown) {
			console.error('Error restoring file:', err);
			appFilesActions.setError(err instanceof Error ? err.message : 'Failed to restore file');
			return false;
		}
	},

	// Permanently delete a file
	async permanentlyDeleteFile(fileId: string) {
		try {
			appFilesActions.clearError();
			const confirmed = confirm('Are you sure you want to permanently delete this file? This action cannot be undone.');
			
			if (!confirmed) return false;
			
			const success = await fileService.permanentlyDeleteFile(fileId);
			
			if (success) {
				updateStore((state) => ({
					...state,
					deletedFiles: state.deletedFiles.filter(f => f.id !== fileId)
				}));
				return true;
			}
			throw new Error('Failed to permanently delete file');
		} catch (err: unknown) {
			console.error('Error permanently deleting file:', err);
			appFilesActions.setError(err instanceof Error ? err.message : 'Failed to permanently delete file');
			return false;
		}
	}
};

// Enhanced UI Actions that integrate with uiStore
const enhancedActions = {
	// File preview with UI state management
	previewFile(file: FileMetadata) {
		uiStore.openFilePreviewModal(file);
	},

	// File sharing with UI state management
	shareFile(file: FileMetadata) {
		uiStore.openFileShareModal(file);
	},

	// Create folder with UI state management
	createFolderWithModal(parentFolderId: string | null = null) {
		uiStore.openNewFolderModal(parentFolderId);
	},

	// Delete file with confirmation modal
	deleteFileWithConfirmation(file: FileMetadata) {
		uiStore.openConfirmDeleteModal(file, async () => {
			const success = await actions.deleteFile(file.id);
			if (success) {
				uiStore.closeConfirmDeleteModal();
			}
		});
	},

	// Bulk delete files with confirmation
	async bulkDeleteFiles(fileIds: string[]) {
		if (fileIds.length === 0) return false;

		const confirmed = confirm(`Are you sure you want to delete ${fileIds.length} file(s)?`);
		if (!confirmed) return false;

		try {
			appFilesActions.clearError();
			const results = await Promise.allSettled(
				fileIds.map(id => fileService.deleteFile(id))
			);

			const successful = results.filter(result => 
				result.status === 'fulfilled' && result.value
			).length;

			if (successful > 0) {
				// Remove successfully deleted files from state
				updateStore((state) => ({
					...state,
					files: state.files.filter(f => !fileIds.includes(f.id))
				}));

				// Reload deleted files if in trash view
				const currentState = get(fileStore);
				if (currentState.showTrash) {
					await actions.loadDeletedFiles();
				}
			}

			if (successful < fileIds.length) {
				appFilesActions.setError(`${successful}/${fileIds.length} files deleted successfully`);
			}

			return successful === fileIds.length;
		} catch (err: unknown) {
			console.error('Error in bulk delete:', err);
			appFilesActions.setError(err instanceof Error ? err.message : 'Bulk delete failed');
			return false;
		}
	},

	// View management
	setView(view: 'grid' | 'list') {
		uiStore.setFileView(view);
	},

	// Search management
	search(query: string) {
		uiStore.setFileSearch(query);
	},

	// Sort management
	setSort(by: string, direction: 'asc' | 'desc') {
		uiStore.setFileSort(by, direction);
	},

	toggleSortDirection() {
		uiStore.toggleFileSortDirection();
	},

	// Create folder from modal
	async createFolderFromModal(name: string, parentId?: string) {
		const newFolder = await actions.createFolder(name, parentId);
		if (newFolder) {
			uiStore.closeNewFolderModal();
		}
		return newFolder;
	},

	// Handle file upload with UI feedback
	async uploadFileWithProgress(file: File, folderId?: string) {
		try {
			const result = await actions.uploadFile(file, folderId);
			
			// Clear upload progress after completion
			setTimeout(() => {
				updateStore((state) => ({
					...state,
					uploadProgress: state.uploadProgress.filter(item => item.file !== file)
				}));
			}, 2000); // Keep progress visible for 2 seconds

			return result;
		} catch (err: UnknownError) {
			// Clear failed upload from progress
			updateStore((state) => ({
				...state,
				uploadProgress: state.uploadProgress.filter(item => item.file !== file)
			}));
			throw err;
		}
	}
};

// Export actions separately for convenience  
export const filesActions = { ...actions, ...enhancedActions };

// Export the main store (backward compatibility)
export { fileStore };

// Export enhanced store with actions
export const filesStore = {
	subscribe: fileStore.subscribe,
	...actions,
	...enhancedActions
};
