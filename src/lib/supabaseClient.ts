import { createClient } from '@supabase/supabase-js';
import { browser } from '$app/environment';

// Environment variables - hardcoded for development (declared in app.d.ts for production)
const PUBLIC_SUPABASE_URL = 'https://yutlcpluuhjxwudfathv.supabase.co';
const PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1dGxjcGx1dWhqeHd1ZGZhdGh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxMDk0MTgsImV4cCI6MjA2MjY4NTQxOH0.xUbla5RpsoqK9SKTL14li9lroXgimK4Zy8brPfzpVHc';

// Create the Supabase client with SvelteKit environment variables
export const supabaseUrl = PUBLIC_SUPABASE_URL;
const supabaseAnonKey = PUBLIC_SUPABASE_ANON_KEY;

// Check if credentials are provided
if (!supabaseUrl || !supabaseAnonKey) {
	console.error('Missing Supabase credentials. Please set environment variables.');
	throw new Error(
		'Missing Supabase credentials. Set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY environment variables.'
	);
}

// Create and export the Supabase client with proper SvelteKit configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
	auth: {
		autoRefreshToken: browser,
		persistSession: browser,
		detectSessionInUrl: browser
	}
});

export default supabase;