import type { Pose } from '$lib/types';

// Body part importance weights (higher = more important for good photos)
export const BODY_PART_WEIGHTS = {
	nose: 2.0, // Face position is critical
	left_eye: 1.5,
	right_eye: 1.5,
	left_ear: 0.8,
	right_ear: 0.8,
	left_shoulder: 1.2, // Important for posture
	right_shoulder: 1.2,
	left_elbow: 1.0,
	right_elbow: 1.0,
	left_wrist: 0.9, // Hand positioning important
	right_wrist: 0.9,
	left_hip: 1.0,
	right_hip: 1.0,
	left_knee: 0.7,
	right_knee: 0.7,
	left_ankle: 0.5,
	right_ankle: 0.5
};

// Professional pose templates library with enhanced metadata
export const POSE_TEMPLATES = {
	// Portrait poses (best for individual shots)
	portrait_natural: {
		name: '自然站立',
		description: '自然、放松的站立姿势',
		difficulty: 1, // 1-5 scale, 1 = easiest
		category: 'portrait',
		pose: {
			nose: { x: 0.5, y: 0.22, visibility: 1 },
			left_shoulder: { x: 0.42, y: 0.4, visibility: 1 },
			right_shoulder: { x: 0.58, y: 0.4, visibility: 1 },
			left_elbow: { x: 0.38, y: 0.52, visibility: 0.9 },
			right_elbow: { x: 0.62, y: 0.52, visibility: 0.9 },
			left_wrist: { x: 0.35, y: 0.65, visibility: 0.85 },
			right_wrist: { x: 0.65, y: 0.65, visibility: 0.85 },
			left_hip: { x: 0.44, y: 0.68, visibility: 0.95 },
			right_hip: { x: 0.56, y: 0.68, visibility: 0.95 }
		},
		tips: ['肩膀放松', '双手自然下垂', '身体微微侧转'],
		// Step-by-step instructions
		steps: [
			'双脚与肩同宽，自然站立',
			'肩膀向下放松，不要耸肩',
			'双手自然放在身体两侧',
			'身体微微向左或右转动15度',
			'头部保持水平，看向前方'
		],
		// Common mistakes to avoid
		commonMistakes: [
			{ mistake: '肩膀紧张耸起', correction: '深呼吸，让肩膀自然下沉' },
			{ mistake: '双手僵硬', correction: '手指微曲，手腕放松' },
			{ mistake: '身体完全正面', correction: '微微侧身更自然' }
		]
	},

	portrait_elegant: {
		name: '优雅手势',
		description: '一只手轻抚头发，展现优雅',
		difficulty: 2,
		category: 'portrait',
		pose: {
			nose: { x: 0.48, y: 0.2, visibility: 1 },
			left_shoulder: { x: 0.4, y: 0.38, visibility: 1 },
			right_shoulder: { x: 0.58, y: 0.38, visibility: 1 },
			left_elbow: { x: 0.32, y: 0.48, visibility: 0.9 },
			right_elbow: { x: 0.65, y: 0.5, visibility: 0.9 },
			left_wrist: { x: 0.28, y: 0.35, visibility: 0.85 }, // Hand near hair
			right_wrist: { x: 0.7, y: 0.62, visibility: 0.85 },
			left_hip: { x: 0.43, y: 0.66, visibility: 0.95 },
			right_hip: { x: 0.55, y: 0.66, visibility: 0.95 }
		},
		tips: ['左手轻抚头发', '右手自然放置', '头部微微倾斜'],
		steps: [
			'自然站立，双脚与肩同宽',
			'左手慢慢抬起至头部高度',
			'手指轻触头发，不要用力按压',
			'右手自然放在身侧',
			'头部向右手方向微微倾斜10度'
		],
		commonMistakes: [
			{ mistake: '手用力抓头发', correction: '轻轻触摸，手指自然放松' },
			{ mistake: '动作僵硬', correction: '手腕微微弯曲，显得更柔和' },
			{ mistake: '肩膀紧张', correction: '肩膀下沉，保持优雅姿态' }
		]
	},

	portrait_dynamic: {
		name: '活力姿势',
		description: '双臂张开，充满活力',
		difficulty: 3,
		category: 'portrait',
		pose: {
			nose: { x: 0.5, y: 0.2, visibility: 1 },
			left_shoulder: { x: 0.38, y: 0.38, visibility: 1 },
			right_shoulder: { x: 0.62, y: 0.38, visibility: 1 },
			left_elbow: { x: 0.28, y: 0.38, visibility: 0.9 },
			right_elbow: { x: 0.72, y: 0.38, visibility: 0.9 },
			left_wrist: { x: 0.18, y: 0.35, visibility: 0.85 },
			right_wrist: { x: 0.82, y: 0.35, visibility: 0.85 },
			left_hip: { x: 0.42, y: 0.66, visibility: 0.95 },
			right_hip: { x: 0.58, y: 0.66, visibility: 0.95 }
		},
		tips: ['双臂向上张开', '展现自信活力', '笑容灿烂'],
		steps: [
			'双脚分开与肩同宽，站稳',
			'深呼吸，准备动作',
			'双臂快速向上举起成V字形',
			'手臂尽量伸直，但不要过度',
			'露出灿烂的笑容，眼神有神'
		],
		commonMistakes: [
			{ mistake: '手臂过度伸直', correction: '手肘微微弯曲，更自然' },
			{ mistake: '表情僵硬', correction: '放松面部，自然笑容' },
			{ mistake: '动作犹豫', correction: '一气呵成，充满自信' }
		]
	},

	// Casual poses
	casual_lean: {
		name: '轻松倚靠',
		description: '身体微微后倾，轻松自然',
		difficulty: 2,
		category: 'casual',
		pose: {
			nose: { x: 0.52, y: 0.25, visibility: 1 },
			left_shoulder: { x: 0.4, y: 0.42, visibility: 1 },
			right_shoulder: { x: 0.6, y: 0.42, visibility: 1 },
			left_elbow: { x: 0.35, y: 0.55, visibility: 0.9 },
			right_elbow: { x: 0.65, y: 0.5, visibility: 0.9 },
			left_wrist: { x: 0.32, y: 0.68, visibility: 0.8 },
			right_wrist: { x: 0.68, y: 0.62, visibility: 0.85 },
			left_hip: { x: 0.45, y: 0.7, visibility: 0.95 },
			right_hip: { x: 0.57, y: 0.7, visibility: 0.95 }
		},
		tips: ['身体微微后倾', '一只手插口袋', '表情轻松自然'],
		steps: [
			'找一面墙或支撑物',
			'背部轻轻靠在支撑物上',
			'一只手自然插入口袋',
			'另一只手放在身侧',
			'身体重心稍微向后，保持平衡'
		],
		commonMistakes: [
			{ mistake: '完全靠在墙上', correction: '轻轻倚靠，保持身体活力' },
			{ mistake: '姿势不自然', correction: '保持身体微微紧张，不要完全放松' },
			{ mistake: '双手都插口袋', correction: '留一只手在外面，更有层次感' }
		]
	},

	casual_sitting: {
		name: '坐姿优雅',
		description: '坐姿挺直，双手放在膝盖上',
		difficulty: 2,
		category: 'casual',
		pose: {
			nose: { x: 0.5, y: 0.25, visibility: 1 },
			left_shoulder: { x: 0.4, y: 0.42, visibility: 1 },
			right_shoulder: { x: 0.6, y: 0.42, visibility: 1 },
			left_elbow: { x: 0.38, y: 0.58, visibility: 0.9 },
			right_elbow: { x: 0.62, y: 0.58, visibility: 0.9 },
			left_wrist: { x: 0.35, y: 0.75, visibility: 0.85 },
			right_wrist: { x: 0.65, y: 0.75, visibility: 0.85 },
			left_hip: { x: 0.42, y: 0.72, visibility: 0.95 },
			right_hip: { x: 0.58, y: 0.72, visibility: 0.95 },
			left_knee: { x: 0.4, y: 0.85, visibility: 0.8 },
			right_knee: { x: 0.6, y: 0.85, visibility: 0.8 }
		},
		tips: ['上半身挺直', '双手放在膝盖上', '双腿并拢或交叉'],
		steps: [
			'坐在椅子边缘，不要坐满',
			'上半身挺直，不要驼背',
			'双手轻轻放在膝盖上',
			'双腿可以并拢或交叉',
			'保持背部挺直，肩膀放松'
		],
		commonMistakes: [
			{ mistake: '坐得太靠后', correction: '坐在椅子前三分之一处' },
			{ mistake: '驼背', correction: '挺直背部，保持优雅姿态' },
			{ mistake: '双腿分得太开', correction: '双腿并拢或优雅交叉' }
		]
	},

	// Artistic poses
	artistic_side: {
		name: '侧身艺术',
		description: '身体侧转45度，展现轮廓美',
		difficulty: 3,
		category: 'artistic',
		pose: {
			nose: { x: 0.55, y: 0.22, visibility: 1 },
			left_shoulder: { x: 0.45, y: 0.38, visibility: 1 },
			right_shoulder: { x: 0.62, y: 0.38, visibility: 1 },
			left_elbow: { x: 0.38, y: 0.5, visibility: 0.9 },
			right_elbow: { x: 0.68, y: 0.48, visibility: 0.9 },
			left_wrist: { x: 0.32, y: 0.65, visibility: 0.85 },
			right_wrist: { x: 0.75, y: 0.58, visibility: 0.85 },
			left_hip: { x: 0.43, y: 0.66, visibility: 0.95 },
			right_hip: { x: 0.58, y: 0.66, visibility: 0.95 }
		},
		tips: ['身体侧转45度', '头部转向相机', '展现身体曲线'],
		steps: [
			'自然站立，双脚与肩同宽',
			'身体向右转动45度',
			'双脚保持原位，只转动上半身',
			'头部转向相机，保持正面',
			'调整手臂位置，展现身体曲线'
		],
		commonMistakes: [
			{ mistake: '转得太夸张', correction: '保持45度左右，不要过度' },
			{ mistake: '头部跟着身体转', correction: '头部转回相机方向' },
			{ mistake: '手臂位置尴尬', correction: '自然放置，展现身体线条' }
		]
	},

	artistic_triangle: {
		name: '三角形构图',
		description: '手臂形成三角形，经典构图',
		difficulty: 3,
		category: 'artistic',
		pose: {
			nose: { x: 0.5, y: 0.2, visibility: 1 },
			left_shoulder: { x: 0.38, y: 0.38, visibility: 1 },
			right_shoulder: { x: 0.62, y: 0.38, visibility: 1 },
			left_elbow: { x: 0.32, y: 0.52, visibility: 0.9 },
			right_elbow: { x: 0.68, y: 0.52, visibility: 0.9 },
			left_wrist: { x: 0.28, y: 0.7, visibility: 0.85 },
			right_wrist: { x: 0.72, y: 0.7, visibility: 0.85 },
			left_hip: { x: 0.42, y: 0.68, visibility: 0.95 },
			right_hip: { x: 0.58, y: 0.68, visibility: 0.95 }
		},
		tips: ['双手在腰部形成三角形', '经典的稳定构图', '适合全身照'],
		steps: [
			'自然站立，双脚与肩同宽',
			'双手抬起至腰部高度',
			'手肘向外打开，手肘高于手腕',
			'双手指尖相对，形成三角形',
			'保持三角形稳定，拍照'
		],
		commonMistakes: [
			{ mistake: '三角形不对称', correction: '确保左右手肘高度一致' },
			{ mistake: '手臂位置过高或过低', correction: '手肘在腰部，手腕在臀部' },
			{ mistake: '肩膀紧张', correction: '放松肩膀，保持自然' }
		]
	},

	// Couple poses
	couple_close: {
		name: '情侣亲密',
		description: '两人靠近，展现亲密关系',
		difficulty: 2,
		category: 'couple',
		pose: {
			// Person 1 (left)
			nose: { x: 0.4, y: 0.25, visibility: 1 },
			left_shoulder: { x: 0.32, y: 0.42, visibility: 1 },
			right_shoulder: { x: 0.48, y: 0.42, visibility: 1 }
		},
		tips: ['两人靠近', '头微微靠在一起', '展现亲密关系'],
		steps: [
			'两人并排站立，距离拉近',
			'肩膀轻轻接触',
			'头部微微向对方靠拢',
			'可以牵手或拥抱',
			'同步看向镜头或彼此'
		],
		commonMistakes: [
			{ mistake: '距离太远', correction: '拉近距离，展现亲密感' },
			{ mistake: '姿势僵硬', correction: '放松身体，自然靠在一起' },
			{ mistake: '视线不一致', correction: '同步看镜头或看对方' }
		]
	},

	couple_back_to_back: {
		name: '背对背',
		description: '背对背站立，展现个性',
		difficulty: 2,
		category: 'couple',
		pose: {
			// Person 1 (facing left)
			nose: { x: 0.35, y: 0.22, visibility: 1 },
			left_shoulder: { x: 0.28, y: 0.4, visibility: 1 },
			right_shoulder: { x: 0.42, y: 0.4, visibility: 1 }
		},
		tips: ['背对背站立', '各自看向镜头', '展现个性与默契'],
		steps: [
			'两人背对背站立',
			'背部轻轻接触',
			'各自看向不同方向',
			'可以各自摆出喜欢的姿势',
			'保持身体平衡'
		],
		commonMistakes: [
			{ mistake: '没有接触', correction: '背部轻轻靠在一起' },
			{ mistake: '姿势不协调', correction: '商量好各自的姿势' },
			{ mistake: '距离太远', correction: '靠近一点，展现默契' }
		]
	}
} as const;

