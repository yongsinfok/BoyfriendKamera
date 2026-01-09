import type { Pose, PoseKeypoint } from '$lib/types';

/**
 * Multi-person pose detection and analysis utilities
 */

export interface PersonPose {
	id: string;
	pose: Pose;
	boundingBox: {
		x: number; // normalized 0-1
		y: number;
		width: number;
		height: number;
	};
	confidence: number;
	isPrimary: boolean; // Main subject
}

export interface MultiPoseAnalysis {
	peopleCount: number;
	primaryPerson: PersonPose | null;
	secondaryPeople: PersonPose[];
	spatialRelationship: string; // 'side_by_side', 'front_back', 'intertwined', 'separated'
	grouping: {
		isGroup: boolean;
		isCouple: boolean;
		isFamily: boolean;
	};
	composition: {
		balance: 'good' | 'fair' | 'poor';
		spacing: 'good' | 'fair' | 'poor';
		overlap: boolean;
	};
}

// Detect bounding box for a pose
export function calculateBoundingBox(pose: Pose): { x: number; y: number; width: number; height: number } {
	const keypoints = Object.values(pose).filter((kp) => kp && kp.visibility > 0.5);
	if (keypoints.length === 0) return { x: 0, y: 0, width: 0, height: 0 };

	let minX = 1, minY = 1, maxX = 0, maxY = 0;
	for (const kp of keypoints) {
		if (kp.x < minX) minX = kp.x;
		if (kp.x > maxX) maxX = kp.x;
		if (kp.y < minY) minY = kp.y;
		if (kp.y > maxY) maxY = kp.y;
	}

	return {
		x: minX,
		y: minY,
		width: maxX - minX,
		height: maxY - minY
	};
}

// Analyze multiple poses in the same frame
export function analyzeMultiPersonPoses(poses: Pose[]): MultiPoseAnalysis {
	const peopleCount = poses.length;

	// Calculate bounding boxes and assign IDs
	const people: PersonPose[] = poses.map((pose, index) => ({
		id: `person_${index}`,
		pose,
		boundingBox: calculateBoundingBox(pose),
		confidence: 0.8, // Would come from detection model
		isPrimary: false
	}));

	// Determine primary person (largest, most centered, or most visible)
	let primaryPerson: PersonPose | null = null;
	if (people.length > 0) {
		// Sort by size (largest first) and center proximity
		people.sort((a, b) => {
			const sizeA = a.boundingBox.width * a.boundingBox.height;
			const sizeB = b.boundingBox.width * b.boundingBox.height;
			return sizeB - sizeA;
		});

		primaryPerson = people[0];
		primaryPerson.isPrimary = true;
	}

	const secondaryPeople = people.filter((p) => !p.isPrimary);

	// Determine spatial relationship
	let spatialRelationship: string = 'separated';
	if (peopleCount >= 2) {
		const primary = people[0];
		const secondary = people[1];

		// Calculate center points
		const primaryCenter = {
			x: primary.boundingBox.x + primary.boundingBox.width / 2,
			y: primary.boundingBox.y + primary.boundingBox.height / 2
		};
		const secondaryCenter = {
			x: secondary.boundingBox.x + secondary.boundingBox.width / 2,
			y: secondary.boundingBox.y + secondary.boundingBox.height / 2
		};

		// Horizontal distance
		const dx = Math.abs(primaryCenter.x - secondaryCenter.x);
		// Vertical distance (depth indicator)
		const dy = Math.abs(primaryCenter.y - secondaryCenter.y);
		const distance = Math.sqrt(dx * dx + dy * dy);

		if (distance < 0.15) {
			spatialRelationship = 'intertwined';
		} else if (dx > dy && dx > 0.2) {
			spatialRelationship = 'side_by_side';
		} else if (dy > dx && dy > 0.1) {
			spatialRelationship = 'front_back';
		} else {
			spatialRelationship = 'separated';
		}
	}

	// Determine grouping
	const grouping = {
		isGroup: peopleCount >= 3,
		isCouple: peopleCount === 2,
		isFamily: peopleCount >= 3 && peopleCount <= 6
	};

	// Evaluate composition
	const composition = {
		balance: evaluateBalance(people) as 'good' | 'fair' | 'poor',
		spacing: evaluateSpacing(people) as 'good' | 'fair' | 'poor',
		overlap: checkOverlap(people)
	};

	return {
		peopleCount,
		primaryPerson,
		secondaryPeople,
		spatialRelationship,
		grouping,
		composition
	};
}

