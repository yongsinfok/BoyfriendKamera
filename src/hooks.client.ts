import type { HandleClientError } from '@sveltejs/kit';

// Track if an update is pending
let updatePending = false;

// PWA Service Worker registration with auto-update detection
if ('serviceWorker' in navigator) {
	navigator.serviceWorker.register('/service-worker.js', {
		type: 'classic'
	}).then((registration) => {
		console.log('SW registered:', registration);

		// Check for updates every hour
		setInterval(() => {
			registration.update();
		}, 60 * 60 * 1000);

		// Listen for waiting service worker (new version available)
		registration.addEventListener('updatefound', () => {
			const newWorker = registration.installing;
			if (newWorker) {
				newWorker.addEventListener('statechange', () => {
					if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
						// New version is available and waiting
						console.log('New content is available; please refresh.');
						updatePending = true;
						// Dispatch custom event for app components to listen
						window.dispatchEvent(new CustomEvent('sw-update-available'));
					}
				});
			}
		});

		// Check if there's already a waiting service worker
		if (registration.waiting) {
			updatePending = true;
			window.dispatchEvent(new CustomEvent('sw-update-available'));
		}
	}).catch((error) => {
		console.error('SW registration failed:', error);
	});

	// Listen for controller change - service worker has taken control
	navigator.serviceWorker.addEventListener('controllerchange', () => {
		console.log('Service worker controller changed - new version activated');
		// Reload the page to get the new version
		window.location.reload();
	});
}

// Function to manually check for updates
export function checkForUpdates() {
	if ('serviceWorker' in navigator) {
		navigator.serviceWorker.getRegistration().then((registration) => {
			registration?.update();
		});
	}
}

// Function to activate the waiting service worker (reload the page)
export function activateUpdate() {
	if ('serviceWorker' in navigator) {
		navigator.serviceWorker.getRegistration().then((registration) => {
			if (registration?.waiting) {
				registration.waiting.postMessage({ type: 'SKIP_WAITING' });
			}
		});
	}
}

// Check if update is pending
export function isUpdatePending(): boolean {
	return updatePending;
}

// Handle PWA install prompt
let deferredPrompt: Event | null = null;

window.addEventListener('beforeinstallprompt', (e) => {
	e.preventDefault();
	deferredPrompt = e;
});

export function showInstallPrompt() {
	if (deferredPrompt) {
		(deferredPrompt as any).prompt();
		(deferredPrompt as any).userChoice.then((choiceResult: any) => {
			deferredPrompt = null;
		});
	}
}

// SvelteKit client hooks
export const handleError: HandleClientError = ({ error, event }) => {
	console.error('Client error:', error, event);
};

// Initialize function (optional, can be used for setup)
export function init() {
	// Any initialization code
	console.log('App initialized');
}
