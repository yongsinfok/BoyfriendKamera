/**
 * Advanced camera controls
 * Timer, burst mode, HDR, and other advanced camera features
 */

export interface TimerConfig {
	enabled: boolean;
	delay: number; // seconds
	onTick?: (remaining: number) => void;
	onComplete?: () => void;
}

export interface BurstConfig {
	enabled: boolean;
	count: number; // number of photos
	interval: number; // milliseconds between shots
	onProgress?: (taken: number, total: number) => void;
	onComplete?: (photos: string[]) => void;
}

export interface HDRConfig {
	enabled: boolean;
	exposures: number[]; // exposure compensation values
	mergeStrategy: 'auto' | 'average' | 'smart';
}

export interface PhotoCaptureOptions {
	timer?: TimerConfig;
	burst?: BurstConfig;
	hdr?: HDRConfig;
	flash?: 'off' | 'on' | 'auto';
	quality?: 'low' | 'medium' | 'high';
	format?: 'jpeg' | 'png' | 'webp';
}

export interface CapturedPhoto {
	id: string;
	blob: Blob;
	url: string;
	timestamp: number;
	metadata: PhotoMetadata;
}

export interface PhotoMetadata {
	width: number;
	height: number;
	exposure?: number;
	iso?: number;
	flash?: string;
	hdr?: boolean;
	burstIndex?: number;
	timerDelay?: number;
}

// Camera controls manager
export class CameraControlsManager {
	private isCapturing = $state(false);
	private currentBurstPhotos: CapturedPhoto[] = [];
	private timerInterval: ReturnType<typeof setInterval> | null = null;
	private burstTimeout: ReturnType<typeof setTimeout> | null = null;

	// Timer countdown
	async startTimer(config: TimerConfig, captureFn: () => Promise<CapturedPhoto>): Promise<CapturedPhoto> {
		if (!config.enabled || config.delay <= 0) {
			return captureFn();
		}

		this.isCapturing = true;
		let remaining = config.delay;

		// Initial tick
		config.onTick?.(remaining);

		return new Promise((resolve, reject) => {
			this.timerInterval = setInterval(() => {
				remaining--;

				if (remaining > 0) {
					config.onTick?.(remaining);
				} else {
					// Timer complete
					if (this.timerInterval) {
						clearInterval(this.timerInterval);
						this.timerInterval = null;
					}

					this.isCapturing = false;
					config.onComplete?.();

					// Capture photo
					captureFn()
						.then(resolve)
						.catch(reject);
				}
			}, 1000);
		});
	}

	// Cancel timer
	cancelTimer(): void {
		if (this.timerInterval) {
			clearInterval(this.timerInterval);
			this.timerInterval = null;
		}
		this.isCapturing = false;
	}

	// Burst mode capture
	async startBurst(
		config: BurstConfig,
		captureFn: () => Promise<CapturedPhoto>
	): Promise<CapturedPhoto[]> {
		if (!config.enabled || config.count <= 1) {
			const photo = await captureFn();
			return [photo];
		}

		this.isCapturing = true;
		this.currentBurstPhotos = [];

		const photos: CapturedPhoto[] = [];
		let taken = 0;

		// Initial progress
		config.onProgress?.(taken, config.count);

		// Capture photos at intervals
		for (let i = 0; i < config.count; i++) {
			try {
				const photo = await captureFn();

				// Add burst index to metadata
				photo.metadata.burstIndex = i;
				photos.push(photo);
				this.currentBurstPhotos = photos;

				taken++;
				config.onProgress?.(taken, config.count);

				// Wait before next shot (except for last one)
				if (i < config.count - 1) {
					await this.delay(config.interval);
				}
			} catch (error) {
				console.error(`Burst photo ${i + 1} failed:`, error);
			}
		}

		this.isCapturing = false;
		config.onComplete?.(photos);

		return photos;
	}

	// Cancel burst mode
	cancelBurst(): void {
		this.isCapturing = false;
		this.currentBurstPhotos = [];

		if (this.burstTimeout) {
			clearTimeout(this.burstTimeout);
			this.burstTimeout = null;
		}
	}

	// HDR capture
	async captureHDR(
		config: HDRConfig,
		captureFn: (exposure?: number) => Promise<CapturedPhoto>
	): Promise<CapturedPhoto[]> {
		if (!config.enabled || config.exposures.length === 0) {
			const photo = await captureFn();
			return [photo];
		}

		this.isCapturing = true;
		const photos: CapturedPhoto[] = [];

		// Capture at different exposure levels
		for (const exposure of config.exposures) {
			try {
				const photo = await captureFn(exposure);
				photo.metadata.hdr = true;
				photos.push(photo);
			} catch (error) {
				console.error(`HDR capture at ${exposure}EV failed:`, error);
			}
		}

		this.isCapturing = false;

		// Merge HDR photos if needed
		if (photos.length > 1 && config.mergeStrategy !== 'auto') {
			return this.mergeHDRPhotos(photos, config.mergeStrategy);
		}

		return photos;
	}

