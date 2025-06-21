import { sequence } from "@sveltejs/kit/hooks";
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$lib/utils/env';
import type { Handle } from '@sveltejs/kit';
import { webcrypto as crypto } from 'crypto';

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
        cookiesToSet.forEach(({ name, value, options }) => {
          try {
            event.cookies.set(name, value, { ...options, path: '/' });
          } catch (error) {
            // Ignore cookie setting errors after response is generated
            console.warn('Cookie setting failed (response already generated):', name);
          }
        });
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

// Handle Chrome DevTools requests and CSP headers
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

  // Generate nonce for inline scripts
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64');
  
  // Continue to the next handler with nonce in locals
  event.locals.nonce = nonce;
  const response = await resolve(event, {
    transformPageChunk: ({ html }) => html.replace('%sveltekit.nonce%', nonce)
  });
  
  // Add GoGuardian-compatible CSP headers with nonce
  const cspDirectives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'unsafe-eval' 'unsafe-inline' https://*.supabase.co https://*.supabase.io https://cdn.jsdelivr.net https://unpkg.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.io https://images.unsplash.com https://via.placeholder.com",
    "connect-src 'self' https://*.supabase.co https://*.supabase.io wss://*.supabase.co wss://*.supabase.io https://api.github.com",
    "media-src 'self' data: blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ].join('; ');

  // Only set CSP in production to avoid SvelteKit dev conflicts
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Content-Security-Policy', cspDirectives);
  }
  
  // Add other security headers for GoGuardian compatibility
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
};

export const handleError = myErrorHandler;
export const handle = sequence(handleSupabase, handleChromeDevTools);