// Evaluate balance of people in frame
function evaluateBalance(people: PersonPose[]): string {
	if (people.length === 0) return 'poor';
	if (people.length === 1) return 'good';

	// Calculate center of mass for all people
	let totalX = 0;
	let totalY = 0;
	for (const person of people) {
		totalX += person.boundingBox.x + person.boundingBox.width / 2;
		totalY += person.boundingBox.y + person.boundingBox.height / 2;
	}
	const centerX = totalX / people.length;
	const centerY = totalY / people.length;

	// Check if center is near image center (0.5, 0.5)
	const distFromCenter = Math.sqrt(
		Math.pow(centerX - 0.5, 2) + Math.pow(centerY - 0.5, 2)
	);

	if (distFromCenter < 0.15) return 'good';
	if (distFromCenter < 0.25) return 'fair';
	return 'poor';
}

// Evaluate spacing between people
function evaluateSpacing(people: PersonPose[]): string {
	if (people.length <= 1) return 'good';

	let minDistance = Infinity;
	for (let i = 0; i < people.length; i++) {
		for (let j = i + 1; j < people.length; j++) {
			const p1 = people[i];
			const p2 = people[j];
			const center1 = {
				x: p1.boundingBox.x + p1.boundingBox.width / 2,
				y: p1.boundingBox.y + p1.boundingBox.height / 2
			};
			const center2 = {
				x: p2.boundingBox.x + p2.boundingBox.width / 2,
				y: p2.boundingBox.y + p2.boundingBox.height / 2
			};
			const dist = Math.sqrt(
				Math.pow(center1.x - center2.x, 2) + Math.pow(center1.y - center2.y, 2)
			);
			if (dist < minDistance) minDistance = dist;
		}
	}

	if (minDistance > 0.15 && minDistance < 0.4) return 'good';
	if (minDistance > 0.05 && minDistance < 0.5) return 'fair';
	return 'poor';
}

// Check if people overlap
function checkOverlap(people: PersonPose[]): boolean {
	for (let i = 0; i < people.length; i++) {
		for (let j = i + 1; j < people.length; j++) {
			const p1 = people[i].boundingBox;
			const p2 = people[j].boundingBox;

			// Check rectangle intersection
			const overlapX = !(p1.x + p1.width < p2.x || p2.x + p2.width < p1.x);
			const overlapY = !(p1.y + p1.height < p2.y || p2.y + p2.height < p1.y);

			if (overlapX && overlapY) return true;
		}
	}
	return false;
}

// Get multi-person pose suggestions
export function getMultiPersonSuggestions(analysis: MultiPoseAnalysis): string[] {
	const suggestions: string[] = [];

	// Balance suggestions
	if (analysis.composition.balance === 'poor') {
		suggestions.push('⚖️ 调整站位，让整体更平衡');
	}

	// Spacing suggestions
	if (analysis.composition.spacing === 'poor') {
		suggestions.push('📏 调整人与人之间的距离');
	}

	// Overlap suggestions
	if (analysis.composition.overlap) {
		suggestions.push('🚫 避免互相遮挡，调整位置');
	}

	// Spatial relationship suggestions
	switch (analysis.spatialRelationship) {
		case 'side_by_side':
			suggestions.push('✅ 并排站位很好，保持自然互动');
			break;
		case 'front_back':
			suggestions.push('💡 前后站位有层次感，确保前面的人不遮挡后面');
			break;
		case 'intertwined':
			suggestions.push('🤝 亲密姿态，注意不要互相遮挡面部');
			break;
		case 'separated':
			suggestions.push('📐 尝试靠近一些，增加互动感');
			break;
	}

	// Count-specific suggestions
	if (analysis.peopleCount === 2) {
		suggestions.push('💑 双人合影经典：可以牵手、挽臂或靠在一起');
	} else if (analysis.peopleCount >= 3) {
		suggestions.push('👨‍👩‍👧‍👦 多人合影：可以前后错落站位，增加层次感');
	}

	return suggestions;
}

