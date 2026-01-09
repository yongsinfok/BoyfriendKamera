import type { Pose } from '$lib/types';

/**
 * Advanced analytics system
 * Tracks user behavior, pose quality trends, and app performance
 */

export interface AnalyticsEvent {
	timestamp: number;
	type: string;
	data: Record<string, any>;
}

export interface SessionMetrics {
	sessionId: string;
	startTime: number;
	endTime?: number;
	photosTaken: number;
	posesAttempted: number;
	posesSuccessful: number;
	averageAccuracy: number;
	averageSessionTime: number;
	mostUsedPoses: string[];
	improvementRate: number;
}

export interface QualityMetrics {
	overallAccuracy: number;
	poseQuality: number;
	lightingQuality: number;
	compositionQuality: number;
	trend: 'improving' | 'stable' | 'declining';
}

// Analytics manager
export class AnalyticsManager {
	private events: AnalyticsEvent[] = [];
	private currentSession: SessionMetrics | null = null;
	private maxEvents = 1000;

	startSession(sessionId: string): void {
		this.currentSession = {
			sessionId,
			startTime: Date.now(),
			photosTaken: 0,
			posesAttempted: 0,
			posesSuccessful: 0,
			averageAccuracy: 0,
			averageSessionTime: 0,
			mostUsedPoses: [],
			improvementRate: 0
		};

		this.trackEvent('session_start', { sessionId });
	}

	endSession(): SessionMetrics | null {
		if (!this.currentSession) return null;

		this.currentSession.endTime = Date.now();
		this.currentSession.averageSessionTime =
			this.currentSession.endTime - this.currentSession.startTime;

		this.trackEvent('session_end', {
			sessionId: this.currentSession.sessionId,
			duration: this.currentSession.averageSessionTime
		});

		const session = { ...this.currentSession };
		this.saveToStorage(session);
		this.currentSession = null;

		return session;
	}

	trackEvent(type: string, data: Record<string, any>): void {
		const event: AnalyticsEvent = {
			timestamp: Date.now(),
			type,
			data
		};

		this.events.push(event);

		// Keep only recent events
		if (this.events.length > this.maxEvents) {
			this.events.shift();
		}

		// Update session metrics in real-time
		if (this.currentSession) {
			this.updateSessionMetrics(type, data);
		}
	}

	private updateSessionMetrics(type: string, data: Record<string, any>): void {
		if (!this.currentSession) return;

		switch (type) {
			case 'photo_taken':
				this.currentSession.photosTaken++;
				break;
			case 'pose_attempted':
				this.currentSession.posesAttempted++;
				break;
			case 'pose_successful':
				this.currentSession.posesSuccessful++;
				if (data.accuracy !== undefined) {
					const currentAccuracy = this.currentSession.averageAccuracy;
					const count = this.currentSession.posesSuccessful;
					this.currentSession.averageAccuracy =
						(currentAccuracy * (count - 1) + data.accuracy) / count;
				}
				break;
		}
	}

	getQualityMetrics(): QualityMetrics {
		const recentEvents = this.events.slice(-100);

		const accuracyEvents = recentEvents.filter(
			(e) => e.type === 'pose_successful' && e.data.accuracy !== undefined
		);

		if (accuracyEvents.length === 0) {
			return {
				overallAccuracy: 0,
				poseQuality: 0,
				lightingQuality: 0,
				compositionQuality: 0,
				trend: 'stable'
			};
		}

		const avgAccuracy =
			accuracyEvents.reduce((sum, e) => sum + (e.data.accuracy || 0), 0) / accuracyEvents.length;

		// Calculate trend
		const half = Math.floor(accuracyEvents.length / 2);
		const firstHalf = accuracyEvents.slice(0, half);
		const secondHalf = accuracyEvents.slice(half);

		const firstHalfAvg =
			firstHalf.reduce((sum, e) => sum + (e.data.accuracy || 0), 0) / firstHalf.length;
		const secondHalfAvg =
			secondHalf.reduce((sum, e) => sum + (e.data.accuracy || 0), 0) / secondHalf.length;

		let trend: QualityMetrics['trend'] = 'stable';
		if (secondHalfAvg > firstHalfAvg + 0.1) {
			trend = 'improving';
		} else if (secondHalfAvg < firstHalfAvg - 0.1) {
			trend = 'declining';
		}

		return {
			overallAccuracy: avgAccuracy,
			poseQuality: avgAccuracy * 0.9, // Simplified
			lightingQuality: avgAccuracy * 0.95, // Simplified
			compositionQuality: avgAccuracy * 0.85, // Simplified
			trend
		};
	}

	getSessionHistory(): SessionMetrics[] {
		const history = this.getFromStorage();
		return history.sort((a, b) => b.startTime - a.startTime);
	}

	private saveToStorage(session: SessionMetrics): void {
		if (typeof window === 'undefined') return;

		try {
			const history = this.getFromStorage();
			history.push(session);
			localStorage.setItem('analytics_history', JSON.stringify(history));
		} catch (e) {
			console.error('Failed to save analytics:', e);
		}
	}

	private getFromStorage(): SessionMetrics[] {
		if (typeof window === 'undefined') return [];

		try {
			const stored = localStorage.getItem('analytics_history');
			return stored ? JSON.parse(stored) : [];
		} catch (e) {
			console.error('Failed to load analytics:', e);
			return [];
		}
	}

	clearHistory(): void {
		if (typeof window !== 'undefined') {
			localStorage.removeItem('analytics_history');
		}
		this.events = [];
	}

	getStats(): {
		totalSessions: number;
		totalPhotos: number;
		totalPoses: number;
		successRate: number;
		averageAccuracy: number;
	} {
		const history = this.getFromStorage();

		return {
			totalSessions: history.length,
			totalPhotos: history.reduce((sum, s) => sum + s.photosTaken, 0),
			totalPoses: history.reduce((sum, s) => sum + s.posesAttempted, 0),
			successRate:
				history.reduce((sum, s) => sum + s.posesSuccessful, 0) /
				(history.reduce((sum, s) => sum + s.posesAttempted, 0) || 1),
			averageAccuracy:
				history.reduce((sum, s) => sum + s.averageAccuracy, 0) / (history.length || 1)
		};
	}
}

// Global analytics manager instance
let globalAnalytics: AnalyticsManager | null = null;

export function getAnalyticsManager(): AnalyticsManager {
	if (!globalAnalytics) {
		globalAnalytics = new AnalyticsManager();
	}
	return globalAnalytics;
}
