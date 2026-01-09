import type { Pose, PoseKeypoint } from '$lib/types';
import { calculatePoseAccuracy } from '$lib/data/poseTemplates';
import { applyCalibration } from './cameraCalibration';

/**
 * Intelligent pose validation system
 * Validates pose data quality and detects anomalies
 */

export interface ValidationResult {
	isValid: boolean;
	confidence: number; // 0-1
	issues: ValidationIssue[];
	warnings: string[];
	suggestions: string[];
	quality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface ValidationIssue {
	type: 'missing_keypoint' | 'low_visibility' | 'invalid_coord' | 'anomaly' | 'inconsistent';
	severity: 'critical' | 'warning' | 'info';
	message: string;
	affectedParts: string[];
	confidenceImpact: number; // 0-1
}

// Comprehensive pose validation
export function validatePose(pose: Pose, options?: {
	calibrate?: boolean;
	strict?: boolean;
}): ValidationResult {
	const strict = options?.strict ?? false;
	const calibrate = options?.calibrate ?? true;

	const issues: ValidationIssue[] = [];
	const warnings: string[] = [];
	const suggestions: string[] = [];

	let totalConfidenceImpact = 0;

	// Check for missing critical keypoints
	const criticalKeypoints = ['nose', 'left_shoulder', 'right_shoulder'];
	const missingCritical = criticalKeypoints.filter(kp => !pose[kp as keyof Pose] || !pose[kp as keyof Pose]);

	if (missingCritical.length > 0) {
		issues.push({
			type: 'missing_keypoint',
			severity: 'critical',
			message: `缺少关键点：${missingCritical.join(', ')}`,
			affectedParts: missingCritical,
			confidenceImpact: 0.4 * missingCritical.length
		});
		totalConfidenceImpact += 0.4;
	}

	// Check visibility scores
	const lowVisibilityKeypoints: string[] = [];
	for (const [key, keypoint] of Object.entries(pose)) {
		if (keypoint && keypoint.visibility !== undefined) {
			if (keypoint.visibility < 0.3) {
				if (criticalKeypoints.includes(key)) {
					issues.push({
						type: 'low_visibility',
						severity: 'critical',
						message: `${key} 可见度过低`,
						affectedParts: [key],
						confidenceImpact: 0.3
					});
					totalConfidenceImpact += 0.3;
				} else {
					lowVisibilityKeypoints.push(key);
				}
			}
		}
	}

	if (lowVisibilityKeypoints.length > 0) {
		warnings.push(`以下关键点可见度较低：${lowVisibilityKeypoints.join(', ')}`);
	}

	// Validate coordinate ranges
	const invalidCoords: string[] = [];
	for (const [key, keypoint] of Object.entries(pose)) {
		if (!keypoint) continue;

		const { x, y } = keypoint;

		// Check if coordinates are in valid range
		if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y)) {
			invalidCoords.push(key);
			issues.push({
				type: 'invalid_coord',
				severity: 'critical',
				message: `${key} 坐标无效`,
				affectedParts: [key],
				confidenceImpact: 0.5
			});
			continue;
		}

