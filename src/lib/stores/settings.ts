import { writable, derived, get } from 'svelte/store';
import { settingsService, db } from '$lib/services/db';
import type { AppSettings, ModelType, PresetStyle } from '$lib/types';

// Default settings
const DEFAULT_SETTINGS: AppSettings = {
	apiKey: '',
	defaultModel: 'glm-4v-flash',
	defaultStyle: null,
	enableVibration: true,
	enableGuideLines: true
};

// Settings store
function createSettingsStore() {
	const { subscribe, set, update } = writable<AppSettings>(DEFAULT_SETTINGS);

	// Load settings from IndexedDB on init
	async function init() {
		const saved = await settingsService.get();
		if (saved) {
			set(saved);
		}
	}

	// Save settings to IndexedDB
	async function save(settings: AppSettings) {
		await settingsService.set(settings);
		set(settings);
	}

	return {
		subscribe,
		init,
		get: () => get(store), // Get current value synchronously
		set: (settings: Partial<AppSettings>) => {
			update((current) => {
				const updated = { ...current, ...settings };
				save(updated);
				return updated;
			});
		},
		save
	};
}

export const settings = createSettingsStore();

// Derived stores for convenience
export const apiKey = derived(settings, ($settings) => $settings.apiKey);
export const defaultModel = derived(settings, ($settings) => $settings.defaultModel);
export const enableVibration = derived(settings, ($settings) => $settings.enableVibration);
export const enableGuideLines = derived(settings, ($settings) => $settings.enableGuideLines);

// Preset styles
const PRESET_STYLES: PresetStyle[] = [
	{
		id: 'xiaohongshu',
		name: '小红书风',
		description: '明亮、活力、构图活泼',
		config: { composition: 'dynamic', tone: 'bright', angle: 'varied' }
	},
	{
		id: 'japanese',
		name: '日系',
		description: '柔和、清新、自然光线',
		config: { composition: 'rule_of_thirds', tone: 'soft', angle: 'eye_level' }
	},
	{
		id: 'film',
		name: '胶片',
		description: '复古色调、温暖氛围',
		config: { composition: 'center', tone: 'warm', angle: 'slight_low' }
	},
	{
		id: 'ins',
		name: 'Ins风',
		description: '简约、高级感、低饱和度',
		config: { composition: 'minimal', tone: 'muted', angle: 'eye_level' }
	},
	{
		id: 'minimal',
		name: '极简',
		description: '干净背景、突出主体',
		config: { composition: 'center', tone: 'neutral', angle: 'front' }
	}
];

export const presetStyles = writable(PRESET_STYLES);

// Current selected style
export const currentStyle = writable<PresetStyle | null>(null);
