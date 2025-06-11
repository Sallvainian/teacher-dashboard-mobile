import { sequence } from "@sveltejs/kit/hooks";
import type { Handle } from '@sveltejs/kit';


// Simple error handler without Sentry for now
const myErrorHandler = ({ error, event }: { error: unknown; event: import('@sveltejs/kit').RequestEvent }) => {
  console.error("An error occurred on the server side:", error, event);
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
export const handle = sequence(handleChromeDevTools);
