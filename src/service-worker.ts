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

// Core app shell files to cache immediately
const CORE_ASSETS = [
	'/',
	'/app.html',
	'/favicon.png',
	'/_app/immutable/entry/start.js',
	'/_app/immutable/entry/app.js'
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
	event.waitUntil(
		(async () => {
			const cache = await caches.open(STATIC_CACHE);
			await cache.addAll(CORE_ASSETS);
			await self.skipWaiting();
		})()
	);
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
		if (response.ok) {
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
		if (response.ok) {
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