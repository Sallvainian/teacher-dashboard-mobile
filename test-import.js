// Test file to verify $env/static/public import
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

console.log('✅ Import successful!');
console.log('PUBLIC_SUPABASE_URL exists:', !!PUBLIC_SUPABASE_URL);
console.log('PUBLIC_SUPABASE_ANON_KEY exists:', !!PUBLIC_SUPABASE_ANON_KEY);