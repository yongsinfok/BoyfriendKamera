import type { Pose, PoseKeypoint } from '$lib/types';
import { BODY_PART_WEIGHTS } from '$lib/data/poseTemplates';

/**
 * Advanced pose matching utilities for accurate pose comparison
 */

// Calculate Euclidean distance between two keypoints
export function calculateKeypointDistance(
	kp1: PoseKeypoint,
	kp2: PoseKeypoint
): number {
	const dx = kp1.x - kp2.x;
	const dy = kp1.y - kp2.y;
	return Math.sqrt(dx * dx + dy * dy);
}

// Calculate weighted pose match score
export function calculatePoseMatchScore(
	pose1: Pose,
	pose2: Pose,
	options?: {
		threshold?: number; // Distance threshold for considering a match
		useWeights?: boolean; // Use body part importance weights
	}
): {
	score: number; // 0-100 match score
	matchedKeypoints: number;
	totalKeypoints: number;
	averageDistance: number;
} {
	const threshold = options?.threshold ?? 0.15;
	const useWeights = options?.useWeights ?? true;

	let totalWeight = 0;
	let weightedDistance = 0;
	let matchedCount = 0;
	let totalCount = 0;

	for (const [key, kp1] of Object.entries(pose1)) {
		const kp2 = pose2[key as keyof Pose];
		if (!kp1 || !kp2) continue;

		totalCount++;
		const weight = useWeights ? (BODY_PART_WEIGHTS[key as keyof typeof BODY_PART_WEIGHTS] || 1.0) : 1.0;
		const distance = calculateKeypointDistance(kp1, kp2);

		if (distance <= threshold) {
			matchedCount++;
		}

		weightedDistance += distance * weight;
		totalWeight += weight;
	}

	if (totalCount === 0) {
		return { score: 0, matchedKeypoints: 0, totalKeypoints: 0, averageDistance: 1 };
	}

	const avgDistance = weightedDistance / totalWeight;
	const score = Math.max(0, 100 - (avgDistance / threshold) * 100);

	return {
		score: Math.round(score),
		matchedKeypoints: matchedCount,
		totalKeypoints: totalCount,
		averageDistance: avgDistance
	};
}

// Find the best matching pose from a list of templates
export function findBestMatchingPose(
	currentPose: Pose,
	templates: Record<string, any>
): {
	templateKey: string;
	templateName: string;
	matchScore: number;
	pose: Pose;
} | null {
	let bestMatch: {
		templateKey: string;
		templateName: string;
		matchScore: number;
		pose: Pose;
	} | null = null;
	let bestScore = -1;

	for (const [key, template] of Object.entries(templates)) {
		if (!template.pose) continue;

		const result = calculatePoseMatchScore(currentPose, template.pose, {
			threshold: 0.2,
			useWeights: true
		});

		if (result.score > bestScore) {
			bestScore = result.score;
			bestMatch = {
				templateKey: key,
				templateName: template.name,
				matchScore: result.score,
				pose: template.pose
			};
		}
	}

	return bestMatch;
}

// Calculate pose symmetry (how symmetrical left/right sides are)
export function calculatePoseSymmetry(pose: Pose): {
	symmetryScore: number; // 0-100
	asymmetricalParts: string[];
} {
	const symmetryPairs: Array<[string, string]> = [
		['left_shoulder', 'right_shoulder'],
		['left_elbow', 'right_elbow'],
		['left_wrist', 'right_wrist'],
		['left_hip', 'right_hip'],
		['left_knee', 'right_knee'],
		['left_ankle', 'right_ankle']
	];

	let totalDeviation = 0;
	let pairCount = 0;
	const asymmetricalParts: string[] = [];

	for (const [leftKey, rightKey] of symmetryPairs) {
		const leftKp = pose[leftKey as keyof Pose];
		const rightKp = pose[rightKey as keyof Pose];

		if (!leftKp || !rightKp) continue;

		// Mirror the left side to compare with right side
		const mirroredLeftX = 1 - leftKp.x;
		const dx = Math.abs(mirroredLeftX - rightKp.x);
		const dy = Math.abs(leftKp.y - rightKp.y);
		const deviation = Math.sqrt(dx * dx + dy * dy);

		totalDeviation += deviation;
		pairCount++;

		if (deviation > 0.1) {
			asymmetricalParts.push(leftKey.replace('left_', ''));
		}
	}

	if (pairCount === 0) {
		return { symmetryScore: 100, asymmetricalParts: [] };
	}

	const avgDeviation = totalDeviation / pairCount;
	const symmetryScore = Math.max(0, 100 - avgDeviation * 200);

	return {
		symmetryScore: Math.round(symmetryScore),
		asymmetricalParts
	};
}