		if (x < 0 || x > 1 || y < 0 || y > 1) {
			invalidCoords.push(key);
			issues.push({
				type: 'invalid_coord',
				severity: strict ? 'critical' : 'warning',
				message: `${key} 坐标超出范围 (x: ${x.toFixed(2)}, y: ${y.toFixed(2)})`,
				affectedParts: [key],
				confidenceImpact: 0.2
			});
			totalConfidenceImpact += 0.2;
		}
	}

	if (invalidCoords.length > 0) {
		warnings.push(`检测到异常坐标：${invalidCoords.join(', ')}`);
	}

	// Check anatomical consistency
	const anatomicalIssues = checkAnatomicalConsistency(pose);
	issues.push(...anatomicalIssues);

	// Check for pose anomalies
	const anomalies = detectPoseAnomalies(pose);
	issues.push(...anomalies);

	// Calculate overall confidence
	const confidence = Math.max(0, 1 - totalConfidenceImpact);

	// Determine quality level
	let quality: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';
	const criticalIssues = issues.filter(i => i.severity === 'critical').length;
	const warningIssues = issues.filter(i => i.severity === 'warning').length;

	if (criticalIssues > 0 || confidence < 0.3) {
		quality = 'poor';
	} else if (criticalIssues === 0 && warningIssues <= 2 && confidence >= 0.7) {
		quality = 'excellent';
	} else if (warningIssues <= 4 && confidence >= 0.5) {
		quality = 'good';
	} else {
		quality = 'fair';
	}

	// Generate suggestions based on issues
	if (issues.some(i => i.type === 'missing_keypoint')) {
		suggestions.push('建议重新拍摄，确保人物完整可见');
	}

	if (issues.some(i => i.type === 'low_visibility')) {
		suggestions.push('改善光线条件以提高检测精度');
	}

	if (issues.some(i => i.type === 'invalid_coord')) {
		suggestions.push('调整拍摄角度，确保人物在画面中央');
	}

	if (anatomicalIssues.length > 0) {
		suggestions.push('检查姿势是否自然，避免过度扭曲');
	}

	return {
		isValid: criticalIssues === 0 || !strict,
		confidence,
		issues,
		warnings,
		suggestions,
		quality
	};
}

// Check anatomical consistency
function checkAnatomicalConsistency(pose: Pose): ValidationIssue[] {
	const issues: ValidationIssue[] = [];

	// Check shoulder alignment
	if (pose.left_shoulder && pose.right_shoulder) {
		const yDiff = Math.abs(pose.left_shoulder.y - pose.right_shoulder.y);
		if (yDiff > 0.15) {
			issues.push({
				type: 'inconsistent',
				severity: 'warning',
				message: `肩膀高度差异过大 (${(yDiff * 100).toFixed(1)}%)`,
				affectedParts: ['left_shoulder', 'right_shoulder'],
				confidenceImpact: 0.15
			});
		}
	}

	// Check arm proportions
	if (pose.left_shoulder && pose.left_elbow && pose.left_wrist) {
		const shoulderToElbow = Math.abs(pose.left_elbow.y - pose.left_shoulder.y);
		const elbowToWrist = Math.abs(pose.left_wrist.y - pose.left_elbow.y);
		const ratio = elbowToWrist / (shoulderToElbow || 1);

		if (ratio > 2 || ratio < 0.3) {
			issues.push({
				type: 'anomaly',
				severity: 'warning',
				message: `左臂比例异常 (比值: ${ratio.toFixed(2)})`,
				affectedParts: ['left_shoulder', 'left_elbow', 'left_wrist'],
				confidenceImpact: 0.1
			});
		}
	}

	// Same for right arm
	if (pose.right_shoulder && pose.right_elbow && pose.right_wrist) {
		const shoulderToElbow = Math.abs(pose.right_elbow.y - pose.right_shoulder.y);
		const elbowToWrist = Math.abs(pose.right_wrist.y - pose.right_elbow.y);
		const ratio = elbowToWrist / (shoulderToElbow || 1);

		if (ratio > 2 || ratio < 0.3) {
			issues.push({
				type: 'anomaly',
				severity: 'warning',
				message: `右臂比例异常 (比值: ${ratio.toFixed(2)})`,
				affectedParts: ['right_shoulder', 'right_elbow', 'right_wrist'],
				confidenceImpact: 0.1
			});
		}
	}

	// Check if hips are aligned with shoulders
	if (pose.left_shoulder && pose.right_shoulder && pose.left_hip && pose.right_hip) {
		const shoulderCenter = (pose.left_shoulder.x + pose.right_shoulder.x) / 2;
		const hipCenter = (pose.left_hip.x + pose.right_hip.x) / 2;
		const alignment = Math.abs(shoulderCenter - hipCenter);

		if (alignment > 0.1) {
			issues.push({
				type: 'inconsistent',
				severity: 'info',
				message: `躯干偏离中心线 (${(alignment * 100).toFixed(1)}%)`,
				affectedParts: ['shoulders', 'hips'],
				confidenceImpact: 0.05
			});
		}
	}

	return issues;
}

