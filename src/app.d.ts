// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
import type { SupabaseClient, Session, User } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

declare global {
	namespace App {
		// interface Error {}
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		interface Locals {
			supabase: SupabaseClient<Database>;
			safeGetSession(): Promise<{ session: Session | null; user: User | null }>;
			nonce: string;
		}
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		interface PageData {
			session: Session | null;
			user: User | null;
		}
		// interface Platform {}
	}
}



export {};
