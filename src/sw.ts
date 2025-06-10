/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';

declare let self: ServiceWorkerGlobalScope;

// Define proper SyncEvent interface
interface SyncEvent extends ExtendableEvent {
  readonly tag: string;
  readonly lastChance: boolean;
}

// Precache app shell files
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Cache Supabase API calls with NetworkFirst strategy
registerRoute(
  ({ url }) => url.hostname.includes('supabase.co'),
  new NetworkFirst({
    cacheName: 'supabase-api',
    networkTimeoutSeconds: 3,
    plugins: [
      {
        cacheKeyWillBeUsed: async ({ request }) => {
          // Remove auth headers from cache key to avoid cache misses
          const url = new URL(request.url);
          return url.href;
        }
      }
    ]
  })
);

// Cache static assets with CacheFirst strategy
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      {
        cacheKeyWillBeUsed: async ({ request }) => {
          const url = new URL(request.url);
          // Remove query parameters for better cache hit rates
          url.search = '';
          return url.href;
        }
      }
    ]
  })
);

// Cache CSS and JS files with StaleWhileRevalidate
registerRoute(
  ({ request }) => 
    request.destination === 'style' || 
    request.destination === 'script',
  new StaleWhileRevalidate({
    cacheName: 'static-resources'
  })
);

// Handle navigation requests with network first, fallback to cache
const navigationRoute = new NavigationRoute(
  new NetworkFirst({
    cacheName: 'pages',
    networkTimeoutSeconds: 3
  })
);
registerRoute(navigationRoute);

// Handle background sync for offline actions
self.addEventListener('sync', (event: Event) => {
  // Cast to SyncEvent for type safety after checking for the properties
  const syncEvent = event as SyncEvent;
  if ('tag' in syncEvent && syncEvent.tag === 'background-sync') {
    // Handle offline actions when back online
    console.log('Background sync triggered');
  }
});

// Handle push notifications (if needed for educational notifications)
self.addEventListener('push', (event) => {
  if (event.data) {
    const options = {
      body: event.data.text(),
      icon: '/favicon.png',
      badge: '/favicon.png',
      vibrate: [200, 100, 200],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      },
      actions: [
        {
          action: 'explore',
          title: 'View Details',
          icon: '/favicon.png'
        },
        {
          action: 'close',
          title: 'Close',
          icon: '/favicon.png'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification('Teacher Dashboard', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    // Open the app to a specific page
    event.waitUntil(
      self.clients.openWindow('/dashboard')
    );
  }
});