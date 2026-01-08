/// <reference types="@sveltejs/kit" />
import { build, files, version } from '$service-worker';

// Create a unique cache name for this deployment
const CACHE_NAME = `boyfriend-camera-cache-${version}`;

const ASSETS = [
	...build, // the app itself
	...files  // favicon, manifest, etc.
];

// Install event - cache assets (don't activate yet)
self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
	);
	// Don't call skipWaiting() here - wait for user confirmation
});

// Activate event - clean up old caches and claim all clients
self.addEventListener('activate', (event) => {
	// Take control of all pages immediately
	self.clients.claim();

	event.waitUntil(
		caches.keys().then(async (keys) => {
			for (const key of keys) {
				if (key !== CACHE_NAME) {
					await caches.delete(key);
				}
			}
		})
	);
});

// Handle skip waiting message from client
self.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'SKIP_WAITING') {
		self.skipWaiting();
	}
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
	// Skip cross-origin requests
	if (!event.request.url.startsWith('http')) {
		return;
	}

	event.respondWith(
		caches.match(event.request).then((cached) => {
			return cached ?? fetch(event.request);
		})
	);
});