// Get recommended pose based on style and context
export function getRecommendedPose(style?: string, context?: { peopleCount: number; isFullBody: boolean }): Pose {
	// Default to natural standing pose
	return POSE_TEMPLATES.portrait_natural.pose;
}

// Calculate weighted pose accuracy score (0-100)
export function calculatePoseAccuracy(targetPose: Pose, currentPose: Pose): number {
	let totalWeight = 0;
	let weightedError = 0;

	for (const [key, targetKeypoint] of Object.entries(targetPose)) {
		const currentKeypoint = currentPose[key as keyof Pose];
		const weight = BODY_PART_WEIGHTS[key as keyof typeof BODY_PART_WEIGHTS] || 1.0;

		if (!targetKeypoint || !currentKeypoint) continue;

		// Calculate Euclidean distance between target and current
		const dx = targetKeypoint.x - currentKeypoint.x;
		const dy = targetKeypoint.y - currentKeypoint.y;
		const distance = Math.sqrt(dx * dx + dy * dy);

		// Normalize error (distance 0 = perfect, distance 0.3+ = very bad)
		const error = Math.min(distance / 0.3, 1.0);

		weightedError += error * weight;
		totalWeight += weight;
	}

	if (totalWeight === 0) return 0;

	// Convert to accuracy score (0-100)
	const avgError = weightedError / totalWeight;
	return Math.max(0, Math.min(100, (1 - avgError) * 100));
}