// Generate target poses for multiple people
export function generateMultiPersonTargets(analysis: MultiPoseAnalysis): Pose[] {
	const targets: Pose[] = [];

	// Generate poses based on spatial relationship and count
	if (analysis.peopleCount === 2) {
		// Couple poses
		if (analysis.spatialRelationship === 'side_by_side') {
			// Add slight angle variation for natural look
			targets.push(createCouplePose('left'));
			targets.push(createCouplePose('right'));
		} else {
			targets.push(createIntertwinedPose('front'));
			targets.push(createIntertwinedPose('back'));
		}
	} else if (analysis.peopleCount >= 3) {
		// Group poses - create varied poses for visual interest
		for (let i = 0; i < analysis.peopleCount; i++) {
			targets.push(createGroupPose(i, analysis.peopleCount));
		}
	}

	return targets;
}

// Helper to create couple poses
function createCouplePose(position: 'left' | 'right'): Pose {
	if (position === 'left') {
		return {
			nose: { x: 0.38, y: 0.22, visibility: 1 },
			left_shoulder: { x: 0.30, y: 0.4, visibility: 1 },
			right_shoulder: { x: 0.46, y: 0.4, visibility: 1 },
			left_elbow: { x: 0.25, y: 0.52, visibility: 0.9 },
			right_elbow: { x: 0.40, y: 0.52, visibility: 0.9 },
			left_wrist: { x: 0.20, y: 0.65, visibility: 0.85 },
			right_wrist: { x: 0.35, y: 0.65, visibility: 0.85 },
			left_hip: { x: 0.32, y: 0.68, visibility: 0.95 },
			right_hip: { x: 0.44, y: 0.68, visibility: 0.95 }
		};
	} else {
		return {
			nose: { x: 0.62, y: 0.22, visibility: 1 },
			left_shoulder: { x: 0.54, y: 0.4, visibility: 1 },
			right_shoulder: { x: 0.70, y: 0.4, visibility: 1 },
			left_elbow: { x: 0.60, y: 0.52, visibility: 0.9 },
			right_elbow: { x: 0.75, y: 0.52, visibility: 0.9 },
			left_wrist: { x: 0.65, y: 0.65, visibility: 0.85 },
			right_wrist: { x: 0.80, y: 0.65, visibility: 0.85 },
			left_hip: { x: 0.56, y: 0.68, visibility: 0.95 },
			right_hip: { x: 0.68, y: 0.68, visibility: 0.95 }
		};
	}
}

// Helper to create intertwined poses
function createIntertwinedPose(position: 'front' | 'back'): Pose {
	// Simplified for front/back positioning
	if (position === 'front') {
		return {
			nose: { x: 0.48, y: 0.20, visibility: 1 },
			left_shoulder: { x: 0.40, y: 0.38, visibility: 1 },
			right_shoulder: { x: 0.56, y: 0.38, visibility: 1 }
		};
	} else {
		return {
			nose: { x: 0.52, y: 0.24, visibility: 1 },
			left_shoulder: { x: 0.44, y: 0.42, visibility: 1 },
			right_shoulder: { x: 0.60, y: 0.42, visibility: 1 }
		};
	}
}

// Helper to create group poses
function createGroupPose(index: number, total: number): Pose {
	// Distribute people across the frame
	const xPos = 0.2 + (index / (total - 1 || 1)) * 0.6;
	return {
		nose: { x: xPos, y: 0.22, visibility: 1 },
		left_shoulder: { x: xPos - 0.08, y: 0.4, visibility: 1 },
		right_shoulder: { x: xPos + 0.08, y: 0.4, visibility: 1 }
	};
}
