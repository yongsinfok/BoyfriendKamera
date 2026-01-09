import { writable, get } from 'svelte/store';
import type { Pose, PoseGuide } from '$lib/types';

/**
 * Adaptive Learning Store
 * Learns from user feedback to improve pose recommendations
 */

interface UserFeedback {
	sessionId: string;
	poseId: string;
	timestamp: number;
	rating: number; // 1-5 star rating
	wasHelpful: boolean;
	skipped: boolean;
	adjustedParts: string[];
}

interface AdaptiveWeights {
	bodyPartWeights: Record<string, number>; // Dynamic weights based on feedback
	preferredDifficulties: number[]; // User's preferred difficulty levels
	avoidedPoses: string[]; // Poses user consistently rejects
	successfulPoses: string[]; // Poses user consistently likes
	totalFeedback: number;
	averageRating: number;
}

interface AdaptiveLearningState {
	feedbackHistory: UserFeedback[];
	weights: AdaptiveWeights;
	learningEnabled: boolean;
}

const initialState: AdaptiveLearningState = {
	feedbackHistory: [],
	weights: {
		bodyPartWeights: {
			nose: 2.0,
			left_eye: 1.5,
			right_eye: 1.5,
			left_ear: 0.8,
			right_ear: 0.8,
			left_shoulder: 1.2,
			right_shoulder: 1.2,
			left_elbow: 1.0,
			right_elbow: 1.0,
			left_wrist: 0.9,
			right_wrist: 0.9,
			left_hip: 1.0,
			right_hip: 1.0,
			left_knee: 0.7,
			right_knee: 0.7,
			left_ankle: 0.5,
			right_ankle: 0.5
		},
		preferredDifficulties: [1, 2],
		avoidedPoses: [],
		successfulPoses: [],
		totalFeedback: 0,
		averageRating: 0
	},
	learningEnabled: true
};

function createAdaptiveLearningStore() {
	const { subscribe, set, update } = writable<AdaptiveLearningState>(initialState);

	// Load from localStorage
	const loadFromStorage = () => {
		if (typeof window === 'undefined') return;
		try {
			const stored = localStorage.getItem('adaptive-learning');
			if (stored) {
				const parsed = JSON.parse(stored);
				set(parsed);
			}
		} catch (e) {
			console.error('Failed to load adaptive learning data:', e);
		}
	};

	// Save to localStorage
	const saveToStorage = (state: AdaptiveLearningState) => {
		if (typeof window === 'undefined') return;
		try {
			localStorage.setItem('adaptive-learning', JSON.stringify(state));
		} catch (e) {
			console.error('Failed to save adaptive learning data:', e);
		}
	};

	// Record user feedback
	const recordFeedback = (feedback: Omit<UserFeedback, 'timestamp'>) => {
		update((state) => {
			if (!state.learningEnabled) return state;

			const newFeedback: UserFeedback = {
				...feedback,
				timestamp: Date.now()
			};

			const updatedHistory = [...state.feedbackHistory, newFeedback].slice(-100); // Keep last 100

			// Update weights based on feedback
			const updatedWeights = { ...state.weights };
			updatedWeights.totalFeedback++;

			// Update average rating
			const totalRating = updatedHistory.reduce((sum, f) => sum + f.rating, 0);
			updatedWeights.averageRating = totalRating / updatedHistory.length;

			// Track successful/avoided poses
			if (feedback.rating >= 4) {
				if (!updatedWeights.successfulPoses.includes(feedback.poseId)) {
					updatedWeights.successfulPoses.push(feedback.poseId);
				}
				// Remove from avoided if it was there
				updatedWeights.avoidedPoses = updatedWeights.avoidedPoses.filter((id) => id !== feedback.poseId);
			} else if (feedback.rating <= 2 && !feedback.skipped) {
				if (!updatedWeights.avoidedPoses.includes(feedback.poseId)) {
					updatedWeights.avoidedPoses.push(feedback.poseId);
				}
			}

			const updatedState = {
				...state,
				feedbackHistory: updatedHistory,
				weights: updatedWeights
			};

			saveToStorage(updatedState);
			return updatedState;
		});
	};

	// Get recommended difficulty level
	const getRecommendedDifficulty = (): number => {
		const state = get(adaptiveLearning);
		if (state.weights.preferredDifficulties.length === 0) return 1;

		// Return the average of preferred difficulties
		const sum = state.weights.preferredDifficulties.reduce((a, b) => a + b, 0);
		return Math.round(sum / state.weights.preferredDifficulties.length);
	};

	// Check if a pose should be recommended based on learning
	const shouldRecommendPose = (poseId: string, difficulty: number): boolean => {
		const state = get(adaptiveLearning);
		if (!state.learningEnabled) return true;

		// Avoid poses user consistently dislikes
		if (state.weights.avoidedPoses.includes(poseId)) {
			return false;
		}

		// Prioritize poses user likes
		if (state.weights.successfulPoses.includes(poseId)) {
			return true;
		}

		// Check if difficulty matches preferences
		return state.weights.preferredDifficulties.includes(difficulty);
	};

	// Adjust body part weights based on feedback
	const adjustBodyPartWeight = (bodyPart: string, adjustment: number) => {
		update((state) => {
			if (!state.learningEnabled) return state;

			const updatedWeights = { ...state.weights };
			const currentWeight = updatedWeights.bodyPartWeights[bodyPart] || 1.0;
			updatedWeights.bodyPartWeights[bodyPart] = Math.max(0.1, Math.min(3.0, currentWeight + adjustment));

			const updatedState = {
				...state,
				weights: updatedWeights
			};

			saveToStorage(updatedState);
			return updatedState;
		});
	};

	// Update preferred difficulties based on feedback
	const updatePreferredDifficulties = (difficulty: number, rating: number) => {
		update((state) => {
			if (!state.learningEnabled) return state;

			const updatedWeights = { ...state.weights };
			const currentPrefs = updatedWeights.preferredDifficulties;

			// If high rating, add to preferences
			if (rating >= 4 && !currentPrefs.includes(difficulty)) {
				updatedWeights.preferredDifficulties = [...currentPrefs, difficulty].sort();
			}
			// If low rating, remove from preferences
			else if (rating <= 2) {
				updatedWeights.preferredDifficulties = currentPrefs.filter((d) => d !== difficulty);
			}

			const updatedState = {
				...state,
				weights: updatedWeights
			};

			saveToStorage(updatedState);
			return updatedState;
		});
	};

	// Get learning statistics
	const getStatistics = () => {
		const state = get(adaptiveLearning);
		return {
			totalFeedback: state.weights.totalFeedback,
			averageRating: state.weights.averageRating,
			successfulPoses: state.weights.successfulPoses.length,
			avoidedPoses: state.weights.avoidedPoses.length,
			preferredDifficulties: state.weights.preferredDifficulties
		};
	};

	// Reset learning data
	const reset = () => {
		set(initialState);
		if (typeof window !== 'undefined') {
			localStorage.removeItem('adaptive-learning');
		}
	};

	// Initialize
	loadFromStorage();

	return {
		subscribe,
		recordFeedback,
		getRecommendedDifficulty,
		shouldRecommendPose,
		adjustBodyPartWeight,
		updatePreferredDifficulties,
		getStatistics,
		reset,
		set
	};
}

export const adaptiveLearning = createAdaptiveLearningStore();
