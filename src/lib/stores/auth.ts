// src/lib/stores/auth.ts
// Main auth store - now uses modular structure for reduced complexity

// Re-export the modular auth store and all individual stores
export { 
	combinedAuthStore as authStore,
	user,
	profile, 
	session,
	loading,
	error,
	role,
	isAuthenticated,
	isInitialized
} from './auth/index';

// Maintain backward compatibility for any direct imports
import { storeRegistry } from './registry';

// Export individual stores for legacy code that imports them directly
export const userStore = storeRegistry.get('auth.user')!;
export const profileStore = storeRegistry.get('auth.profile')!;
export const sessionStore = storeRegistry.get('auth.session')!;
export const loadingStore = storeRegistry.get('auth.loading')!;
export const errorStore = storeRegistry.get('auth.error')!;
export const roleStore = storeRegistry.get('auth.role')!;
export const isAuthenticatedStore = storeRegistry.get('auth.isAuthenticated')!;
export const isInitializedStore = storeRegistry.get('auth.isInitialized')!;