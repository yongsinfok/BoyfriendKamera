import { getAnalyticsManager } from './analytics';

/**
 * Offline mode and data persistence system
 * Enables app functionality without network connection
 */

export interface OfflineData {
	timestamp: number;
	type: string;
	data: any;
}

export interface SyncOperation {
	id: string;
	type: 'upload' | 'download' | 'delete';
	data: any;
	status: 'pending' | 'syncing' | 'completed' | 'failed';
	attempts: number;
	lastAttempt?: number;
	error?: string;
}

export interface CacheEntry {
	key: string;
	value: any;
	timestamp: number;
	expiresAt?: number;
	size: number;
}

export interface StorageUsage {
	used: number;
	max: number;
	percentage: number;
	breakdown: Record<string, number>;
}

// Offline manager configuration
interface OfflineConfig {
	maxCacheSize: number; // bytes
	maxOfflineData: number; // bytes
	syncRetryInterval: number; // ms
	syncRetryAttempts: number
}

const DEFAULT_CONFIG: OfflineConfig = {
	maxCacheSize: 50 * 1024 * 1024, // 50MB
	maxOfflineData: 100 * 1024 * 1024, // 100MB
	syncRetryInterval: 30000, // 30 seconds
	syncRetryAttempts: 3
};

// Offline manager
export class OfflineManager {
	private isOnline = $state(true);
	private config: OfflineConfig;
	private cache: Map<string, CacheEntry> = new Map();
	private offlineQueue: OfflineData[] = [];
	private syncOperations: Map<string, SyncOperation> = new Map();
	private syncInterval: ReturnType<typeof setInterval> | null = null;

	constructor(config: Partial<OfflineConfig> = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };

