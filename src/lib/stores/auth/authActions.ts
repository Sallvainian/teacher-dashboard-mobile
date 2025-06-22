// src/lib/stores/auth/authActions.ts
// Authentication operations (sign in, sign up, sign out, reset password)

import { supabase } from '$lib/supabaseClient';
import { clearSupabaseAuthStorage } from '$lib/utils/authStorage';
import { authStore } from './core';
import { fetchUserProfile } from './profileActions';
import { joinPresence, leavePresence } from '$lib/stores/presence';

// Sign in with email and password
export async function signIn(email: string, password: string): Promise<boolean> {
	authStore.update(state => ({
		...state,
		loading: true,
		error: null
	}));

	try {
		const { data, error: signInError } = await supabase.auth.signInWithPassword({
			email,
			password
		});

		if (signInError) {
			authStore.update(state => ({
				...state,
				error: signInError.message.includes('Invalid login')
					? 'Invalid email or password'
					: signInError.message
			}));
			return false;
		}

		if (data?.session) {
			authStore.update(state => ({
				...state,
				session: data.session,
				user: data.session.user
			}));

			// Fetch user profile immediately after sign in
			await fetchUserProfile(data.session.user.id);

			// Give auth state time to propagate
			await new Promise((resolve) => setTimeout(resolve, 100));
			
			// Join presence tracking after successful authentication
			try {
				console.log('🔄 Attempting to join presence after sign in...');
				await joinPresence();
			} catch (presenceError) {
				console.warn('Failed to join presence:', presenceError);
				// Don't fail sign in if presence fails
			}
			
			return true;
		}

		authStore.update(state => ({
			...state,
			error: 'Sign in failed'
		}));
		return false;
	} catch (err: unknown) {
		authStore.update(state => ({
			...state,
			error: err instanceof Error ? err.message : 'Sign in failed'
		}));
		return false;
	} finally {
		authStore.update(state => ({
			...state,
			loading: false
		}));
	}
}

// Basic sign up
export async function signUp(email: string, password: string, userData = {}): Promise<boolean | { needsEmailConfirmation: boolean }> {
	authStore.update(state => ({
		...state,
		loading: true,
		error: null
	}));

	try {
		const { data, error: signUpError } = await supabase.auth.signUp({
			email,
			password,
			options: { data: userData }
		});

		if (signUpError) throw signUpError;

		if (data?.session) {
			authStore.update(state => ({
				...state,
				session: data.session,
				user: data.session?.user ?? null
			}));
			return true;
		}

		return { needsEmailConfirmation: true };
	} catch (err: unknown) {
		authStore.update(state => ({
			...state,
			error: err instanceof Error ? err.message : 'Sign up failed'
		}));
		return false;
	} finally {
		authStore.update(state => ({
			...state,
			loading: false
		}));
	}
}

// Sign up as student
export async function signUpStudent(data: {
	email: string;
	password: string;
	fullName: string;
	joinCode?: string;
}): Promise<boolean | { needsEmailConfirmation: boolean }> {
	authStore.update(state => ({
		...state,
		loading: true,
		error: null
	}));

	try {
		// First sign up the user
		const { data: authData, error: signUpError } = await supabase.auth.signUp({
			email: data.email,
			password: data.password,
			options: { data: { full_name: data.fullName } }
		});

		if (signUpError) throw signUpError;

		if (authData?.user) {
			// Wait for auth session to be established
			if (authData.session) {
				// Session exists, we can create the profile
				const { error: profileError } = await supabase.from('app_users').insert({
					id: authData.user.id,
					email: data.email,
					full_name: data.fullName,
					role: 'student'
				});

				if (profileError) {
					console.error('Profile creation error:', profileError);
					// Don't fail signup if profile creation fails - it will be created on next login
				}
			} else {
				// No session yet (email confirmation required), profile will be created on first login
				console.log('Email confirmation required - profile will be created after confirmation');
			}

			// Create student record only if we have a session
			if (authData.session) {
				const { error: studentError } = await supabase.from('students').insert({
					user_id: authData.user.id,
					join_code: data.joinCode
				});

				if (studentError) {
					console.error('Student record creation error:', studentError);
					// Don't fail signup if student record creation fails
				}
			}

			return true;
		}

		return { needsEmailConfirmation: true };
	} catch (err: unknown) {
		authStore.update(state => ({
			...state,
			error: err instanceof Error ? err.message : 'Sign up failed'
		}));
		return false;
	} finally {
		authStore.update(state => ({
			...state,
			loading: false
		}));
	}
}

