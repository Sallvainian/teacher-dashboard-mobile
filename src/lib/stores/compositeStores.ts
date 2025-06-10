// src/lib/stores/compositeStores.ts
// Composite stores that combine multiple stores for optimal component performance

import { get } from 'svelte/store';
import { createStore, createDerivedStore } from './storeFactory';
import { storeRegistry } from './registry';
import { 
	folders, 
	files, 
	deletedFiles, 
	currentFolderId, 
	showTrash,
	isLoading as filesLoading,
	error as filesError
} from './files';
import { memoizeSearchOperation } from '$lib/utils/memoize';
import type { FileMetadata, FileFolder, FileMetadataWithFolder } from '$lib/types/files';

// Define the state structure for the file page composite store
interface FilePageCompositeState {
	// Data
	files: FileMetadataWithFolder[];
	folders: FileFolder[];
	currentFolder: { name: string; path: FileFolder[]; };
	selectedFiles: FileMetadataWithFolder[];
	
	// UI State
	ui: FilePageState;
	
	// Loading/Error states
	loading: boolean;
	error: string | null;
	
	// Computed stats
	stats: {
		totalFiles: number;
		selectedCount: number;
		selectedSize: number;
		hasSelection: boolean;
		canDelete: boolean;
		canShare: boolean;
	};
	
	// View helpers
	isEmpty: boolean;
	showingTrash: boolean;
	hasSearchQuery: boolean;
}

// =================== FILE PAGE COMPOSITE STORE ===================

// File page UI state interface
interface FilePageState {
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
}

// Create UI state store for file page
const filePageUIStore = createStore<FilePageState>({
	name: 'filePageUI',
	initialValue: {
		view: 'grid',
		searchQuery: '',
		sortBy: 'name',
		sortDirection: 'asc',
		selectedFileIds: new Set(),
		modals: {
			newFolder: false,
			preview: false,
			share: false
		},
		selectedFile: null,
		fileToShare: null,
		newFolderName: ''
	},
	localStorageKey: 'file-page-ui-preferences'
});

// Memoized file filtering and sorting
const memoizedFilterAndSortFiles = memoizeSearchOperation(
	(
		files: FileMetadataWithFolder[], 
		searchQuery: string, 
		filters?: Record<string, unknown>
	) => {
		// Filter by current folder
		let result = files.filter((file) => {
			if (filters?.currentFolderId === null) {
				return !file.folder_id; // Root level files
			} else {
				return file.folder_id === filters?.currentFolderId;
			}
		});

		// Filter by search query
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			result = result.filter(
				(file) => 
					file.name.toLowerCase().includes(query) ?? 
					file.type.toLowerCase().includes(query)
			);
		}

		// Sort files
		result.sort((a, b) => {
			let comparison = 0;

			switch (filters?.sortBy) {
				case 'name':
					comparison = a.name.localeCompare(b.name);
					break;
				case 'modified':
					comparison = new Date(a.updated_at || a.created_at).getTime() - 
								new Date(b.updated_at || b.created_at).getTime();
					break;
				case 'size':
					comparison = a.size - b.size;
					break;
				case 'type':
					comparison = a.type.localeCompare(b.type);
					break;
			}

			return filters?.sortDirection === 'desc' ? -comparison : comparison;
		});

		return result;
	},
	{
		itemKeyExtractor: (file: FileMetadataWithFolder) => `${file.id}:${file.updated_at || file.created_at}`,
		maxSize: 50,
		ttl: 60000 // 1 minute TTL for file lists
	}
);

// Memoized folder computation
const memoizedGetCurrentFolders = memoizeSearchOperation(
	(
		folders: FileFolder[], 
		query: string, 
		filters?: Record<string, unknown>
	): FileFolder[] => {
		const showTrash = filters?.showTrash as boolean | undefined;

		// If showing trash, folders are typically not displayed or handled differently.
		if (showTrash) {
			return []; // Example: No folders shown in trash view
		}

		if (filters?.currentFolderId === null) {
			// Show root folders when in "All Files"
			return folders.filter((f) => !f.parent_id);
		} else {
			// Show subfolders of current folder
			return folders.filter((f) => f.parent_id === filters?.currentFolderId);
		}
	},
	{
		itemKeyExtractor: (folder: FileFolder) => `${folder.id}:${folder.parent_id ?? 'root'}`,
		maxSize: 20,
		ttl: 300000 // 5 minutes TTL for folder lists
	}
);