// Get specific adjustments needed for each body part
export function getPoseAdjustments(targetPose: Pose, currentPose: Pose): Array<{
	bodyPart: string;
	direction: string;
	amount: number;
	urgency: 'high' | 'medium' | 'low';
}> {
	const adjustments: Array<{
		bodyPart: string;
		direction: string;
		amount: number;
		urgency: 'high' | 'medium' | 'low';
	}> = [];

	const bodyPartNames: Record<string, string> = {
		nose: '头部',
		left_shoulder: '左肩',
		right_shoulder: '右肩',
		left_elbow: '左肘',
		right_elbow: '右肘',
		left_wrist: '左手',
		right_wrist: '右手',
		left_hip: '左臀',
		right_hip: '右臀',
		left_knee: '左膝',
		right_knee: '右膝'
	};

	for (const [key, targetKeypoint] of Object.entries(targetPose)) {
		const currentKeypoint = currentPose[key as keyof Pose];
		if (!targetKeypoint || !currentKeypoint) continue;

		const dx = targetKeypoint.x - currentKeypoint.x;
		const dy = targetKeypoint.y - currentKeypoint.y;
		const distance = Math.sqrt(dx * dx + dy * dy);

		// Only report significant deviations
		if (distance > 0.05) {
			const bodyPart = bodyPartNames[key] || key;
			const weight = BODY_PART_WEIGHTS[key as keyof typeof BODY_PART_WEIGHTS] || 1.0;

			// Determine direction
			let direction = '';
			if (Math.abs(dx) > Math.abs(dy)) {
				direction = dx > 0 ? '向右移动' : '向左移动';
			} else {
				direction = dy > 0 ? '向下移动' : '向上移动';
			}

			// Determine urgency based on weight and distance
			let urgency: 'high' | 'medium' | 'low' = 'low';
			if (weight >= 1.5 && distance > 0.1) urgency = 'high';
			else if (weight >= 1.0 && distance > 0.08) urgency = 'medium';
			else if (distance > 0.15) urgency = 'high';

			adjustments.push({
				bodyPart,
				direction,
				amount: Math.round(distance * 100),
				urgency
			});
		}
	}

	// Sort by urgency and amount
	return adjustments.sort((a, b) => {
		const urgencyOrder = { high: 0, medium: 1, low: 2 };
		if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
			return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
		}
		return b.amount - a.amount;
	});
}

// Get poses by difficulty level
export function getPosesByDifficulty(maxDifficulty: number) {
	return Object.entries(POSE_TEMPLATES)
		.filter(([_, pose]) => pose.difficulty <= maxDifficulty)
		.map(([key, pose]) => ({ key, ...pose }));
}

// Get poses by category
export function getPosesByCategory(category: string) {
	return Object.entries(POSE_TEMPLATES)
		.filter(([_, pose]) => pose.category === category)
		.map(([key, pose]) => ({ key, ...pose }));
}