// Sign up as teacher
export async function signUpTeacher(data: {
	email: string;
	password: string;
	fullName: string;
	schoolName?: string;
}): Promise<boolean | { needsEmailConfirmation: boolean }> {
	authStore.update(state => ({
		...state,
		loading: true,
		error: null
	}));

	try {
		// First sign up the user
		const { data: authData, error: signUpError } = await supabase.auth.signUp({
			email: data.email,
			password: data.password,
			options: { data: { full_name: data.fullName } }
		});

		if (signUpError) throw signUpError;

		if (authData?.user) {
			// Wait for auth session to be established
			if (authData.session) {
				// Session exists, we can create the profile
				const { error: profileError } = await supabase.from('app_users').insert({
					id: authData.user.id,
					email: data.email,
					full_name: data.fullName,
					role: 'teacher'
				});

				if (profileError) {
					console.error('Profile creation error:', profileError);
					// Don't fail signup if profile creation fails - it will be created on next login
				}
			} else {
				// No session yet (email confirmation required), profile will be created on first login
				console.log('Email confirmation required - profile will be created after confirmation');
			}

			return true;
		}

		return { needsEmailConfirmation: true };
	} catch (err: unknown) {
		authStore.update(state => ({
			...state,
			error: err instanceof Error ? err.message : 'Sign up failed'
		}));
		return false;
	} finally {
		authStore.update(state => ({
			...state,
			loading: false
		}));
	}
}

// Sign out
export async function signOut(): Promise<boolean> {
	try {
		// Leave presence tracking before signing out
		try {
			await leavePresence();
		} catch (presenceError) {
			console.warn('Failed to leave presence:', presenceError);
			// Continue with sign out even if presence fails
		}

		// First clear local state immediately
		authStore.update(state => ({
			...state,
			session: null,
			user: null,
			role: null,
			loading: false
		}));

		// Clear any stored authentication keys
		clearSupabaseAuthStorage();

		// Now call Supabase signOut
		const { error: signOutError } = await supabase.auth.signOut();

		if (signOutError) {
			console.error('Supabase signOut error:', signOutError);
			// Even if there's an error, we've already cleared local state
			// so the user appears signed out
		}

		// Force a clean navigation to login page using our navigation utility
		if (typeof window !== 'undefined') {
			const { goto } = await import('$app/navigation');
			await goto('/auth/login', { replaceState: true });
		}

		return true;
	} catch (err: unknown) {
		console.error('Error during sign out:', err);

		// Update error state but still clear auth state
		authStore.update(state => ({
			...state,
			error: err instanceof Error ? err.message : 'Sign out failed',
			session: null,
			user: null,
			role: null,
			loading: false
		}));

		// Even on error, redirect
		if (typeof window !== 'undefined') {
			const { goto } = await import('$app/navigation');
			await goto('/auth/login', { replaceState: true });
		}
		return false;
	}
}

// Reset password
export async function resetPassword(email: string): Promise<boolean> {
	authStore.update(state => ({
		...state,
		loading: true,
		error: null
	}));

	try {
		const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);

		if (resetError) throw resetError;
		return true;
	} catch (err: unknown) {
		authStore.update(state => ({
			...state,
			error: err instanceof Error ? err.message : 'Password reset failed'
		}));
		return false;
	} finally {
		authStore.update(state => ({
			...state,
			loading: false
		}));
	}
}