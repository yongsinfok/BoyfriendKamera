/**
 * Photo editing and filter system
 * Real-time photo adjustments and filters
 */

export interface FilterPreset {
	id: string;
	name: string;
	description: string;
	thumbnail?: string;
	adjustments: AdjustmentSet;
}

export interface AdjustmentSet {
	brightness?: number; // -100 to 100
	contrast?: number; // -100 to 100
	exposure?: number; // -100 to 100
	highlights?: number; // -100 to 100
	shadows?: number; // -100 to 100
	whites?: number; // -100 to 100
	blacks?: number; // -100 to 100
	temperature?: number; // -100 to 100
	tint?: number; // -100 to 100
	saturation?: number; // -100 to 100
	vibrance?: number; // -100 to 100
	hue?: number; // -180 to 180
	sharpness?: number; // 0 to 100
	clarity?: number; // -100 to 100
	vignette?: number; // -100 to 100
	grain?: number; // 0 to 100
	fade?: number; // 0 to 100
}

export interface CropSettings {
	enabled: boolean;
	x: number;
	y: number;
	width: number;
	height: number;
	aspectRatio?: number | 'free' | 'original' | '1:1' | '4:3' | '16:9' | '9:16';
}

export interface RotationSettings {
	enabled: boolean;
	angle: number; // degrees
	flipHorizontal: boolean;
	flipVertical: boolean;
}

export interface EditHistory {
	id: string;
	timestamp: number;
	type: 'filter' | 'adjustment' | 'crop' | 'rotation' | 'reset';
	data: any;
	preview?: string;
}

export interface PhotoEditState {
	originalImage: string;
	currentImage: string;
	adjustments: AdjustmentSet;
	filter?: FilterPreset;
	crop?: CropSettings;
	rotation?: RotationSettings;
	history: EditHistory[];
	historyIndex: number;
}

// Filter presets
export const FILTER_PRESETS: FilterPreset[] = [
	{
		id: 'none',
		name: '原图',
		description: '无滤镜',
		adjustments: {}
	},
	{
		id: 'vivid',
		name: '鲜艳',
		description: '增强色彩和对比度',
		adjustments: {
			brightness: 5,
			contrast: 15,
			saturation: 25,
			vibrance: 30,
			clarity: 10
		}
	},
	{
		id: 'warm',
		name: '暖色',
		description: '温暖的色调',
		adjustments: {
			temperature: 25,
			tint: 10,
			brightness: 5,
			saturation: 10
		}
	},
	{
		id: 'cool',
		name: '冷色',
		description: '清冷的色调',
		adjustments: {
			temperature: -25,
			tint: -10,
			brightness: 5,
			saturation: 5
		}
	},
	{
		id: 'vintage',
		name: '复古',
		description: '怀旧胶片感',
		adjustments: {
			temperature: 15,
			contrast: 10,
			saturation: -20,
			grain: 20,
			fade: 30,
			vignette: 25
		}
	},
	{
		id: 'bw',
		name: '黑白',
		description: '经典黑白',
		adjustments: {
			saturation: -100,
			contrast: 20,
			clarity: 15,
			sharpness: 10
		}
	},
	{
		id: 'dramatic',
		name: '戏剧',
		description: '高对比度效果',
		adjustments: {
			contrast: 40,
			highlights: -30,
			shadows: 30,
			clarity: 35,
			vignette: 40
		}
	},
	{
		id: 'soft',
		name: '柔和',
		description: '柔光效果',
		adjustments: {
			brightness: 10,
			contrast: -10,
			clarity: -20,
			sharpness: -20,
			saturation: -10
		}
	},
	{
		id: 'hdr',
		name: 'HDR',
		description: '高动态范围',
		adjustments: {
			highlights: -40,
			shadows: 40,
			clarity: 40,
			vibrance: 30,
			sharpness: 20
		}
	},
	{
		id: 'matte',
		name: '哑光',
		description: '低对比度哑光',
		adjustments: {
			contrast: -20,
			blacks: 30,
			fade: 40,
			saturation: -15
		}
	}
];

