import { writable, derived } from 'svelte/store';
import { sessionService, photoService } from '$lib/services/db';
import type { Session, Photo, AISuggestion } from '$lib/types';

// Camera state
export const isCameraActive = writable(false);
export const cameraError = writable<string | null>(null);

// AI suggestion state
export const aiSuggestion = writable<AISuggestion | null>(null);
export const isAnalyzing = writable(false);

// Current session state
export const currentSession = writable<Session | null>(null);
export const currentPhotoCount = derived(currentSession, ($session) => $session?.photos.length || 0);

// Create a new session
export async function createSession(styleId: string | null = null) {
	const session: Omit<Session, 'id'> = {
		styleId,
		startedAt: new Date(),
		completedAt: null,
		photos: [],
		aiSelection: null,
		userFeedback: null
	};

	const id = await sessionService.create(session);
	const newSession = await sessionService.get(id);

	if (newSession) {
		currentSession.set(newSession);
		return newSession;
	}
}

// Add photo to current session
export async function addPhotoToSession(blob: Blob) {
	const session = get(currentSession);
	if (!session) return;

	const photoId = await photoService.add({
		sessionId: session.id,
		blob
	});

	// Update session
	const updatedSession = {
		...session,
		photos: [...session.photos, {
			id: photoId,
			sessionId: session.id,
			blob,
			createdAt: new Date()
		}]
	};

	await sessionService.update(session.id, updatedSession);
	currentSession.set(updatedSession);
}

// Complete current session
export async function completeSession() {
	const session = get(currentSession);
	if (!session) return;

	const updatedSession = {
		...session,
		completedAt: new Date()
	};

	await sessionService.update(session.id, updatedSession);
	currentSession.set(updatedSession);
	return updatedSession;
}

// Helper to get store value
function get<T>(store: { subscribe: (fn: (value: T) => void) => () => void }): T | undefined {
	let value: T | undefined;
	const unsubscribe = store.subscribe((v) => (value = v));
	unsubscribe();
	return value;
}

// Re-export get for use in other modules
export { get as getStoreValue };