// Detect pose quality issues
export function detectPoseIssues(pose: Pose): Array<{
	issue: string;
	severity: 'high' | 'medium' | 'low';
	affectedParts: string[];
	suggestion: string;
}> {
	const issues: Array<{
		issue: string;
		severity: 'high' | 'medium' | 'low';
		affectedParts: string[];
		suggestion: string;
	}> = [];

	// Check shoulder level
	const leftShoulder = pose.left_shoulder;
	const rightShoulder = pose.right_shoulder;
	if (leftShoulder && rightShoulder) {
		const shoulderDiff = Math.abs(leftShoulder.y - rightShoulder.y);
		if (shoulderDiff > 0.05) {
			issues.push({
				issue: '肩膀不平',
				severity: 'high',
				affectedParts: ['肩膀'],
				suggestion: '保持肩膀水平，放松下沉'
			});
		}
	}

	// Check shoulder tension (width too narrow or wide)
	if (leftShoulder && rightShoulder) {
		const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
		if (shoulderWidth < 0.12) {
			issues.push({
				issue: '肩膀太窄',
				severity: 'medium',
				affectedParts: ['肩膀'],
				suggestion: '打开肩膀，展现自信姿态'
			});
		} else if (shoulderWidth > 0.25) {
			issues.push({
				issue: '肩膀太宽',
				severity: 'low',
				affectedParts: ['肩膀'],
				suggestion: '稍微收拢肩膀，更自然'
			});
		}
	}

	// Check arm positions
	const leftElbow = pose.left_elbow;
	const rightElbow = pose.right_elbow;
	if (leftElbow && rightElbow && leftShoulder && rightShoulder) {
		// Check if elbows are too far from shoulders
		const leftArmSpread = Math.abs(leftElbow.x - leftShoulder.x);
		const rightArmSpread = Math.abs(rightElbow.x - rightShoulder.x);

		if (leftArmSpread > 0.3 || rightArmSpread > 0.3) {
			issues.push({
				issue: '手臂过度张开',
				severity: 'medium',
				affectedParts: ['手臂'],
				suggestion: '收紧手臂，更优雅自然'
			});
		}
	}

	// Check head position
	const nose = pose.nose;
	if (nose) {
		if (nose.y < 0.15) {
			issues.push({
				issue: '头部位置太高',
				severity: 'high',
				affectedParts: ['头部'],
				suggestion: '稍微降低头部，留出空间'
			});
		} else if (nose.y > 0.4) {
			issues.push({
				issue: '头部位置太低',
				severity: 'medium',
				affectedParts: ['头部'],
				suggestion: '抬起头部，展现自信'
			});
		}
	}

	return issues.sort((a, b) => {
		const severityOrder = { high: 0, medium: 1, low: 2 };
		return severityOrder[a.severity] - severityOrder[b.severity];
	});
}

// Calculate pose difficulty based on complexity
export function calculatePoseDifficulty(pose: Pose): {
	difficulty: number; // 1-5
	factors: string[];
} {
	const factors: string[] = [];
	let difficultyScore = 1; // Base difficulty

	// Count visible keypoints
	const visibleKeypoints = Object.values(pose).filter((kp) => kp && kp.visibility > 0.5).length;
	if (visibleKeypoints > 10) {
		difficultyScore += 1;
		factors.push('需要控制多个身体部位');
	}

	// Check for asymmetrical poses
	const symmetry = calculatePoseSymmetry(pose);
	if (symmetry.symmetryScore < 70) {
		difficultyScore += 1;
		factors.push('不对称姿势需要更多练习');
	}

	// Check for arm elevation
	const leftElbow = pose.left_elbow;
	const rightElbow = pose.right_elbow;
	const leftShoulder = pose.left_shoulder;
	const rightShoulder = pose.right_shoulder;

	if (leftElbow && leftShoulder && leftElbow.y < leftShoulder.y) {
		difficultyScore += 0.5;
		factors.push('左手抬高需要平衡');
	}
	if (rightElbow && rightShoulder && rightElbow.y < rightShoulder.y) {
		difficultyScore += 0.5;
		factors.push('右手抬高需要平衡');
	}

	return {
		difficulty: Math.min(5, Math.round(difficultyScore)),
		factors
	};
}
