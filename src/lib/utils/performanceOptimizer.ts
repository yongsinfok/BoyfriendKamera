/**
 * Performance optimization utilities for pose detection and AI analysis
 */

// Performance configuration
export const PERF_CONFIG = {
	// AI request throttling
	minAnalysisInterval: 500, // Minimum ms between AI requests
	debounceDelay: 200, // Debounce delay for rapid changes

	// Caching
	cacheEnabled: true,
	cacheMaxAge: 1000, // Max age of cached results in ms
	cacheMaxSize: 10, // Maximum number of cached results

	// Frame processing
	frameSkipRate: 2, // Process every Nth frame for performance
	maxConcurrentRequests: 1, // Maximum simultaneous AI requests

	// Quality settings
	lowQualityThreshold: 30, // FPS below this triggers quality reduction
	analysisResolution: 0.5, // Scale factor for analysis (0.5 = half resolution)
};

// Simple in-memory cache
class AnalysisCache {
	private cache: Map<string, { data: any; timestamp: number }>;
	private maxSize: number;

	constructor(maxSize: number = PERF_CONFIG.cacheMaxSize) {
		this.cache = new Map();
		this.maxSize = maxSize;
	}

	set(key: string, data: any): void {
		// Remove oldest entry if cache is full
		if (this.cache.size >= this.maxSize) {
			const oldestKey = this.cache.keys().next().value;
			this.cache.delete(oldestKey);
		}
		this.cache.set(key, { data, timestamp: Date.now() });
	}

	get(key: string): any | null {
		const entry = this.cache.get(key);
		if (!entry) return null;

		// Check if entry has expired
		if (Date.now() - entry.timestamp > PERF_CONFIG.cacheMaxAge) {
			this.cache.delete(key);
			return null;
		}

		return entry.data;
	}

	clear(): void {
		this.cache.clear();
	}

	get size(): number {
		return this.cache.size;
	}
}

// Request queue to prevent overwhelming the API
class RequestQueue {
	private queue: Array<() => Promise<any>> = [];
	private processing = false;
	private concurrency = 0;
	private maxConcurrency: number;

	constructor(maxConcurrency: number = PERF_CONFIG.maxConcurrentRequests) {
		this.maxConcurrency = maxConcurrency;
	}

	async add<T>(request: () => Promise<T>): Promise<T> {
		return new Promise((resolve, reject) => {
			this.queue.push(async () => {
				try {
					const result = await request();
					resolve(result);
				} catch (error) {
					reject(error);
				}
			});
			this.process();
		});
	}

	private async process(): Promise<void> {
		if (this.processing || this.concurrency >= this.maxConcurrency || this.queue.length === 0) {
			return;
		}

		this.processing = true;
		const request = this.queue.shift();

		if (request) {
			this.concurrency++;
			try {
				await request();
			} finally {
				this.concurrency--;
				this.processing = false;
				// Process next item in queue
				this.process();
			}
		} else {
			this.processing = false;
		}
	}
}

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(
	func: T,
	delay: number
): (...args: Parameters<T>) => void {
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	return function (this: any, ...args: Parameters<T>) {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}

		timeoutId = setTimeout(() => {
			func.apply(this, args);
			timeoutId = null;
		}, delay);
	};
}

// Throttle utility
export function throttle<T extends (...args: any[]) => any>(
	func: T,
	delay: number
): (...args: Parameters<T>) => void {
	let lastCall = 0;
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	return function (this: any, ...args: Parameters<T>) {
		const now = Date.now();
		const timeSinceLastCall = now - lastCall;

		if (timeSinceLastCall >= delay) {
			lastCall = now;
			func.apply(this, args);
		} else {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}

			const remainingDelay = delay - timeSinceLastCall;
			timeoutId = setTimeout(() => {
				lastCall = Date.now();
				func.apply(this, args);
				timeoutId = null;
			}, remainingDelay);
		}
	};
}

// Performance monitor
export class PerformanceMonitor {
	private metrics: Map<string, number[]> = new Map();

	record(operation: string, duration: number): void {
		if (!this.metrics.has(operation)) {
			this.metrics.set(operation, []);
		}
		this.metrics.get(operation)!.push(duration);

		// Keep only last 100 measurements
		const measurements = this.metrics.get(operation)!;
		if (measurements.length > 100) {
			measurements.shift();
		}
	}

	getStats(operation: string): { avg: number; min: number; max: number; count: number } | null {
		const measurements = this.metrics.get(operation);
		if (!measurements || measurements.length === 0) return null;

		return {
			avg: measurements.reduce((a, b) => a + b, 0) / measurements.length,
			min: Math.min(...measurements),
			max: Math.max(...measurements),
			count: measurements.length
		};
	}

	getAllStats(): Record<string, { avg: number; min: number; max: number; count: number }> {
		const stats: Record<string, { avg: number; min: number; max: number; count: number }> = {};

		for (const [operation, _] of this.metrics) {
			const operationStats = this.getStats(operation);
			if (operationStats) {
				stats[operation] = operationStats;
			}
		}

		return stats;
	}

	clear(): void {
		this.metrics.clear();
	}
}

// Frame rate monitor
export class FrameRateMonitor {
	private frames: number[] = [];
	private lastTime = performance.now();
	private rafId: number | null = null;

	start(): void {
		this.lastTime = performance.now();
		this.frames = [];
		this.tick();
	}

	private tick = (): void => {
		const now = performance.now();
		this.frames.push(now);

		// Keep only last second of frames
		const oneSecondAgo = now - 1000;
		this.frames = this.frames.filter((t) => t > oneSecondAgo);

		this.rafId = requestAnimationFrame(this.tick);
	}

	stop(): void {
		if (this.rafId !== null) {
			cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}
	}

	getFPS(): number {
		return this.frames.length;
	}

	isLowPerformance(): boolean {
		return this.getFPS() < PERF_CONFIG.lowQualityThreshold;
	}

	getRecommendedQuality(): number {
		const fps = this.getFPS();
		if (fps >= 50) return 1.0; // Full quality
		if (fps >= 30) return 0.75; // 3/4 quality
		if (fps >= 20) return 0.5; // Half quality
		return 0.25; // Quarter quality
	}
}

// Image optimization for analysis
export function optimizeImageForAnalysis(
	canvas: HTMLCanvasElement,
	quality: number = PERF_CONFIG.analysisResolution
): string {
	const width = Math.floor(canvas.width * quality);
	const height = Math.floor(canvas.height * quality);

	const tempCanvas = document.createElement('canvas');
	tempCanvas.width = width;
	tempCanvas.height = height;

	const ctx = tempCanvas.getContext('2d');
	if (!ctx) throw new Error('Failed to get canvas context');

	ctx.drawImage(canvas, 0, 0, width, height);

	// Use lower quality JPEG for faster upload
	return tempCanvas.toDataURL('image/jpeg', 0.7);
}

// Generate cache key from pose data
export function generatePoseCacheKey(pose: any, style?: string): string {
	const poseString = JSON.stringify(pose);
	const styleString = style || '';
	return `${poseString}-${styleString}`;
}

// Create singleton instances
export const analysisCache = new AnalysisCache();
export const requestQueue = new RequestQueue();
export const performanceMonitor = new PerformanceMonitor();
export const frameRateMonitor = new FrameRateMonitor();