// Photo editor
export class PhotoEditor {
	private state: PhotoEditState | null = null;
	private maxHistory = 50;

	// Initialize with image
	initialize(imageData: string): void {
		this.state = {
			originalImage: imageData,
			currentImage: imageData,
			adjustments: {},
			history: [],
			historyIndex: -1
		};
	}

	// Apply filter
	applyFilter(filterPreset: FilterPreset): void {
		if (!this.state) return;

		this.state.filter = filterPreset;
		this.state.adjustments = { ...filterPreset.adjustments };

		this.addToHistory({
			type: 'filter',
			data: filterPreset
		});

		this.updateCurrentImage();
	}

	// Update adjustment
	updateAdjustment(key: keyof AdjustmentSet, value: number): void {
		if (!this.state) return;

		this.state.adjustments[key] = value;

		this.addToHistory({
			type: 'adjustment',
			data: { key, value }
		});

		this.updateCurrentImage();
	}

	// Update multiple adjustments
	updateAdjustments(adjustments: AdjustmentSet): void {
		if (!this.state) return;

		this.state.adjustments = { ...this.state.adjustments, ...adjustments };

		this.addToHistory({
			type: 'adjustment',
			data: adjustments
		});

		this.updateCurrentImage();
	}

	// Apply crop
	applyCrop(crop: CropSettings): void {
		if (!this.state) return;

		this.state.crop = crop;

		this.addToHistory({
			type: 'crop',
			data: crop
		});

		this.updateCurrentImage();
	}

	// Apply rotation
	applyRotation(rotation: RotationSettings): void {
		if (!this.state) return;

		this.state.rotation = rotation;

		this.addToHistory({
			type: 'rotation',
			data: rotation
		});

		this.updateCurrentImage();
	}

	// Reset all edits
	resetAll(): void {
		if (!this.state) return;

		this.state.adjustments = {};
		this.state.filter = undefined;
		this.state.crop = undefined;
		this.state.rotation = undefined;

		this.addToHistory({
			type: 'reset',
			data: null
		});

		this.updateCurrentImage();
	}

	// Reset specific adjustment
	resetAdjustment(key: keyof AdjustmentSet): void {
		if (!this.state) return;

		delete this.state.adjustments[key];

		this.updateCurrentImage();
	}

	// Undo
	undo(): void {
		if (!this.state || this.state.historyIndex < 0) return;

		this.state.historyIndex--;

		// Restore state from history
		this.restoreFromHistory();
	}

	// Redo
	redo(): void {
		if (!this.state || this.state.historyIndex >= this.state.history.length - 1) return;

		this.state.historyIndex++;

		// Restore state from history
		this.restoreFromHistory();
	}

	// Check if can undo
	canUndo(): boolean {
		return this.state !== null && this.state.historyIndex >= 0;
	}

	// Check if can redo
	canRedo(): boolean {
		return this.state !== null && this.state.historyIndex < this.state.history.length - 1;
	}

	// Get current state
	getState(): PhotoEditState | null {
		return this.state;
	}

	// Get current adjustments
	getAdjustments(): AdjustmentSet {
		return this.state?.adjustments || {};
	}

	// Get current filter
	getFilter(): FilterPreset | undefined {
		return this.state?.filter;
	}

	// Get crop settings
	getCrop(): CropSettings | undefined {
		return this.state?.crop;
	}

	// Get rotation settings
	getRotation(): RotationSettings | undefined {
		return this.state?.rotation;
	}

	// Get history
	getHistory(): EditHistory[] {
		return this.state?.history || [];
	}

	// Get current image
	getCurrentImage(): string | null {
		return this.state?.currentImage || null;
	}

	// Get original image
	getOriginalImage(): string | null {
		return this.state?.originalImage || null;
	}

