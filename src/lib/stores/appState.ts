// src/lib/stores/appState.ts
// Unified application state management for loading, errors, and data states
import { createStore, createDerivedStore } from './storeFactory';
import { storeRegistry } from './registry';

// Define all the different domains/modules in the app
type AppDomain = 'auth' | 'files' | 'gradebook' | 'chat' | 'jeopardy' | 'scattergories' | 'global';

interface AppState {
	loading: Record<AppDomain, boolean>;
	errors: Record<AppDomain, string | null>;
	dataLoaded: Record<AppDomain, boolean>;
	// Add any global UI state that applies across domains
	ui: {
		sidebarOpen: boolean;
		theme: 'light' | 'dark' | 'auto';
		globalNotifications: boolean;
	};
}

const initialState: AppState = {
	loading: {
		auth: true, // Start with auth loading
		files: false,
		gradebook: false,
		chat: false,
		jeopardy: false,
		scattergories: false,
		global: false
	},
	errors: {
		auth: null,
		files: null,
		gradebook: null,
		chat: null,
		jeopardy: null,
		scattergories: null,
		global: null
	},
	dataLoaded: {
		auth: false,
		files: false,
		gradebook: false,
		chat: false,
		jeopardy: false,
		scattergories: false,
		global: false
	},
	ui: {
		sidebarOpen: true,
		theme: 'auto',
		globalNotifications: true
	}
};

// Create the main app state store
export const appStateStore = createStore<AppState>({
	name: 'appState',
	initialValue: initialState,
	localStorageKey: 'teacher-dashboard-app-state'
});

// Derived stores for easy access to specific domains
export const isAnyLoading = createDerivedStore({
	name: 'appState.isAnyLoading',
	stores: [appStateStore],
	deriveFn: ([$appState]) => {
		return Object.values($appState.loading).some(Boolean);
	}
});

export const hasAnyError = createDerivedStore({
	name: 'appState.hasAnyError',
	stores: [appStateStore],
	deriveFn: ([$appState]) => {
		return Object.values($appState.errors).some(error => error !== null);
	}
});

export const globalErrors = createDerivedStore({
	name: 'appState.globalErrors',
	stores: [appStateStore],
	deriveFn: ([$appState]) => {
		return Object.entries($appState.errors)
			.filter(([_, error]) => error !== null)
			.map(([domain, error]) => ({ domain: domain as AppDomain, message: error! }));
	}
});

// Helper functions for updating specific domains
export const appStateActions = {
	// Loading state management
	setLoading(domain: AppDomain, isLoading: boolean) {
		appStateStore.update(state => ({
			...state,
			loading: { ...state.loading, [domain]: isLoading }
		}));
	},

	// Error state management
	setError(domain: AppDomain, error: string | null) {
		appStateStore.update(state => ({
			...state,
			errors: { ...state.errors, [domain]: error }
		}));
	},

	clearError(domain: AppDomain) {
		appStateStore.update(state => ({
			...state,
			errors: { ...state.errors, [domain]: null }
		}));
	},

	clearAllErrors() {
		appStateStore.update(state => ({
			...state,
			errors: Object.keys(state.errors).reduce((acc, domain) => {
				acc[domain as AppDomain] = null;
				return acc;
			}, {} as Record<AppDomain, string | null>)
		}));
	},

	// Data loaded state management
	setDataLoaded(domain: AppDomain, loaded: boolean) {
		appStateStore.update(state => ({
			...state,
			dataLoaded: { ...state.dataLoaded, [domain]: loaded }
		}));
	},

	// UI state management
	toggleSidebar() {
		appStateStore.update(state => ({
			...state,
			ui: { ...state.ui, sidebarOpen: !state.ui.sidebarOpen }
		}));
	},

	setSidebarOpen(open: boolean) {
		appStateStore.update(state => ({
			...state,
			ui: { ...state.ui, sidebarOpen: open }
		}));
	},

	setTheme(theme: 'light' | 'dark' | 'auto') {
		appStateStore.update(state => ({
			...state,
			ui: { ...state.ui, theme }
		}));
	},

	// Utility function for async operations with automatic loading/error handling
	async withLoadingAndError<T>(
		domain: AppDomain,
		operation: () => Promise<T>,
		options: {
			clearErrorFirst?: boolean;
			setDataLoadedOnSuccess?: boolean;
		} = {}
	): Promise<T | null> {
		const { clearErrorFirst = true, setDataLoadedOnSuccess = false } = options;

		try {
			if (clearErrorFirst) {
				this.clearError(domain);
			}
			this.setLoading(domain, true);

			const result = await operation();

			if (setDataLoadedOnSuccess) {
				this.setDataLoaded(domain, true);
			}

			return result;
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
			this.setError(domain, errorMessage);
			console.error(`Error in ${domain}:`, error);
			return null;
		} finally {
			this.setLoading(domain, false);
		}
	}
};