		if (typeof window !== 'undefined') {
			this.initialize();
		}
	}

	// Initialize offline manager
	private initialize(): void {
		// Load cached data
		this.loadCache();

		// Load offline queue
		this.loadOfflineQueue();

		// Load sync operations
		this.loadSyncOperations();

		// Setup network listeners
		window.addEventListener('online', this.handleOnline);
		window.addEventListener('offline', this.handleOffline);

		// Check initial status
		this.updateOnlineStatus();
	}

	// Handle online event
	private handleOnline = (): void => {
		this.isOnline = true;
		console.log('App is online');

		// Start syncing
		this.startSync();

		// Track event
		const analytics = getAnalyticsManager();
		analytics.trackEvent('connection_restored', {
			pendingOperations: this.offlineQueue.length
		});
	};

	// Handle offline event
	private handleOffline = (): void => {
		this.isOnline = false;
		console.log('App is offline');

		// Stop syncing
		this.stopSync();

		// Track event
		const analytics = getAnalyticsManager();
		analytics.trackEvent('connection_lost', {});
	};

	// Update online status
	private updateOnlineStatus(): void {
		this.isOnline = navigator.onLine;
	}

	// Get current online status
	getOnlineStatus(): boolean {
		return this.isOnline;
	}

	// Cache data for offline use
	async cacheData(key: string, value: any, ttl?: number): Promise<boolean> {
		try {
			const now = Date.now();
			const serialized = JSON.stringify(value);
			const size = new Blob([serialized]).size;

			// Check cache size limit
			if (this.getCacheSize() + size > this.config.maxCacheSize) {
				this.evictOldEntries(size);
			}

			const entry: CacheEntry = {
				key,
				value,
				timestamp: now,
				expiresAt: ttl ? now + ttl : undefined,
				size
			};

			this.cache.set(key, entry);
			this.saveCache();

			return true;
		} catch (error) {
			console.error('Failed to cache data:', error);
			return false;
		}
	}

	// Get cached data
	getCachedData(key: string): any | null {
		const entry = this.cache.get(key);

		if (!entry) {
			return null;
		}

		// Check expiration
		if (entry.expiresAt && Date.now() > entry.expiresAt) {
			this.cache.delete(key);
			this.saveCache();
			return null;
		}

		return entry.value;
	}

	// Remove cached data
	removeCachedData(key: string): void {
		this.cache.delete(key);
		this.saveCache();
	}

	// Clear all cache
	clearCache(): void {
		this.cache.clear();
		this.saveCache();
	}

	// Get cache size
	getCacheSize(): number {
		let size = 0;
		this.cache.forEach(entry => {
			size += entry.size;
		});
		return size;
	}

	// Evict old entries to free space
	private evictOldEntries(requiredSpace: number): void {
		const entries = Array.from(this.cache.entries())
			.sort((a, b) => a[1].timestamp - b[1].timestamp);

		let freedSpace = 0;
		for (const [key, entry] of entries) {
			if (freedSpace >= requiredSpace) break;

			this.cache.delete(key);
			freedSpace += entry.size;
		}

		this.saveCache();
	}

	// Add data to offline queue
	addToOfflineQueue(type: string, data: any): void {
		const offlineData: OfflineData = {
			timestamp: Date.now(),
			type,
			data
		};

		this.offlineQueue.push(offlineData);
		this.saveOfflineQueue();
	}

	// Process offline queue
	async processOfflineQueue(): Promise<void> {
		if (!this.isOnline || this.offlineQueue.length === 0) {
			return;
		}

		const analytics = getAnalyticsManager();

		for (const item of this.offlineQueue) {
			try {
				await this.syncOfflineItem(item);

				// Remove from queue on success
				this.offlineQueue = this.offlineQueue.filter(i => i !== item);

				analytics.trackEvent('offline_item_synced', {
					type: item.type
				});
			} catch (error) {
				console.error('Failed to sync offline item:', error);

				analytics.trackEvent('offline_item_failed', {
					type: item.type,
					error: String(error)
				});
			}
		}

		this.saveOfflineQueue();
	}

	// Sync individual offline item
	private async syncOfflineItem(item: OfflineData): Promise<void> {
		// This would integrate with your actual sync logic
		console.log('Syncing offline item:', item.type, item.data);

		// Simulate sync operation
		return new Promise((resolve) => {
			setTimeout(resolve, 100);
		});
	}

	// Create sync operation
	createSyncOperation(type: SyncOperation['type'], data: any): string {
		const id = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		const operation: SyncOperation = {
			id,
			type,
			data,
			status: 'pending',
			attempts: 0
		};

		this.syncOperations.set(id, operation);
		this.saveSyncOperations();

		return id;
	}

	// Execute sync operation
	async executeSyncOperation(id: string): Promise<boolean> {
		const operation = this.syncOperations.get(id);
		if (!operation) {
			return false;
		}

		operation.status = 'syncing';
		operation.attempts++;
		operation.lastAttempt = Date.now();
		this.saveSyncOperations();

		try {
			// Perform the actual sync
			await this.performSync(operation);

			operation.status = 'completed';
			this.saveSyncOperations();

			const analytics = getAnalyticsManager();
			analytics.trackEvent('sync_operation_completed', {
				type: operation.type,
				attempts: operation.attempts
			});

			return true;
		} catch (error) {
			operation.status = 'failed';
			operation.error = String(error);
			this.saveSyncOperations();

			// Retry if under limit
			if (operation.attempts < this.config.syncRetryAttempts) {
				setTimeout(() => {
					this.executeSyncOperation(id);
				}, this.config.syncRetryInterval);
			}

			return false;
		}
	}

	// Perform actual sync operation
	private async performSync(operation: SyncOperation): Promise<void> {
		// This would integrate with your actual sync logic
		console.log('Performing sync:', operation.type, operation.data);

		// Simulate sync operation
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				// Simulate 90% success rate
				if (Math.random() < 0.9) {
					resolve();
				} else {
					reject(new Error('Sync failed'));
				}
			}, 500);
		});
	}

	// Get pending sync operations
	getPendingSyncOperations(): SyncOperation[] {
		return Array.from(this.syncOperations.values()).filter(
			op => op.status === 'pending' || op.status === 'syncing'
		);
	}

	// Start automatic sync
	startSync(): void {
		if (this.syncInterval) {
			return;
		}

		this.syncInterval = setInterval(async () => {
			if (!this.isOnline) return;

			// Process offline queue
			await this.processOfflineQueue();

			// Execute pending sync operations
			const pendingOps = this.getPendingSyncOperations();
			for (const op of pendingOps) {
				if (op.status === 'pending') {
					await this.executeSyncOperation(op.id);
				}
			}
		}, this.config.syncRetryInterval);
	}

	// Stop automatic sync
	stopSync(): void {
		if (this.syncInterval) {
			clearInterval(this.syncInterval);
			this.syncInterval = null;
		}
	}

	// Get storage usage
	getStorageUsage(): StorageUsage {
		let used = 0;
		const breakdown: Record<string, number> = {};

		// Cache usage
		const cacheSize = this.getCacheSize();
		used += cacheSize;
		breakdown.cache = cacheSize;

		// Offline queue size
		const queueSize = new Blob([JSON.stringify(this.offlineQueue)]).size;
		used += queueSize;
		breakdown.offlineQueue = queueSize;

		// Sync operations size
		const syncSize = new Blob([JSON.stringify(Array.from(this.syncOperations.values()))]).size;
		used += syncSize;
		breakdown.syncOperations = syncSize;

		return {
			used,
			max: this.config.maxCacheSize + this.config.maxOfflineData,
			percentage: (used / (this.config.maxCacheSize + this.config.maxOfflineData)) * 100,
			breakdown
		};
	}

	// Save cache to localStorage
	private saveCache(): void {
		if (typeof window === 'undefined') return;

		try {
			const data = Array.from(this.cache.entries());
			localStorage.setItem('offline_cache', JSON.stringify(data));
		} catch (e) {
			console.error('Failed to save cache:', e);
		}
	}

	// Load cache from localStorage
	private loadCache(): void {
		if (typeof window === 'undefined') return;

		try {
			const stored = localStorage.getItem('offline_cache');
			if (stored) {
				const data = JSON.parse(stored);
				this.cache = new Map(data);

				// Remove expired entries
				const now = Date.now();
				this.cache.forEach((entry, key) => {
					if (entry.expiresAt && now > entry.expiresAt) {
						this.cache.delete(key);
					}
				});
			}
		} catch (e) {
			console.error('Failed to load cache:', e);
		}
	}

	// Save offline queue to localStorage
	private saveOfflineQueue(): void {
		if (typeof window === 'undefined') return;

		try {
			localStorage.setItem('offline_queue', JSON.stringify(this.offlineQueue));
		} catch (e) {
			console.error('Failed to save offline queue:', e);
		}
	}

	// Load offline queue from localStorage
	private loadOfflineQueue(): void {
		if (typeof window === 'undefined') return;

		try {
			const stored = localStorage.getItem('offline_queue');
			if (stored) {
				this.offlineQueue = JSON.parse(stored);
			}
		} catch (e) {
			console.error('Failed to load offline queue:', e);
		}
	}

	// Save sync operations to localStorage
	private saveSyncOperations(): void {
		if (typeof window === 'undefined') return;

		try {
			const data = Array.from(this.syncOperations.entries());
			localStorage.setItem('sync_operations', JSON.stringify(data));
		} catch (e) {
			console.error('Failed to save sync operations:', e);
		}
	}

	// Load sync operations from localStorage
	private loadSyncOperations(): void {
		if (typeof window === 'undefined') return;

		try {
			const stored = localStorage.getItem('sync_operations');
			if (stored) {
				const data = JSON.parse(stored);
				this.syncOperations = new Map(data);
			}
		} catch (e) {
			console.error('Failed to load sync operations:', e);
		}
	}

	// Clear all offline data
	clearAllOfflineData(): void {
		this.cache.clear();
		this.offlineQueue = [];
		this.syncOperations.clear();

		if (typeof window !== 'undefined') {
			localStorage.removeItem('offline_cache');
			localStorage.removeItem('offline_queue');
			localStorage.removeItem('sync_operations');
		}
	}

	// Destroy
	destroy(): void {
		this.stopSync();

		if (typeof window !== 'undefined') {
			window.removeEventListener('online', this.handleOnline);
			window.removeEventListener('offline', this.handleOffline);
		}
	}
}

// Global offline manager instance
let globalOfflineManager: OfflineManager | null = null;

export function getOfflineManager(): OfflineManager {
	if (!globalOfflineManager) {
		globalOfflineManager = new OfflineManager();
	}
	return globalOfflineManager;
}
