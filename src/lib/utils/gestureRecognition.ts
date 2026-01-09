import type { Pose, PoseKeypoint } from '$lib/types';

/**
 * Advanced gesture recognition system
 * Detects hand gestures, body language, and pose transitions from pose data
 */

export interface Gesture {
	name: string;
	confidence: number; // 0-1
	detectedAt: number;
	duration: number; // How long gesture has been held
	keypoints: string[];
	metadata?: Record<string, any>;
}

export interface HandGesture {
	hand: 'left' | 'right';
	gesture: string;
	confidence: number;
	fingers: number;
	orientation: 'up' | 'down' | 'left' | 'right';
	position: { x: number; y: number };
}

export interface BodyLanguage {
	pose: string;
	confidence: number;
	mood: 'confident' | 'relaxed' | 'tense' | 'energetic' | 'casual';
	openness: 'open' | 'closed' | 'neutral';
	engagement: 'high' | 'medium' | 'low';
}

// Detect hand gestures
export function detectHandGesture(pose: Pose, hand: 'left' | 'right'): HandGesture | null {
	const wrist = pose[`${hand}_wrist` as keyof Pose];
	const elbow = pose[`${hand}_elbow` as keyof Pose];
	const shoulder = pose[`${hand}_shoulder` as keyof Pose];

	if (!wrist || !elbow || !shoulder) {
		return null;
	}

	// Calculate arm angles
	const wristY = wrist.y;
	const elbowY = elbow.y;
	const shoulderY = shoulder.y;

	const wristX = wrist.x;
	const elbowX = elbow.x;
	const shoulderX = shoulder.x;

	// Determine orientation
	const verticalAlignment = Math.abs(wristX - elbowX) < 0.1;
	const armRaised = wristY < shoulderY;
	const armLowered = wristY > elbowY + 0.2;
	const armOutward = Math.abs(wristX - shoulderX) > 0.25;

	// Count extended fingers (simplified - would need more detailed keypoints for accuracy)
	const fingersExtended = estimateFingersExtended(pose, hand);

	// Detect specific gestures
	let gesture = 'unknown';
	let confidence = 0.5;
	let orientation: 'up' | 'down' | 'left' | 'right' = 'up';

	// Wave detection (would need temporal data)
	if (armRaised && verticalAlignment) {
		gesture = 'raising_hand';
		confidence = 0.8;
		orientation = 'up';
	} else if (armLowered && verticalAlignment) {
		gesture = 'lowering_hand';
		confidence = 0.7;
		orientation = 'down';
	} else if (armOutward) {
		gesture = 'reaching_out';
		confidence = 0.75;
		orientation = wristX > shoulderX ? 'right' : 'left';
	} else if (wristY > elbowY && wristY < shoulderY + 0.1 && wristX > elbowX - 0.1 && wristX < elbowX + 0.1) {
		// Wrist near elbow height
		gesture = 'bent_elbow';
		confidence = 0.7;
		orientation = 'down';
	}

	// Peace sign (V sign) detection
	if (fingersExtended === 2 && armRaised) {
		gesture = 'peace_sign';
		confidence = 0.85;
	}

	// Thumbs up detection (simplified)
	if (fingersExtended === 1 && wristY > shoulderY) {
		gesture = 'thumbs_up';
		confidence = 0.7;
	}

	// Pointing detection
	if (fingersExtended === 1 && armOutward) {
		gesture = 'pointing';
		confidence = 0.8;
	}

	return {
		hand,
		gesture,
		confidence,
		fingers: fingersExtended,
		orientation,
		position: { x: wrist.x, y: wrist.y }
	};
}

// Estimate number of extended fingers (simplified)
function estimateFingersExtended(pose: Pose, hand: 'left' | 'right'): number {
	// This is a simplified version - would need more detailed keypoints for accuracy
	const wrist = pose[`${hand}_wrist` as keyof Pose];
	if (!wrist) return 0;

	// Count visible keypoints above wrist as proxy for extended fingers
	const fingerKeypoints = [
		pose[`${hand === 'left' ? 'right' : 'left'}_index` as keyof Pose],
		pose[`${hand === 'left' ? 'right' : 'left'}_pinky` as keyof Pose],
		pose[`${hand}_thumb` as keyof Pose]
	];

	let extended = 0;
	for (const kp of fingerKeypoints) {
		if (kp && (kp.visibility ?? 0) > 0.5) {
			extended++;
		}
	}

	return extended;
}

// Detect body language from pose
export function detectBodyLanguage(pose: Pose): BodyLanguage | null {
	const shoulders = {
		left: pose.left_shoulder,
		right: pose.right_shoulder
	};

	const hips = {
		left: pose.left_hip,
		right: pose.right_hip
	};

	if (!shoulders.left || !shoulders.right || !hips.left || !hips.right) {
		return null;
	}

	// Calculate shoulder width and alignment
	const shoulderYDiff = Math.abs(shoulders.left.y - shoulders.right.y);
	const shoulderWidth = Math.abs(shoulders.right.x - shoulders.left.x);

	// Calculate hip width
	const hipWidth = Math.abs(hips.right.x - hips.left.x);

	// Calculate torso openness
	const torsoAngle = Math.atan2(
		(shoulders.right.x + shoulders.left.x) / 2 - (hips.right.x + hips.left.x) / 2,
		shoulders.left.y - hips.left.y
	);

	// Determine body language
	let poseType = 'standing';
	let mood: BodyLanguage['mood'] = 'neutral';
	let openness: BodyLanguage['openness'] = 'neutral';
	let engagement: BodyLanguage['engagement'] = 'medium';

	// Shoulder tension
	if (shoulderYDiff < 0.02) {
		mood = 'relaxed';
	} else if (shoulderYDiff > 0.05) {
		mood = 'tense';
	}

	// Torso openness
	const shoulderHipRatio = hipWidth / (shoulderWidth || 1);
	if (shoulderHipRatio > 0.9) {
		openness = 'open';
	} else if (shoulderHipRatio < 0.7) {
		openness = 'closed';
	}

	// Engagement based on pose openness
	if (openness === 'open' && mood === 'relaxed') {
		engagement = 'high';
	} else if (openness === 'closed' || mood === 'tense') {
		engagement = 'low';
	}

	// Detect specific poses
	const nose = pose.nose;
	if (nose) {
		const shoulderCenterY = (shoulders.left.y + shoulders.right.y) / 2;
		const torsoHeight = Math.abs(hips.left.y - shoulderCenterY);

		// Sitting vs standing
		if (torsoHeight < 0.25) {
			poseType = 'sitting';
		} else if (torsoHeight > 0.4) {
			poseType = 'standing';
		}

		// Confidence pose (chest expanded)
		if (shoulderWidth > 0.2 && shoulderYDiff < 0.03) {
			mood = 'confident';
		}
	}

	return {
		pose: poseType,
		confidence: 0.75,
		mood,
		openness,
		engagement
	};
}

