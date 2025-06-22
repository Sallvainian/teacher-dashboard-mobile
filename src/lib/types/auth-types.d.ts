import type { User, AuthSession } from '@supabase/supabase-js';
import type { UserRole } from './database';
import type { Readable as _Readable } from 'svelte/store';

// Define the structure of the auth store for TypeScript
export interface AuthStore {
    user: User | null;
    profile: { id: string; email: string; full_name: string; avatar_url?: string | null; role: UserRole | null } | null;
    session: AuthSession | null;
    loading: boolean;
    error: string | null;
    isAuthenticated: boolean;
    role: UserRole | null;
    isInitialized: boolean;
}

// Declare the $-prefixed store variables that Svelte creates
declare global {
    // This makes $authStore properly typed in Svelte components
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let $authStore: AuthStore;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let $user: User | null;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let $profile: { id: string; email: string; full_name: string; avatar_url?: string | null; role: UserRole | null } | null;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let $session: AuthSession | null;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let $loading: boolean;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let $error: string | null;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let $isAuthenticated: boolean;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let $role: UserRole | null;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let $isInitialized: boolean;
}
