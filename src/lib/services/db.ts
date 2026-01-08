import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { Photo, Session, AppSettings } from '$lib/types';

// Database name and version
const DB_NAME = 'BoyfriendCameraDB';
const DB_VERSION = 1;

export class BoyfriendCameraDB extends Dexie {
	sessions!: Table<Session>;
	photos!: Table<Photo>;
	settings!: Table<AppSettings & { key: string }>;

	constructor() {
		super(DB_NAME);
		this.version(DB_VERSION).stores({
			sessions: 'id, startedAt, completedAt',
			photos: 'id, sessionId, createdAt',
			settings: 'key' // Using key-value pattern for settings
		});
	}
}

export const db = new BoyfriendCameraDB();

// Settings service
const SETTINGS_KEY = 'app-settings';

export const settingsService = {
	async get(): Promise<AppSettings | undefined> {
		const record = await db.settings.get(SETTINGS_KEY);
		if (record) {
			const { key, ...settings } = record;
			return settings;
		}
		return undefined;
	},

	async set(settings: AppSettings): Promise<void> {
		await db.settings.put({ key: SETTINGS_KEY, ...settings });
	},

	async update(partial: Partial<AppSettings>): Promise<void> {
		const current = await this.get();
		if (current) {
			await this.set({ ...current, ...partial });
		}
	}
};

// Session service
export const sessionService = {
	async create(session: Omit<Session, 'id'>): Promise<string> {
		const id = crypto.randomUUID();
		await db.sessions.add({ ...session, id });
		return id;
	},

	async get(id: string): Promise<Session | undefined> {
		return await db.sessions.get(id);
	},

	async getAll(): Promise<Session[]> {
		return await db.sessions.orderBy('startedAt').reverse().toArray();
	},

	async update(id: string, updates: Partial<Session>): Promise<void> {
		await db.sessions.update(id, updates);
	},

	async delete(id: string): Promise<void> {
		// Delete associated photos
		const photos = await db.photos.where('sessionId').equals(id).toArray();
		for (const photo of photos) {
			await db.photos.delete(photo.id);
		}
		await db.sessions.delete(id);
	}
};

// Photo service
export const photoService = {
	async add(photo: Omit<Photo, 'id' | 'createdAt'>): Promise<string> {
		const id = crypto.randomUUID();
		await db.photos.add({ ...photo, id, createdAt: new Date() });
		return id;
	},

	async get(id: string): Promise<Photo | undefined> {
		return await db.photos.get(id);
	},

	async getBySession(sessionId: string): Promise<Photo[]> {
		return await db.photos.where('sessionId').equals(sessionId).toArray();
	},

	async update(id: string, updates: Partial<Photo>): Promise<void> {
		await db.photos.update(id, updates);
	},

	async delete(id: string): Promise<void> {
		await db.photos.delete(id);
	},

	async clearUnselected(): Promise<void> {
		// Delete photos that are neither AI selected nor user selected
		const photos = await db.photos.toArray();
		for (const photo of photos) {
			if (!photo.isAiSelected && !photo.isUserSelected) {
				await this.delete(photo.id);
			}
		}
	}
};
