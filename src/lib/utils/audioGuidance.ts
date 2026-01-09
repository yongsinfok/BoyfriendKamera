/**
 * Advanced audio guidance system
 * Provides voice instructions, spatial audio cues, and audio feedback
 */

export interface AudioConfig {
	enabled: boolean;
	volume: number; // 0-1
	rate: number; // Speech rate (0.1-10)
	pitch: number; // Speech pitch (0-2)
	language: string; // 'zh-CN', 'en-US', etc.
	voice: string | null; // Specific voice URI
	spatialAudio: boolean; // Enable spatial audio cues
}

export interface AudioInstruction {
	text: string;
	priority: 'high' | 'medium' | 'low';
	spatial?: 'left' | 'right' | 'center'; // Spatial audio position
	duration?: number; // Estimated duration in ms
	timestamp?: number;
}

export interface AudioFeedback {
	type: 'success' | 'warning' | 'error' | 'info';
	message: string;
	repeat: boolean;
	interval?: number; // For repeatable feedback
}

// Default audio configuration
const DEFAULT_CONFIG: AudioConfig = {
	enabled: true,
	volume: 0.8,
	rate: 1.0,
	pitch: 1.0,
	language: 'zh-CN',
	voice: null,
	spatialAudio: true
};

// Audio guidance manager
export class AudioGuidanceManager {
	private config: AudioConfig;
	private speechSynthesis: SpeechSynthesis | null = null;
	private voices: SpeechSynthesisVoice[] = [];
	private instructionQueue: AudioInstruction[] = [];
	private isPlaying = false;
	private currentUtterance: SpeechSynthesisUtterance | null = null;

