import { sequence } from "@sveltejs/kit/hooks";
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Handle } from '@sveltejs/kit';

// Simple error handler without Sentry for now
const myErrorHandler = ({ error, event }: { error: unknown; event: import('@sveltejs/kit').RequestEvent }) => {
  console.error("An error occurred on the server side:", error, event);
};

// Supabase auth handler
const handleSupabase: Handle = async ({ event, resolve }) => {
  event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return event.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          event.cookies.set(name, value, { ...options, path: '/' })
        );
      },
    },
  });

  // Helper function to safely get session
  event.locals.safeGetSession = async () => {
    const {
      data: { session },
    } = await event.locals.supabase.auth.getSession();
    
    if (!session) {
      return { session: null, user: null };
    }

    const {
      data: { user },
      error,
    } = await event.locals.supabase.auth.getUser();
    
    if (error) {
      return { session: null, user: null };
    }

    return { session, user };
  };

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range' || name === 'x-supabase-api-version';
    },
  });
};

// Handle Chrome DevTools requests
const handleChromeDevTools: Handle = async ({ event, resolve }) => {
  // Check if this is a Chrome DevTools request
  if (event.url.pathname.includes('/.well-known/appspecific/com.chrome.devtools.json')) {
    // Return an empty JSON response to prevent 404 errors
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  // Not a Chrome DevTools request, continue to the next handler
  return resolve(event);
};

export const handleError = myErrorHandler;
export const handle = sequence(handleSupabase, handleChromeDevTools);