// Domain-specific derived stores for backward compatibility and convenience
export const authState = createDerivedStore({
	name: 'appState.auth',
	stores: [appStateStore],
	deriveFn: (values: unknown[]) => {
		const [$appState] = values as [AppState];
		return {
			loading: $appState.loading.auth,
			error: $appState.errors.auth,
			dataLoaded: $appState.dataLoaded.auth
		};
	}
});

export const filesState = createDerivedStore({
	name: 'appState.files',
	stores: [appStateStore],
	deriveFn: (values: unknown[]) => {
		const [$appState] = values as [AppState];
		return {
			loading: $appState.loading.files,
			error: $appState.errors.files,
			dataLoaded: $appState.dataLoaded.files
		};
	}
});

export const gradebookState = createDerivedStore({
	name: 'appState.gradebook',
	stores: [appStateStore],
	deriveFn: (values: unknown[]) => {
		const [$appState] = values as [AppState];
		return {
			loading: $appState.loading.gradebook,
			error: $appState.errors.gradebook,
			dataLoaded: $appState.dataLoaded.gradebook
		};
	}
});

export const chatState = createDerivedStore({
	name: 'appState.chat',
	stores: [appStateStore],
	deriveFn: (values: unknown[]) => {
		const [$appState] = values as [AppState];
		return {
			loading: $appState.loading.chat,
			error: $appState.errors.chat,
			dataLoaded: $appState.dataLoaded.chat
		};
	}
});

// Register all stores with the registry
storeRegistry.register('appState', appStateStore);
storeRegistry.register('appState.isAnyLoading', isAnyLoading);
storeRegistry.register('appState.hasAnyError', hasAnyError);
storeRegistry.register('appState.globalErrors', globalErrors);
storeRegistry.register('appState.auth', authState);
storeRegistry.register('appState.files', filesState);
storeRegistry.register('appState.gradebook', gradebookState);
storeRegistry.register('appState.chat', chatState);

// Export domain-specific action helpers for cleaner usage
export const authActions = {
	setLoading: (loading: boolean) => appStateActions.setLoading('auth', loading),
	setError: (error: string | null) => appStateActions.setError('auth', error),
	clearError: () => appStateActions.clearError('auth'),
	setDataLoaded: (loaded: boolean) => appStateActions.setDataLoaded('auth', loaded),
	withLoadingAndError: <T>(operation: () => Promise<T>) => 
		appStateActions.withLoadingAndError('auth', operation)
};

export const filesActions = {
	setLoading: (loading: boolean) => appStateActions.setLoading('files', loading),
	setError: (error: string | null) => appStateActions.setError('files', error),
	clearError: () => appStateActions.clearError('files'),
	setDataLoaded: (loaded: boolean) => appStateActions.setDataLoaded('files', loaded),
	withLoadingAndError: <T>(operation: () => Promise<T>) => 
		appStateActions.withLoadingAndError('files', operation, { setDataLoadedOnSuccess: true })
};

export const gradebookActions = {
	setLoading: (loading: boolean) => appStateActions.setLoading('gradebook', loading),
	setError: (error: string | null) => appStateActions.setError('gradebook', error),
	clearError: () => appStateActions.clearError('gradebook'),
	setDataLoaded: (loaded: boolean) => appStateActions.setDataLoaded('gradebook', loaded),
	withLoadingAndError: <T>(operation: () => Promise<T>) => 
		appStateActions.withLoadingAndError('gradebook', operation, { setDataLoadedOnSuccess: true })
};

export const chatActions = {
	setLoading: (loading: boolean) => appStateActions.setLoading('chat', loading),
	setError: (error: string | null) => appStateActions.setError('chat', error),
	clearError: () => appStateActions.clearError('chat'),
	setDataLoaded: (loaded: boolean) => appStateActions.setDataLoaded('chat', loaded),
	withLoadingAndError: <T>(operation: () => Promise<T>) => 
		appStateActions.withLoadingAndError('chat', operation)
};