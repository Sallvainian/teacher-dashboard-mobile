import { authStore } from '$lib/stores/auth/index';
import type { UnknownError } from '$lib/types/ai-enforcement';

let initPromise: Promise<void> | null = null;

export async function ensureAuthInitialized(): Promise<void> {
	initPromise ??= (async () => {
		try {
			// Initialize auth store - this will handle session restoration
			await authStore.initialize();
		} catch (error: UnknownError) {
			console.error('Auth initialization error:', error);
			// Don't let auth errors block the app from loading
			// The auth store's initialization already sets isInitialized to true in the finally block
		}
	})();

	return initPromise;
}