// Memoized breadcrumb computation
const memoizedGetBreadcrumbPath = memoizeSearchOperation(
	(
		folders: FileFolder[], 
		query: string, 
		filters?: Record<string, unknown>
	): { name: string; path: FileFolder[]; } => {
		if (!filters?.currentFolderId) {
			return { name: 'All Files', path: [] };
		}

		const folder = folders.find((f) => f.id === filters.currentFolderId);
		if (!folder) {
			return { name: 'All Files', path: [] };
		}

		// Build breadcrumb path
		const path: FileFolder[] = [];
		let current: FileFolder | null = folder;

		while (current) {
			path.unshift(current);
			if (current?.parent_id) {
				current = folders.find((f) => f.id === current!.parent_id) ?? null;
			} else {
				current = null;
			}
		}

		return { name: folder.name, path };
	},
	{
		itemKeyExtractor: (folder: FileFolder) => `${folder.id}:${folder.parent_id ?? 'root'}`,
		maxSize: 20,
		ttl: 300000 // 5 minutes TTL
	}
);

// Main composite store that combines all file page data
export const filePageStore = createDerivedStore({
	name: 'filePageComposite',
	stores: [
		filePageUIStore,
		files,
		deletedFiles,
		folders,
		currentFolderId,
		showTrash,
		filesLoading,
		filesError
	],
	deriveFn: (values: unknown[]) => {
		if (!Array.isArray(values) || values.length !== 8) {
			throw new Error('Invalid values array for filePageStore');
		}
		
		const [
			$ui,
			$files,
			$deletedFiles,
			$folders,
			$currentFolderId,
			$showTrash,
			$loading,
			$error
		] = values as [
			FilePageState,
			FileMetadataWithFolder[],
			FileMetadataWithFolder[],
			FileFolder[],
			string | null,
			boolean,
			boolean,
			string | null
		];

		// Choose files based on trash mode
		const sourceFiles = $showTrash ? $deletedFiles : $files;

		// Get filtered and sorted files
		const filteredFiles = memoizedFilterAndSortFiles(
			sourceFiles,
			$ui.searchQuery,
			{
				currentFolderId: $currentFolderId,
				showTrash: $showTrash,
				sortBy: $ui.sortBy,
				sortDirection: $ui.sortDirection
			}
		);

		// Get current folders
		const currentFolders = memoizedGetCurrentFolders(
			$folders,
			'',
			{ currentFolderId: $currentFolderId }
		);

		// Get current folder data and breadcrumb
		const currentFolderData = memoizedGetBreadcrumbPath(
			$folders,
			'',
			{ currentFolderId: $currentFolderId }
		);

		// Calculate selection stats
		const selectedFiles = filteredFiles.filter(file => 
			$ui.selectedFileIds.has(file.id)
		);
		const selectedSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);

		return {
			// Data
			files: filteredFiles,
			folders: currentFolders,
			currentFolder: currentFolderData,
			selectedFiles,
			
			// UI State
			ui: $ui,
			
			// Loading/Error states
			loading: $loading,
			error: $error,
			
			// Computed stats
			stats: {
				totalFiles: filteredFiles.length,
				selectedCount: selectedFiles.length,
				selectedSize,
				hasSelection: selectedFiles.length > 0,
				canDelete: selectedFiles.length > 0,
				canShare: selectedFiles.length === 1
			},
			
			// View helpers
			isEmpty: filteredFiles.length === 0 && currentFolders.length === 0,
			showingTrash: $showTrash,
			hasSearchQuery: $ui.searchQuery.length > 0
		};
	}
});

