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
	console.log('🔥 NEW SERVICE WORKER INSTALLING - v2.0.0 with GET-only caching - FORCED UPDATE');
	event.waitUntil(
		(async () => {
			try {
				const cache = await caches.open(STATIC_CACHE);
				// Cache assets individually to avoid failing if one fails
				await Promise.allSettled(
					CORE_ASSETS.map(async (asset) => {
						try {
							await cache.add(asset);
						} catch (error) {
							console.warn(`Failed to cache ${asset}:`, error);
						}
					})
				);
				console.log('🔥 SERVICE WORKER: Forcing immediate activation');
				await self.skipWaiting();
			} catch (error) {
				console.error('Service worker install failed:', error);
				await self.skipWaiting();
			}
		})()
	);
});

// Activate event - clean up old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
	console.log('🔥 NEW SERVICE WORKER ACTIVATED - Taking control of all clients');
	event.waitUntil(
		(async () => {
			// Delete ALL old caches to force complete refresh
			const cacheNames = await caches.keys();
			await Promise.all(cacheNames.map(name => caches.delete(name)));
			console.log('🔥 SERVICE WORKER: Cleared all caches');
			
			// Take control of all existing clients immediately
			await self.clients.claim();
			console.log('🔥 SERVICE WORKER: Now controlling all clients');
		})()
	);
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event: FetchEvent) => {
	const { request } = event;
	const url = new URL(request.url);
	
	// Skip non-HTTP requests
	if (!url.protocol.startsWith('http')) return;
	
	// Skip Chrome extension requests
	if (url.protocol === 'chrome-extension:') return;
	
	event.respondWith(handleRequest(request));
});

async function handleRequest(request: Request): Promise<Response> {
	const url = new URL(request.url);
	
	// Only cache GET requests - pass through everything else
	if (request.method !== 'GET') {
		console.log(`🔥 SERVICE WORKER: Passing through ${request.method} request to ${url.pathname}`);
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