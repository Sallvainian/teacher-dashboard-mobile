import { redirect } from '@sveltejs/kit';

export function load() {
  // Redirect old /chat route to new /messaging route
  throw redirect(301, '/messaging');
}