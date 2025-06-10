// src/lib/stores/auth/index.ts
// Main auth store that combines all modules

import { derived } from 'svelte/store';
import { storeRegistry } from '../registry';

// Core stores
import {
	authStore,
	user,
	profile,
	session,
	loading,
	error,
	role,
	isAuthenticated,
	isInitialized
} from './core';

// Authentication actions
import {
	signIn,
	signUp,
	signUpStudent,
	signUpTeacher,
	signOut,
	resetPassword
} from './authActions';

// Profile actions
import {
	fetchUserProfile,
	updateUserProfile,
	createAppUserRecord,
	fetchUserRole
} from './profileActions';

// Initialization
import { initialize } from './initialization';

// Create the combined auth store function
function createAuthStore() {
	// Create a combined store with all the state and methods
	const combinedStore = {
		subscribe: (() => {
			const combinedDerived = derived(
				[user, profile, session, loading, error, isAuthenticated, role, isInitialized],
				([$user, $profile, $session, $loading, $error, $isAuthenticated, $role, $isInitialized]) => ({
					user: $user,
					profile: $profile,
					session: $session,
					loading: $loading,
					error: $error,
					isAuthenticated: $isAuthenticated,
					role: $role,
					isInitialized: $isInitialized
				})
			);
			storeRegistry.register('auth.combined', combinedDerived);
			return combinedDerived.subscribe;
		})(),
		signIn,
		signUp,
		signUpStudent,
		signUpTeacher,
		signOut,
		resetPassword,
		updateUserProfile,
		initialize
	};

	return combinedStore;
}

// Create and export the combined auth store
export const combinedAuthStore = createAuthStore();

// Export individual stores for backward compatibility
export {
	user,
	profile,
	session,
	loading,
	error,
	role,
	isAuthenticated,
	isInitialized
};