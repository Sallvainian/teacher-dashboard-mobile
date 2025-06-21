import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { get } from 'svelte/store';
import { authStore } from '$lib/stores/auth';
import { ensureAuthInitialized } from '$lib/utils/authInit';
import { getIsAuthenticated } from '$lib/utils/storeHelpers';

export const load: PageLoad = async () => {
	try {
		// Ensure auth is initialized first
		await ensureAuthInitialized();

		// Get current auth state
		const auth = get(authStore);

		// If not authenticated, redirect to login
		if (!getIsAuthenticated(auth)) {
			throw redirect(303, '/auth/login');
		}

		// Return basic page data
		return {
			session: auth.session,
			user: auth.user
		};
	} catch (error) {
		// If it's a redirect, re-throw it
		if (error instanceof Error && 'status' in error && 'location' in error) {
			throw error;
		}
		// For any other error, redirect to login
		throw redirect(303, '/auth/login');
	}
};