	constructor(config: Partial<AudioConfig> = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };
		this.initialize();
	}

	private async initialize(): Promise<void> {
		if (typeof window === 'undefined') return;

		this.speechSynthesis = window.speechSynthesis;

		// Load voices
		if (this.speechSynthesis) {
			// Chrome loads voices asynchronously
			if (speechSynthesis.onvoiceschanged !== undefined) {
				speechSynthesis.onvoiceschanged = () => {
					this.voices = this.speechSynthesis?.getVoices() || [];
				};
			}
			this.voices = this.speechSynthesis.getVoices() || [];
		}

		// Load saved config
		this.loadConfig();
	}

	// Speak an instruction
	async speak(instruction: AudioInstruction): Promise<void> {
		if (!this.config.enabled || !this.speechSynthesis) {
			return;
		}

		// Add to queue
		this.instructionQueue.push(instruction);

		// Process queue if not already playing
		if (!this.isPlaying) {
			await this.processQueue();
		}
	}

	private async processQueue(): Promise<void> {
		if (this.instructionQueue.length === 0) {
			this.isPlaying = false;
			return;
		}

		this.isPlaying = true;

		// Sort by priority (high first)
		this.instructionQueue.sort((a, b) => {
			const priorityOrder = { high: 0, medium: 1, low: 2 };
			return priorityOrder[a.priority] - priorityOrder[b.priority];
		});

		const instruction = this.instructionQueue.shift()!;
		await this.speakNow(instruction);

		// Process next instruction
		await this.processQueue();
	}

	private speakNow(instruction: AudioInstruction): Promise<void> {
		return new Promise((resolve, reject) => {
			if (!this.speechSynthesis) {
				reject(new Error('Speech synthesis not available'));
				return;
			}

			// Cancel any current speech
			this.speechSynthesis.cancel();

			// Create utterance
			const utterance = new SpeechSynthesisUtterance(instruction.text);
			this.currentUtterance = utterance;

			// Configure utterance
			utterance.volume = this.config.volume;
			utterance.rate = this.config.rate;
			utterance.pitch = this.config.pitch;
			utterance.lang = this.config.language;

			// Set voice
			if (this.config.voice) {
				const voice = this.voices.find((v) => v.voiceURI === this.config.voice);
				if (voice) {
					utterance.voice = voice;
				}
			} else {
				// Auto-select voice for language
				const matchingVoices = this.voices.filter((v) => v.lang.startsWith(this.config.language.split('-')[0]));
				if (matchingVoices.length > 0) {
					utterance.voice = matchingVoices[0];
				}
			}

			// Handle spatial audio (simulate with pan if supported)
			if (this.config.spatialAudio && instruction.spatial) {
				// Note: Web Speech API doesn't support spatial audio directly
				// This would require Web Audio API for true spatial audio
				// For now, we rely on text cues like "向左移动" (move left)
			}

			// Event handlers
			utterance.onend = () => {
				this.currentUtterance = null;
				resolve();
			};

			utterance.onerror = (event) => {
				this.currentUtterance = null;
				console.error('Speech synthesis error:', event.error);
				reject(new Error(`Speech synthesis error: ${event.error}`));
			};

			// Speak
			this.speechSynthesis.speak(utterance);
		});
	}

	// Stop all speech
	stop(): void {
		if (this.speechSynthesis) {
			this.speechSynthesis.cancel();
		}
		this.instructionQueue = [];
		this.isPlaying = false;
		this.currentUtterance = null;
	}

	// Pause speech
	pause(): void {
		if (this.speechSynthesis) {
			this.speechSynthesis.pause();
		}
	}

	// Resume speech
	resume(): void {
		if (this.speechSynthesis) {
			this.speechSynthesis.resume();
		}
	}

	// Update configuration
	updateConfig(updates: Partial<AudioConfig>): void {
		this.config = { ...this.config, ...updates };
		this.saveConfig();
	}

	// Get current configuration
	getConfig(): AudioConfig {
		return { ...this.config };
	}

	// Get available voices
	getVoices(): SpeechSynthesisVoice[] {
		return [...this.voices];
	}

	// Get voices for a specific language
	getVoicesForLanguage(language: string): SpeechSynthesisVoice[] {
		return this.voices.filter((v) => v.lang.startsWith(language.split('-')[0]));
	}

	// Save configuration to localStorage
	private saveConfig(): void {
		if (typeof window === 'undefined') return;

		try {
			localStorage.setItem('audio-guidance-config', JSON.stringify(this.config));
		} catch (e) {
			console.error('Failed to save audio config:', e);
		}
	}

	// Load configuration from localStorage
	private loadConfig(): void {
		if (typeof window === 'undefined') return;

		try {
			const stored = localStorage.getItem('audio-guidance-config');
			if (stored) {
				const savedConfig = JSON.parse(stored);
				this.config = { ...this.config, ...savedConfig };
			}
		} catch (e) {
			console.error('Failed to load audio config:', e);
		}
	}

	// Clear instruction queue
	clearQueue(): void {
		this.instructionQueue = [];
	}

	// Get queue status
	getQueueStatus(): { length: number; isPlaying: boolean; current?: AudioInstruction } {
		return {
			length: this.instructionQueue.length,
			isPlaying: this.isPlaying,
			current: this.currentUtterance ? { text: this.currentUtterance.text, priority: 'medium' as const } : undefined
		};
	}
}

// Audio feedback generator
export class AudioFeedbackGenerator {
	private manager: AudioGuidanceManager;
	private feedbackTimers: Map<string, NodeJS.Timeout> = new Map();

	constructor(manager: AudioGuidanceManager) {
		this.manager = manager;
	}

	// Provide feedback for pose accuracy
	provideAccuracyFeedback(accuracy: number): void {
		if (!this.manager.getConfig().enabled) return;

		let feedback: AudioFeedback;

		if (accuracy >= 0.9) {
			feedback = {
				type: 'success',
				message: '完美！姿势非常准确',
				repeat: false
			};
		} else if (accuracy >= 0.8) {
			feedback = {
				type: 'success',
				message: '很好！继续保持',
				repeat: false
			};
		} else if (accuracy >= 0.6) {
			feedback = {
				type: 'info',
				message: '还不错，再微调一下',
				repeat: false
			};
		} else if (accuracy >= 0.4) {
			feedback = {
				type: 'warning',
				message: '需要调整姿势',
				repeat: false
			};
		} else {
			feedback = {
				type: 'error',
				message: '姿势差距较大，请重新调整',
				repeat: true,
				interval: 3000
			};
		}

		this.provideFeedback(feedback);
	}