	// Export edited image
	async exportImage(format: 'jpeg' | 'png' | 'webp' = 'jpeg', quality: number = 0.9): Promise<Blob> {
		if (!this.state) throw new Error('No image loaded');

		// This would use Canvas API to apply adjustments and export
		// For now, return original as placeholder
		const response = await fetch(this.state.currentImage);
		return response.blob();
	}

	// Add to history
	private addToHistory(entry: Omit<EditHistory, 'id' | 'timestamp'>): void {
		if (!this.state) return;

		// Remove any future history if we're not at the end
		if (this.state.historyIndex < this.state.history.length - 1) {
			this.state.history = this.state.history.slice(0, this.state.historyIndex + 1);
		}

		// Add new entry
		const historyEntry: EditHistory = {
			id: `edit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			timestamp: Date.now(),
			...entry
		};

		this.state.history.push(historyEntry);
		this.state.historyIndex = this.state.history.length - 1;

		// Limit history size
		if (this.state.history.length > this.maxHistory) {
			this.state.history.shift();
			this.state.historyIndex--;
		}
	}

	// Restore from history
	private restoreFromHistory(): void {
		if (!this.state) return;

		// Rebuild state from history up to current index
		const historySlice = this.state.history.slice(0, this.state.historyIndex + 1);

		// Reset to original
		this.state.adjustments = {};
		this.state.filter = undefined;
		this.state.crop = undefined;
		this.state.rotation = undefined;

		// Re-apply history
		for (const entry of historySlice) {
			switch (entry.type) {
				case 'filter':
					this.state.filter = entry.data;
					this.state.adjustments = { ...entry.data.adjustments };
					break;
				case 'adjustment':
					if (entry.data.key) {
						this.state.adjustments[entry.data.key] = entry.data.value;
					} else {
						this.state.adjustments = { ...this.state.adjustments, ...entry.data };
					}
					break;
				case 'crop':
					this.state.crop = entry.data;
					break;
				case 'rotation':
					this.state.rotation = entry.data;
					break;
				case 'reset':
					this.state.adjustments = {};
					this.state.filter = undefined;
					this.state.crop = undefined;
					this.state.rotation = undefined;
					break;
			}
		}

		this.updateCurrentImage();
	}

	// Update current image (placeholder)
	private updateCurrentImage(): void {
		// This would apply CSS filters or Canvas transformations
		// For now, keep original image
		if (this.state) {
			this.state.currentImage = this.state.originalImage;
		}
	}

	// Generate CSS filter string for preview
	generateCSSFilter(): string {
		if (!this.state) return '';

		const adj = this.state.adjustments;
		const filters: string[] = [];

		if (adj.brightness) filters.push(`brightness(${100 + adj.brightness}%)`);
		if (adj.contrast) filters.push(`contrast(${100 + adj.contrast}%)`);
		if (adj.exposure) filters.push(`brightness(${100 + adj.exposure}%)`);
		if (adj.saturation) filters.push(`saturate(${100 + adj.saturation}%)`);
		if (adj.hue) filters.push(`hue-rotate(${adj.hue}deg)`);
		if (adj.grain) filters.push(`url(#noise)`); // SVG noise filter
		if (adj.sepia) filters.push(`sepia(${adj.sepia}%)`);
		if (adj.grayscale) filters.push(`grayscale(${adj.grayscale}%)`);
		if (adj.invert) filters.push(`invert(${adj.invert}%)`);
		if (adj.blur) filters.push(`blur(${adj.blur}px)`);

		return filters.join(' ');
	}

	// Get filter by ID
	static getFilterById(id: string): FilterPreset | undefined {
		return FILTER_PRESETS.filter(f => f.id === id)[0];
	}

	// Get all filters
	static getAllFilters(): FilterPreset[] {
		return [...FILTER_PRESETS];
	}
}

// Global photo editor instance
let globalPhotoEditor: PhotoEditor | null = null;

export function getPhotoEditor(): PhotoEditor {
	if (!globalPhotoEditor) {
		globalPhotoEditor = new PhotoEditor();
	}
	return globalPhotoEditor;
}
