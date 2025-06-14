// src/lib/stores/auth/core.ts
// Core auth stores - basic state management only

import type { AuthSession, User } from '@supabase/supabase-js';
import type { UserRole } from '$lib/types/database';
import type { AuthState } from '$lib/types/auth';
import { createStore, createDerivedStore } from '../storeFactory';
import { storeRegistry } from '../registry';
import { derived } from 'svelte/store';

// Type guard to safely validate UserRole from database
export function isValidUserRole(role: unknown): role is UserRole {
	return typeof role === 'string' && (role === 'teacher' || role === 'student');
}

export interface UserProfile {
	id: string;
	email: string;
	full_name: string;
	avatar_url?: string | null;
	role: UserRole | null;
}

export interface AuthStoreState {
	user: User | null;
	profile: UserProfile | null;
	session: AuthSession | null;
	loading: boolean;
	error: string | null;
	role: UserRole | null;
	isInitialized: boolean;
}

// Track auth updates for debugging
let authUpdateCount = 0;

// Create the main auth store with all state
const baseAuthStore = createStore<AuthStoreState>({
	name: 'auth',
	initialValue: {
		user: null,
		profile: null,
		session: null,
		loading: true,
		error: null,
		role: null,
		isInitialized: false
	},
	localStorageKey: 'teacher-dashboard-auth-state'
});

// Wrap the store to add logging
export const authStore = {
	...baseAuthStore,
	update: (updater: (state: AuthStoreState) => AuthStoreState) => {
		authUpdateCount++;
		console.log(`🔐 AUTH UPDATE #${authUpdateCount}:`, new Error().stack?.split('\n')[2]?.trim() || 'Unknown source');
		baseAuthStore.update(updater);
	}
};

// Create individual slices for better performance
export const user = createDerivedStore({
	name: 'auth.user',
	stores: [baseAuthStore],
	deriveFn: (values: unknown[]) => {
		const [$auth] = values as [AuthStoreState];
		return $auth.user;
	}
});

export const profile = createDerivedStore({
	name: 'auth.profile',
	stores: [baseAuthStore],
	deriveFn: (values: unknown[]) => {
		const [$auth] = values as [AuthStoreState];
		return $auth.profile;
	}
});

export const session = createDerivedStore({
	name: 'auth.session',
	stores: [baseAuthStore],
	deriveFn: (values: unknown[]) => {
		const [$auth] = values as [AuthStoreState];
		return $auth.session;
	}
});

export const loading = createDerivedStore({
	name: 'auth.loading',
	stores: [baseAuthStore],
	deriveFn: (values: unknown[]) => {
		const [$auth] = values as [AuthStoreState];
		return $auth.loading;
	}
});

export const error = createDerivedStore({
	name: 'auth.error',
	stores: [baseAuthStore],
	deriveFn: (values: unknown[]) => {
		const [$auth] = values as [AuthStoreState];
		return $auth.error;
	}
});

export const role = createDerivedStore({
	name: 'auth.role',
	stores: [baseAuthStore],
	deriveFn: (values: unknown[]) => {
		const [$auth] = values as [AuthStoreState];
		return $auth.role;
	}
});

export const isAuthenticated = createDerivedStore({
	name: 'auth.isAuthenticated',
	stores: [user],
	deriveFn: ([$user]) => {
		return !!$user;
	}
});

export const isInitialized = createDerivedStore({
	name: 'auth.isInitialized',
	stores: [baseAuthStore],
	deriveFn: ([$auth]) => {
		return $auth.isInitialized;
	}
});