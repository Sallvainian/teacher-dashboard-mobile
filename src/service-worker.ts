/**
 * @ai-context SERVICE_WORKER - Progressive Web App service worker
 * @ai-dependencies None (runs independently)
 * @ai-sideEffects Caches resources, enables offline functionality
 * @ai-exports Self-installing service worker
 */

import { version } from '$lib/version';

const CACHE_NAME = `teacher-dashboard-v${version}`;
const STATIC_CACHE = `${CACHE_NAME}-static`;
const DYNAMIC_CACHE = `${CACHE_NAME}-dynamic`;

// Core app shell files to cache immediately - only cache root and favicon
const CORE_ASSETS = [
	'/',
	'/favicon.png'
];

// API endpoints to cache with network-first strategy
const API_ROUTES = [
	'/api/students',
	'/api/grades', 
	'/api/assignments',
	'/api/categories'
];

// Install event - cache core assets
self.addEventListener('install', (event: ExtendableEvent) => {
	console.log('Service worker installing - v1.1.0 - NO CACHING');
	// Skip all caching to avoid errors - just take control immediately
	event.waitUntil(self.skipWaiting());
});

// Activate event - clean up old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
	event.waitUntil(
		(async () => {
			const cacheNames = await caches.keys();
			const oldCaches = cacheNames.filter(
				name => name.startsWith('teacher-dashboard-') && name !== CACHE_NAME
			);
			
			await Promise.all(
				oldCaches.map(name => caches.delete(name))
			);
			
			await self.clients.claim();
		})()
	);
});

// Fetch event - DISABLED temporarily to fix caching errors
self.addEventListener('fetch', (event: FetchEvent) => {
	// Just pass through all requests without caching
	// This prevents any cache-related errors
	return;
});

async function handleRequest(request: Request): Promise<Response> {
	const url = new URL(request.url);
	
	// Only cache GET requests - pass through everything else
	if (request.method !== 'GET') {
		return fetch(request);
	}
	
	// API requests - Network first, cache fallback
	if (API_ROUTES.some(route => url.pathname.startsWith(route))) {
		return networkFirst(request, DYNAMIC_CACHE);
	}
	
	// Static assets - Cache first, network fallback
	if (url.pathname.includes('/_app/') || url.pathname.includes('/assets/')) {
		return cacheFirst(request, STATIC_CACHE);
	}
	
	// Navigation requests - Network first, cache fallback
	if (request.mode === 'navigate') {
		return networkFirst(request, DYNAMIC_CACHE);
	}
	
	// Default - Network first
	return networkFirst(request, DYNAMIC_CACHE);
}

// Cache-first strategy for static assets
async function cacheFirst(request: Request, cacheName: string): Promise<Response> {
	const cached = await caches.match(request);
	if (cached) return cached;
	
	try {
		const response = await fetch(request);
		if (response.ok && request.method === 'GET') {
			const cache = await caches.open(cacheName);
			cache.put(request, response.clone());
		}
		return response;
	} catch {
		return new Response('Network error', { 
			status: 408,
			statusText: 'Request Timeout'
		});
	}
}

// Network-first strategy for dynamic content
async function networkFirst(request: Request, cacheName: string): Promise<Response> {
	try {
		const response = await fetch(request);
		if (response.ok && request.method === 'GET') {
			const cache = await caches.open(cacheName);
			cache.put(request, response.clone());
		}
		return response;
	} catch {
		const cached = await caches.match(request);
		if (cached) return cached;
		
		return new Response('Offline', { 
			status: 503,
			statusText: 'Service Unavailable'
		});
	}
}