	// Merge HDR photos
	private async mergeHDRPhotos(
		photos: CapturedPhoto[],
		strategy: 'average' | 'smart'
	): Promise<CapturedPhoto[]> {
		// This is a simplified implementation
		// Real HDR merging would require image processing libraries

		if (strategy === 'average') {
			// Return middle exposure as representative
			const middleIndex = Math.floor(photos.length / 2);
			return [photos[middleIndex]];
		}

		// Smart strategy would analyze and merge
		// For now, return all photos for manual selection
		return photos;
	}

	// Full photo capture with all options
	async capturePhoto(
		captureFn: () => Promise<CapturedPhoto>,
		options?: PhotoCaptureOptions
	): Promise<CapturedPhoto | CapturedPhoto[]> {
		// Apply timer if specified
		if (options?.timer?.enabled) {
			const timerResult = await this.startTimer(options.timer, captureFn);

			// Apply burst if specified
			if (options?.burst?.enabled && options.burst.count > 1) {
				return await this.startBurst(options.burst, async () => {
					const photo = await captureFn();
					// Apply timer metadata
					photo.metadata.timerDelay = options.timer?.delay;
					return photo;
				});
			}

			// Apply HDR if specified
			if (options?.hdr?.enabled) {
				return await this.captureHDR(options.hdr, async (exposure) => {
					const photo = await captureFn();
					photo.metadata.timerDelay = options.timer?.delay;
					return photo;
				});
			}

			return timerResult;
		}

		// Apply burst if specified (no timer)
		if (options?.burst?.enabled && options.burst.count > 1) {
			return await this.startBurst(options.burst, captureFn);
		}

		// Apply HDR if specified (no timer, no burst)
		if (options?.hdr?.enabled) {
			return await this.captureHDR(options.hdr, captureFn);
		}

		// Simple capture
		return captureFn();
	}

	// Check if currently capturing
	isCurrentlyCapturing(): boolean {
		return this.isCapturing;
	}

	// Get current burst progress
	getBurstProgress(): { taken: number; total: number } {
		return {
			taken: this.currentBurstPhotos.length,
			total: 0 // Would be set by burst config
		};
	}

	// Get current burst photos
	getCurrentBurstPhotos(): CapturedPhoto[] {
		return [...this.currentBurstPhotos];
	}

	// Delay helper
	private delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	// Preset configurations
	static readonly PRESETS = {
		// Timer presets
		TIMER_3S: { enabled: true, delay: 3 },
		TIMER_5S: { enabled: true, delay: 5 },
		TIMER_10S: { enabled: true, delay: 10 },

		// Burst presets
		BURST_3: { enabled: true, count: 3, interval: 500 },
		BURST_5: { enabled: true, count: 5, interval: 300 },
		BURST_10: { enabled: true, count: 10, interval: 200 },

		// HDR presets
		HDR_AUTO: {
			enabled: true,
			exposures: [-2, 0, 2],
			mergeStrategy: 'auto' as const
		},
		HDR_EXTENDED: {
			enabled: true,
			exposures: [-3, -2, -1, 0, 1, 2, 3],
			mergeStrategy: 'smart' as const
		},

		// Combined presets
		SELFIE_TIMER: {
			timer: { enabled: true, delay: 5 },
			flash: 'auto' as const,
			quality: 'high' as const
		},
		ACTION_BURST: {
			burst: { enabled: true, count: 10, interval: 100 },
			quality: 'medium' as const
		},
		LANDSCAPE_HDR: {
			hdr: {
				enabled: true,
				exposures: [-2, 0, 2],
				mergeStrategy: 'smart' as const
			},
			quality: 'high' as const
		},
		GROUP_PHOTO: {
			timer: { enabled: true, delay: 10 },
			burst: { enabled: true, count: 3, interval: 1000 },
			flash: 'auto' as const,
			quality: 'high' as const
		}
	};
}

// Global camera controls manager instance
let globalCameraControls: CameraControlsManager | null = null;

export function getCameraControlsManager(): CameraControlsManager {
	if (!globalCameraControls) {
		globalCameraControls = new CameraControlsManager();
	}
	return globalCameraControls;
}
