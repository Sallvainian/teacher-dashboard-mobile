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

// Note: Individual store constants were removed as they were unused
// Use the main authStore export or import individual stores from './auth/index' instead;