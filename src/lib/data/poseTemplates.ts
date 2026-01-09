import type { Pose } from '$lib/types';

// Professional pose templates library
export const POSE_TEMPLATES = {
	// Portrait poses (best for individual shots)
	portrait_natural: {
		name: '自然站立',
		description: '自然、放松的站立姿势',
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
		tips: ['肩膀放松', '双手自然下垂', '身体微微侧转']
	},

	portrait_elegant: {
		name: '优雅手势',
		description: '一只手轻抚头发，展现优雅',
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
		tips: ['左手轻抚头发', '右手自然放置', '头部微微倾斜']
	},

	portrait_dynamic: {
		name: '活力姿势',
		description: '双臂张开，充满活力',
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
		tips: ['双臂向上张开', '展现自信活力', '笑容灿烂']
	},

	// Casual poses
	casual_lean: {
		name: '轻松倚靠',
		description: '身体微微后倾，轻松自然',
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
		tips: ['身体微微后倾', '一只手插口袋', '表情轻松自然']
	},

	casual_sitting: {
		name: '坐姿优雅',
		description: '坐姿挺直，双手放在膝盖上',
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
		tips: ['上半身挺直', '双手放在膝盖上', '双腿并拢或交叉']
	},

	// Artistic poses
	artistic_side: {
		name: '侧身艺术',
		description: '身体侧转45度，展现轮廓美',
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
		tips: ['身体侧转45度', '头部转向相机', '展现身体曲线']
	},

	artistic_triangle: {
		name: '三角形构图',
		description: '手臂形成三角形，经典构图',
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
		tips: ['双手在腰部形成三角形', '经典的稳定构图', '适合全身照']
	},

	// Couple poses
	couple_close: {
		name: '情侣亲密',
		description: '两人靠近，展现亲密关系',
		pose: {
			// Person 1 (left)
			nose: { x: 0.4, y: 0.25, visibility: 1 },
			left_shoulder: { x: 0.32, y: 0.42, visibility: 1 },
			right_shoulder: { x: 0.48, y: 0.42, visibility: 1 }
		},
		tips: ['两人靠近', '头微微靠在一起', '展现亲密关系']
	},

	couple_back_to_back: {
		name: '背对背',
		description: '背对背站立，展现个性',
		pose: {
			// Person 1 (facing left)
			nose: { x: 0.35, y: 0.22, visibility: 1 },
			left_shoulder: { x: 0.28, y: 0.4, visibility: 1 },
			right_shoulder: { x: 0.42, y: 0.4, visibility: 1 }
		},
		tips: ['背对背站立', '各自看向镜头', '展现个性与默契']
	}
} as const;

// Get recommended pose based on style and context
export function getRecommendedPose(style?: string, context?: { peopleCount: number; isFullBody: boolean }): Pose {
	// Default to natural standing pose
	return POSE_TEMPLATES.portrait_natural.pose;
}