// UI Action helpers for file page
export const filePageActions = {
	// View controls
	setView(view: 'grid' | 'list') {
		filePageUIStore.update(state => ({ ...state, view }));
	},
	
	toggleView() {
		filePageUIStore.update(state => ({ 
			...state, 
			view: state.view === 'grid' ? 'list' : 'grid' 
		}));
	},
	
	// Search controls
	setSearchQuery(query: string) {
		filePageUIStore.update(state => ({ ...state, searchQuery: query }));
	},
	
	clearSearch() {
		filePageUIStore.update(state => ({ ...state, searchQuery: '' }));
	},
	
	// Sorting controls
	setSorting(sortBy: 'name' | 'modified' | 'size' | 'type', direction?: 'asc' | 'desc') {
		filePageUIStore.update(state => ({
			...state,
			sortBy,
			sortDirection: direction ?? (state.sortBy === sortBy && state.sortDirection === 'asc' ? 'desc' : 'asc')
		}));
	},
	
	// File selection
	toggleFileSelection(fileId: string) {
		filePageUIStore.update(state => {
			const newSelected = new Set(state.selectedFileIds);
			if (newSelected.has(fileId)) {
				newSelected.delete(fileId);
			} else {
				newSelected.add(fileId);
			}
			return { ...state, selectedFileIds: newSelected };
		});
	},
	
	selectAllFiles() {
		const currentFiles = get(filePageStore).files;
		filePageUIStore.update(state => ({
			...state,
			selectedFileIds: new Set(currentFiles.map((f: FileMetadataWithFolder) => f.id))
		}));
	},
	
	clearSelection() {
		filePageUIStore.update(state => ({
			...state,
			selectedFileIds: new Set()
		}));
	},
	
	// Modal controls
	openNewFolderModal() {
		filePageUIStore.update(state => ({
			...state,
			modals: { ...state.modals, newFolder: true },
			newFolderName: ''
		}));
	},
	
	closeNewFolderModal() {
		filePageUIStore.update(state => ({
			...state,
			modals: { ...state.modals, newFolder: false },
			newFolderName: ''
		}));
	},
	
	setNewFolderName(name: string) {
		filePageUIStore.update(state => ({ ...state, newFolderName: name }));
	},
	
	openPreviewModal(file: FileMetadata) {
		filePageUIStore.update(state => ({
			...state,
			modals: { ...state.modals, preview: true },
			selectedFile: file
		}));
	},
	
	closePreviewModal() {
		filePageUIStore.update(state => ({
			...state,
			modals: { ...state.modals, preview: false },
			selectedFile: null
		}));
	},
	
	openShareModal(file: FileMetadata) {
		filePageUIStore.update(state => ({
			...state,
			modals: { ...state.modals, share: true },
			fileToShare: file
		}));
	},
	
	closeShareModal() {
		filePageUIStore.update(state => ({
			...state,
			modals: { ...state.modals, share: false },
			fileToShare: null
		}));
	},
	
	// Utility actions
	resetToDefaults() {
		filePageUIStore.update(state => ({
			...state,
			view: 'grid',
			searchQuery: '',
			sortBy: 'name',
			sortDirection: 'asc',
			selectedFileIds: new Set(),
			modals: { newFolder: false, preview: false, share: false },
			selectedFile: null,
			fileToShare: null,
			newFolderName: ''
		}));
	}
};

// Register stores
storeRegistry.register('filePageUI', filePageUIStore);
storeRegistry.register('filePageComposite', filePageStore);

// Export individual derived stores for backward compatibility if needed
export const filePageView = createDerivedStore({
	name: 'filePageView',
	stores: [filePageUIStore],
	deriveFn: (values: unknown[]) => {
		if (!Array.isArray(values) || values.length !== 1) {
			throw new Error('Invalid values array for filePageView');
		}
		const [$ui] = values as [FilePageState];
		return $ui.view;
	}
});

export const filePageSearchQuery = createDerivedStore({
	name: 'filePageSearchQuery',
	stores: [filePageUIStore],
	deriveFn: (values: unknown[]) => {
		if (!Array.isArray(values) || values.length !== 1) {
			throw new Error('Invalid values array for filePageSearchQuery');
		}
		const [$ui] = values as [FilePageState];
		return $ui.searchQuery;
	}
});

export const filePageSelectedFiles = createDerivedStore({
	name: 'filePageSelectedFiles',
	stores: [filePageStore],
	deriveFn: (values: unknown[]) => {
		if (!Array.isArray(values) || values.length !== 1) {
			throw new Error('Invalid values array for filePageSelectedFiles');
		}
		const [$composite] = values as [FilePageCompositeState];
		return $composite.selectedFiles;
	}
});

// Register derived stores
storeRegistry.register('filePageView', filePageView);
storeRegistry.register('filePageSearchQuery', filePageSearchQuery);
storeRegistry.register('filePageSelectedFiles', filePageSelectedFiles);