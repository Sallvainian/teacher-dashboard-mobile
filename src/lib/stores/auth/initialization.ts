// src/lib/stores/auth/initialization.ts
// Auth initialization, session management, and auth state listener

import { supabase } from '$lib/supabaseClient';
import { authStore } from './core';
import { fetchUserProfile } from './profileActions';

// Track if we've already set up auth listener
let authListenerSetup = false;

// Initialize authentication
export async function initialize(): Promise<void> {
	if (authListenerSetup) {
		return;
	}

	authStore.update(state => ({
		...state,
		loading: true,
		error: null
	}));

	try {
		// First try to get session from local storage quickly
		const storedSession =
			typeof window !== 'undefined'
				? window.localStorage.getItem('teacher-dashboard-auth')
				: null;

		if (storedSession) {
			try {
				const parsed = JSON.parse(storedSession);
				if (parsed?.currentSession?.access_token) {
					// Optimistically set the session while we verify it
					authStore.update(state => ({
						...state,
						session: parsed.currentSession,
						user: parsed.currentSession.user
					}));

					// Don't wait for role fetch in the critical path - make it fully async
					setTimeout(() => {
						fetchUserProfile(parsed.currentSession.user.id).catch(console.error);
					}, 0);
				}
			} catch (e: unknown) {
				console.error('Error parsing stored session:', e);
			}
		}

		// Now verify/refresh the session with Supabase
		const { data, error: sessionError } = await supabase.auth.getSession();
		if (sessionError) throw sessionError;

		if (data?.session) {
			authStore.update(state => ({
				...state,
				session: data.session,
				user: data.session.user
			}));

			// Make role fetching non-blocking for faster initial load
			setTimeout(() => {
				fetchUserProfile(data.session.user.id).catch(console.error);
			}, 0);
		} else if (!storedSession) {
			// Only clear if we didn't have a stored session
			authStore.update(state => ({
				...state,
				session: null,
				user: null,
				role: null
			}));
		}

		// Only set up auth listener once
		if (!authListenerSetup) {
			supabase.auth.onAuthStateChange(
				async (event, newSession) => {
					authStore.update(state => ({
						...state,
						session: newSession,
						user: newSession?.user ?? null
					}));

					if (newSession?.user) {
						await fetchUserProfile(newSession.user.id);
					} else {
						authStore.update(state => ({
							...state,
							role: null
						}));
					}
				}
			);
			authListenerSetup = true;
		}
	} catch (err: unknown) {
		console.error('Auth initialization error:', err);
		authStore.update(state => ({
			...state,
			error: err instanceof Error ? err.message : 'Auth check failed'
		}));
	} finally {
		authStore.update(state => ({
			...state,
			loading: false,
			isInitialized: true
		}));
	}
}