// Detect pose anomalies
function detectPoseAnomalies(pose: Pose): ValidationIssue[] {
	const issues: ValidationIssue[] = [];

	// Check for impossible poses (limbs bent backwards)
	if (pose.left_elbow && pose.left_shoulder && pose.left_wrist) {
		// Wrist should be below elbow for natural poses
		if (pose.left_wrist.y < pose.left_elbow.y && pose.left_wrist.y < pose.left_shoulder.y) {
			issues.push({
				type: 'anomaly',
				severity: 'warning',
				message: '左手位置异常（可能检测错误）',
				affectedParts: ['left_wrist'],
				confidenceImpact: 0.2
			});
		}
	}

	if (pose.right_elbow && pose.right_shoulder && pose.right_wrist) {
		if (pose.right_wrist.y < pose.right_elbow.y && pose.right_wrist.y < pose.right_shoulder.y) {
			issues.push({
				type: 'anomaly',
				severity: 'warning',
				message: '右手位置异常（可能检测错误）',
				affectedParts: ['right_wrist'],
				confidenceImpact: 0.2
			});
		}
	}

	// Check for extreme body proportions
	if (pose.nose && pose.left_hip && pose.right_hip) {
		const hipY = (pose.left_hip.y + pose.right_hip.y) / 2;
		const torsoHeight = hipY - pose.nose.y;

		// Torso should be roughly 40-50% of image height
		if (torsoHeight < 0.2) {
			issues.push({
				type: 'anomaly',
				severity: 'warning',
				message: '躯干过短（可能只检测到面部）',
				affectedParts: ['nose', 'hips'],
				confidenceImpact: 0.25
			});
		} else if (torsoHeight > 0.6) {
			issues.push({
				type: 'anomaly',
				severity: 'info',
				message: '躯干比例异常（可能是透视效果）',
				affectedParts: ['nose', 'hips'],
				confidenceImpact: 0.1
			});
		}
	}

	return issues;
}

// Validate pose before using it
export function ensurePoseQuality(pose: Pose, minQuality: 'good' | 'fair' = 'good'): Pose {
	const validation = validatePose(pose);

	const qualityLevels = { poor: 0, fair: 1, good: 2, excellent: 3 };
	const minLevel = qualityLevels[minQuality];
	const currentLevel = qualityLevels[validation.quality];

	if (currentLevel < minLevel) {
		// Pose doesn't meet quality threshold, try to fix issues
		let fixedPose = { ...pose };

		// Fix out-of-range coordinates
		for (const [key, keypoint] of Object.entries(fixedPose)) {
			if (!keypoint) continue;

			if (keypoint.x !== undefined) {
				keypoint.x = Math.max(0, Math.min(1, keypoint.x));
			}
			if (keypoint.y !== undefined) {
				keypoint.y = Math.max(0, Math.min(1, keypoint.y));
			}
			if (keypoint.visibility !== undefined) {
				keypoint.visibility = Math.max(0, Math.min(1, keypoint.visibility));
			}
		}

		// Recalculate confidence
		const revalidation = validatePose(fixedPose);
		if (qualityLevels[revalidation.quality] >= minLevel) {
			return fixedPose;
		}
	}

	return pose;
}

// Get pose quality metrics
export function getPoseQualityMetrics(pose: Pose): {
	completeness: number; // Percentage of keypoints present
	visibility: number; // Average visibility
	stability: number; // Pose stability score
	overall: number; // Overall quality score
} {
	const totalKeypoints = 17;
	const presentKeypoints = Object.entries(pose).filter(([_, kp]) => kp && kp.visibility > 0).length;
	const completeness = presentKeypoints / totalKeypoints;

	let totalVisibility = 0;
	let visibleCount = 0;

	for (const [_, keypoint] of Object.entries(pose)) {
		if (keypoint && keypoint.visibility !== undefined) {
			totalVisibility += keypoint.visibility;
			visibleCount++;
		}
	}

	const visibility = visibleCount > 0 ? totalVisibility / visibleCount : 0;

	// Stability based on anatomical consistency
	const anatomicalIssues = checkAnatomicalConsistency(pose);
	const stability = Math.max(0, 1 - anatomicalIssues.length * 0.15);

	// Overall quality is weighted average
	const overall = completeness * 0.4 + visibility * 0.3 + stability * 0.3;

	return {
		completeness,
		visibility,
		stability,
		overall
	};
}