// Detect pose transitions over time
export class PoseTransitionDetector {
	private poseHistory: Pose[] = [];
	private previousGesture: string | null = null;
	private gestureStartTime: number = 0;
	private readonly maxHistorySize = 10;
	private readonly gestureHoldTime = 500; // ms

	addPose(pose: Pose): void {
		this.poseHistory.push(pose);
		if (this.poseHistory.length > this.maxHistorySize) {
			this.poseHistory.shift();
		}
	}

	detectTransition(): Gesture | null {
		if (this.poseHistory.length < 2) {
			return null;
		}

		const currentPose = this.poseHistory[this.poseHistory.length - 1];
		const previousPose = this.poseHistory[this.poseHistory.length - 2];

		// Detect gesture changes
		const leftGesture = detectHandGesture(currentPose, 'left');
		const rightGesture = detectHandGesture(currentPose, 'right');

		const currentCombinedGesture = this.combineGestures(leftGesture, rightGesture);
		const now = Date.now();

		if (currentCombinedGesture !== this.previousGesture) {
			if (this.previousGesture && this.gestureStartTime) {
				const duration = now - this.gestureStartTime;

				// Return the completed gesture
				const gesture: Gesture = {
					name: this.previousGesture,
					confidence: 0.8,
					detectedAt: this.gestureStartTime,
					duration,
					keypoints: []
				};

				this.previousGesture = currentCombinedGesture;
				this.gestureStartTime = now;

				return gesture;
			}

			this.previousGesture = currentCombinedGesture;
			this.gestureStartTime = now;
		}

		return null;
	}

	private combineGestures(left: HandGesture | null, right: HandGesture | null): string {
		if (!left && !right) return 'none';
		if (!left) return right.gesture;
		if (!right) return left.gesture;

		if (left.gesture === right.gesture) {
			return left.gesture;
		}

		return `${left.gesture}_${right.gesture}`;
	}

	getCurrentGesture(): { name: string; duration: number } | null {
		if (!this.previousGesture) {
			return null;
		}

		return {
			name: this.previousGesture,
			duration: Date.now() - this.gestureStartTime
		};
	}

	clear(): void {
		this.poseHistory = [];
		this.previousGesture = null;
		this.gestureStartTime = 0;
	}
}

// Detect common photo poses
export function detectPhotoPose(pose: Pose): {
	pose: string;
	confidence: number;
	suggestions: string[];
} | null {
	const bodyLanguage = detectBodyLanguage(pose);
	if (!bodyLanguage) {
		return null;
	}

	const leftGesture = detectHandGesture(pose, 'left');
	const rightGesture = detectHandGesture(pose, 'right');

	// Classic portrait pose
	if (bodyLanguage.pose === 'standing' && bodyLanguage.mood === 'confident') {
		return {
			pose: 'classic_portrait',
			confidence: 0.8,
			suggestions: ['保持自信姿态', '肩膀放松下沉', '自然面向镜头']
		};
	}

	// Casual pose
	if (bodyLanguage.mood === 'relaxed' && bodyLanguage.openness === 'open') {
		return {
			pose: 'casual_relaxed',
			confidence: 0.75,
			suggestions: ['保持自然放松', '可以轻微转动身体', '表情自然微笑']
		};
	}

	// Hands in pockets (simplified detection)
	if (leftGesture?.gesture === 'bent_elbow' && rightGesture?.gesture === 'bent_elbow') {
		return {
			pose: 'hands_in_pockets',
			confidence: 0.6,
			suggestions: ['轻松随意姿态', '适合街头风格', '可以稍微侧身']
		};
	}

	// Victory/Peace sign
	if ((leftGesture?.gesture === 'peace_sign' || rightGesture?.gesture === 'peace_sign')) {
		return {
			pose: 'victory_pose',
			confidence: 0.85,
			suggestions: ['展现胜利喜悦', '配合灿烂笑容', '适合庆祝时刻']
		};
	}

	// Waving/Reaching out
	if (leftGesture?.gesture === 'reaching_out' || rightGesture?.gesture === 'reaching_out') {
		return {
			pose: 'greeting_wave',
			confidence: 0.7,
			suggestions: ['友好挥手姿态', '展现热情', '适合合影场景']
		};
	}

	return null;
}

// Global gesture detector instance
let globalDetector: PoseTransitionDetector | null = null;

export function getGestureDetector(): PoseTransitionDetector {
	if (!globalDetector) {
		globalDetector = new PoseTransitionDetector();
	}
	return globalDetector;
}