	// Provide directional guidance
	provideDirectionalGuidance(direction: 'left' | 'right' | 'up' | 'down' | 'forward' | 'backward'): void {
		const messages: Record<string, string> = {
			left: '向左移动一点',
			right: '向右移动一点',
			up: '向上移动一点',
			down: '向下移动一点',
			forward: '向前移动一点',
			backward: '向后移动一点'
		};

		const message = messages[direction];
		if (message) {
			this.manager.speak({
				text: message,
				priority: 'high',
				spatial: direction === 'left' || direction === 'right' ? direction : 'center'
			});
		}
	}

	// Provide feedback
	provideFeedback(feedback: AudioFeedback): void {
		if (!this.manager.getConfig().enabled) return;

		// Clear any existing timer for this feedback type
		const existingTimer = this.feedbackTimers.get(feedback.type);
		if (existingTimer) {
			clearTimeout(existingTimer);
		}

		// Speak the feedback
		const priority = feedback.type === 'error' ? 'high' : feedback.type === 'warning' ? 'medium' : 'low';
		this.manager.speak({ text: feedback.message, priority });

		// Set up repeat if needed
		if (feedback.repeat && feedback.interval) {
			const timer = setTimeout(() => {
				this.provideFeedback(feedback);
			}, feedback.interval);
			this.feedbackTimers.set(feedback.type, timer);
		}
	}

	// Stop feedback
	stopFeedback(type?: string): void {
		if (type) {
			const timer = this.feedbackTimers.get(type);
			if (timer) {
				clearTimeout(timer);
				this.feedbackTimers.delete(type);
			}
		} else {
			// Stop all feedback
			for (const timer of this.feedbackTimers.values()) {
				clearTimeout(timer);
			}
			this.feedbackTimers.clear();
		}
		this.manager.stop();
	}
}

// Generate contextual audio instructions
export function generatePoseInstructions(instructions: string[]): AudioInstruction[] {
	return instructions.map((text, index) => ({
		text,
		priority: index === 0 ? 'high' : 'medium'
	}));
}

// Generate encouragement messages
export function generateEncouragement(progress: number, total: number): string[] {
	const percentage = (progress / total) * 100;

	if (percentage >= 100) {
		return ['恭喜！您已完成所有姿势指导', '表现非常出色！'];
	} else if (percentage >= 75) {
		return ['快要完成了', '继续保持', '做得很好'];
	} else if (percentage >= 50) {
		return ['已经完成一半了', '进展顺利', '再接再厉'];
	} else if (percentage >= 25) {
		return ['好的开始', '继续努力'];
	} else {
		return ['让我们开始吧', '准备好了吗？'];
	}
}

// Generate error messages with suggestions
export function generateErrorGuidance(errorType: string): AudioInstruction {
	const messages: Record<string, string> = {
		pose_not_detected: '无法检测到姿势，请确保整个人在画面中',
		poor_lighting: '光线太暗，请移动到光线更充足的地方',
		multiple_people: '检测到多个人，请确保只有一个人在画面中',
	 movement_too_fast: '移动太快了，请保持静止',
		camera_error: '相机出现问题，正在重新尝试'
	};

	const message = messages[errorType] || '出现问题，请稍后再试';

	return {
		text: message,
		priority: 'high'
	};
}

// Global audio guidance manager instance
let globalManager: AudioGuidanceManager | null = null;

export function getAudioGuidanceManager(): AudioGuidanceManager {
	if (!globalManager) {
		globalManager = new AudioGuidanceManager();
	}
	return globalManager;
}

// Global audio feedback generator instance
let globalFeedbackGenerator: AudioFeedbackGenerator | null = null;

export function getAudioFeedbackGenerator(): AudioFeedbackGenerator {
	if (!globalFeedbackGenerator) {
		globalFeedbackGenerator = new AudioFeedbackGenerator(getAudioGuidanceManager());
	}
	return globalFeedbackGenerator;
}

// Convenience functions
export function speak(text: string, priority: 'high' | 'medium' | 'low' = 'medium'): void {
	getAudioGuidanceManager().speak({ text, priority });
}

export function stopAudio(): void {
	getAudioGuidanceManager().stop();
}

export function pauseAudio(): void {
	getAudioGuidanceManager().pause();
}

export function resumeAudio(): void {
	getAudioGuidanceManager().resume();
}
