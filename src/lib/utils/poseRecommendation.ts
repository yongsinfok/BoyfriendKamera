import type { Pose, PoseKeypoint, StyleProfile } from '$lib/types';
import { POSE_TEMPLATES } from '$lib/data/poseTemplates';
import { calculatePoseDifficulty, calculatePoseSymmetry } from './poseMatching';
import { validatePose } from './poseValidation';
import { adaptiveLearning } from '$lib/stores/adaptiveLearning';

/**
 * Intelligent pose recommendation engine
 * Provides personalized pose suggestions based on:
 * - User history and preferences
 * - Current context (lighting, environment)
 * - Body type and style
 * - Seasonal trends
 * - Difficulty progression
 */

export interface RecommendationContext {
	// User information
	userHeight?: string; // tall, average, short
	bodyType?: string; // slim, average, athletic
	experience?: 'beginner' | 'intermediate' | 'advanced';

	// Environment
	lighting?: 'natural' | 'indoor' | 'low-light';
	location?: 'outdoor' | 'indoor' | 'studio';
	backgroundComplexity?: 'simple' | 'moderate' | 'complex';

	// Session info
	photoCount: number;
	recentPoses: string[]; // IDs of recently used poses
	successfulPoses: string[]; // IDs of poses user liked
	avoidedPoses: string[]; // IDs of poses user skipped

	// Style preferences
	styleId?: string;
	occasion?: 'casual' | 'formal' | 'creative' | 'portrait';

	// Constraints
	maxDifficulty?: number; // 1-5
	timeConstraint?: boolean; // User in rush?
	groupSize?: number; // Number of people
}

export interface PoseRecommendation {
	pose: Pose;
	poseId: string;
	name: string;
	description: string;
	confidence: number; // 0-1
	reasons: string[]; // Why this pose was recommended
	difficulty: number; // 1-5
	tags: string[];
	estimatedTime: string; // "30秒", "1分钟", etc.
	tips: string[];
	commonMistakes: string[];
	variations?: string[]; // Alternative poses
	suitability: {
		overall: number; // 0-100
		style: number; // 0-100
		lighting: number; // 0-100
		difficulty: number; // 0-100
	};
}

export interface RecommendationEngine {
	recommend(context: RecommendationContext): PoseRecommendation[];
	getTrendingPoses(limit?: number): PoseRecommendation[];
	getSeasonalPoses(season?: string): PoseRecommendation[];
	learnFromFeedback(poseId: string, rating: number, wasUsed: boolean): void;
}

// Calculate pose suitability score
function calculateSuitability(
	pose: Pose,
	poseId: string,
	context: RecommendationContext
): PoseRecommendation['suitability'] {
	// Style suitability
	let styleScore = 70;
	if (context.styleId) {
		// Check if pose matches style
		const template = POSE_TEMPLATES.find((t) => t.id === poseId);
		if (template) {
			styleScore = template.style === context.styleId ? 90 : Math.random() * 30 + 50;
		}
	}

	// Lighting suitability
	let lightingScore = 70;
	switch (context.lighting) {
		case 'natural':
			lightingScore = 90; // Natural light works for most poses
			break;
		case 'indoor':
			lightingScore = 75; // Indoor lighting is generally good
			break;
		case 'low-light':
			lightingScore = 50; // Low light requires simpler poses
			break;
	}

	// Difficulty suitability
	const difficulty = calculatePoseDifficulty(pose);
	const userLevel = context.experience || 'beginner';

	let difficultyScore = 70;
	if (userLevel === 'beginner') {
		difficultyScore = difficulty.difficulty <= 2 ? 90 : difficulty.difficulty <= 3 ? 60 : 30;
	} else if (userLevel === 'intermediate') {
		difficultyScore = difficulty.difficulty <= 3 ? 90 : difficulty.difficulty <= 4 ? 70 : 40;
	} else {
		// Advanced
		difficultyScore = difficulty.difficulty >= 3 ? 90 : difficulty.difficulty >= 2 ? 80 : 60;
	}

	// Apply max difficulty constraint
	if (context.maxDifficulty && difficulty.difficulty > context.maxDifficulty) {
		difficultyScore = 20;
	}

	// Calculate overall score (weighted average)
	const overall = Math.round(styleScore * 0.35 + lightingScore * 0.25 + difficultyScore * 0.4);

	return {
		overall,
		style: styleScore,
		lighting: lightingScore,
		difficulty: difficultyScore
	};
}

// Generate recommendation reasons
function generateRecommendationReasons(
	poseId: string,
	suitability: PoseRecommendation['suitability'],
	context: RecommendationContext
): string[] {
	const reasons: string[] = [];

	// Style-based reasons
	if (suitability.style >= 80) {
		reasons.push('完美匹配您选择的风格');
	} else if (suitability.style >= 60) {
		reasons.push('适合当前风格');
	}

	// Difficulty-based reasons
	if (suitability.difficulty >= 80) {
		reasons.push('难度适合您的水平');
	} else if (context.experience === 'beginner' && suitability.difficulty >= 60) {
		reasons.push('适合初学者练习');
	}

	// Lighting-based reasons
	if (suitability.lighting >= 80) {
		reasons.push('充分利用当前光线条件');
	}

	// Experience-based reasons
	if (context.experience === 'beginner') {
		reasons.push('简单易学，快速上手');
	} else if (context.experience === 'advanced') {
		reasons.push('展现您的摄影技巧');
	}

	// Occasion-based reasons
	if (context.occasion === 'portrait') {
		reasons.push('突出人物面部特征');
	} else if (context.occasion === 'creative') {
		reasons.push('创意构图，独特视角');
	} else if (context.occasion === 'formal') {
		reasons.push('正式场合的优雅姿态');
	}

	// History-based reasons
	if (context.successfulPoses.includes(poseId)) {
		reasons.push('您之前使用过这个姿势效果很好');
	}

	return reasons.length > 0 ? reasons : ['推荐的优质姿势'];
}

// Generate pose tips
function generatePoseTips(poseId: string, context: RecommendationContext): string[] {
	const tips: string[] = [];

	// General tips
	tips.push('保持自然呼吸，放松身体');

	// Context-specific tips
	if (context.lighting === 'low-light') {
		tips.push('面向光源方向，让光线照亮面部');
	}

	if (context.location === 'outdoor') {
		tips.push('注意背景，避免杂乱元素干扰');
	}

	if (context.experience === 'beginner') {
		tips.push('先从基础姿势开始，逐步尝试变化');
	}

	// Pose-specific tips based on template
	const template = POSE_TEMPLATES.find((t) => t.id === poseId);
	if (template) {
		if (template.difficulty >= 4) {
			tips.push('这个姿势较难，建议多练习几次');
		}
		if (template.style === 'portrait') {
			tips.push('眼神看向镜头，展现自信');
		}
	}

	return tips.slice(0, 4); // Limit to 4 tips
}

// Generate common mistakes
function generateCommonMistakes(poseId: string): string[] {
	const mistakes: string[] = [];

	// Common mistakes for all poses
	mistakes.push('肩膀紧张耸起 → 深呼吸放松肩膀');
	mistakes.push('双手僵硬无措 → 自然下垂或轻触身体');

	// Pose-specific mistakes
	const template = POSE_TEMPLATES.find((t) => t.id === poseId);
	if (template) {
		if (template.difficulty >= 3) {
			mistakes.push('动作幅度过大 → 适度调整，保持自然');
		}
		if (template.style === 'formal') {
			mistakes.push('姿态过于随意 → 保持挺直，展现优雅');
		}
	}

	return mistakes;
}

// Calculate estimated time to achieve pose
function calculateEstimatedTime(difficulty: number, experience: string): string {
	const baseTime = difficulty * 20; // seconds

	let multiplier = 1;
	if (experience === 'beginner') {
		multiplier = 1.5;
	} else if (experience === 'advanced') {
		multiplier = 0.7;
	}

	const seconds = Math.round(baseTime * multiplier);

	if (seconds <= 30) {
		return '30秒';
	} else if (seconds <= 60) {
		return '1分钟';
	} else if (seconds <= 120) {
		return '2分钟';
	} else {
		return '3分钟以上';
	}
}

// Main recommendation engine implementation
class IntelligentRecommendationEngine implements RecommendationEngine {
	private feedbackHistory: Map<string, { ratings: number[]; uses: number }> = new Map();

	recommend(context: RecommendationContext): PoseRecommendation[] {
		const recommendations: PoseRecommendation[] = [];

		// Get all available poses
		const poses = POSE_TEMPLATES;

		// Score and rank poses
		const scoredPoses = poses
			.map((template) => {
				const pose = template.pose;
				const poseId = template.id;

				// Calculate suitability
				const suitability = calculateSuitability(pose, poseId, context);

				// Get feedback history
				const history = this.feedbackHistory.get(poseId);
				const avgRating = history ? history.ratings.reduce((a, b) => a + b, 0) / history.ratings.length : 3.5;

				// Boost score for successful poses
				if (context.successfulPoses.includes(poseId)) {
					suitability.overall += 15;
				}

				// Penalize avoided poses
				if (context.avoidedPoses.includes(poseId)) {
					suitability.overall -= 20;
				}

				// Penalize recently used poses (encourage variety)
				if (context.recentPoses.includes(poseId)) {
					suitability.overall -= 10;
				}

				// Adjust based on user ratings
				suitability.overall += (avgRating - 3.5) * 10;

				// Ensure score is in valid range
				suitability.overall = Math.max(0, Math.min(100, suitability.overall));

				// Generate recommendation
				const difficulty = calculatePoseDifficulty(pose);
				const confidence = suitability.overall / 100;

				return {
					pose,
					poseId,
					name: template.name,
					description: template.description || '',
					confidence,
					reasons: generateRecommendationReasons(poseId, suitability, context),
					difficulty: difficulty.difficulty,
					tags: template.tags || [],
					estimatedTime: calculateEstimatedTime(difficulty.difficulty, context.experience || 'beginner'),
					tips: generatePoseTips(poseId, context),
					commonMistakes: generateCommonMistakes(poseId),
					suitability
				};
			})
			.filter((rec) => rec.confidence > 0.3) // Filter out low confidence
			.sort((a, b) => b.confidence - a.confidence); // Sort by confidence

		// Add adaptive learning recommendations
		const learningState = adaptiveLearning.get();
		if (learningState.learningEnabled && learningState.weights.successfulPoses.length > 0) {
			// Boost successful poses
			for (const rec of scoredPoses) {
				if (learningState.weights.successfulPoses.includes(rec.poseId)) {
					rec.confidence = Math.min(1, rec.confidence * 1.2);
					rec.reasons.push('根据您的历史记录推荐');
				}
			}
		}

		// Return top recommendations (max 10)
		return scoredPoses.slice(0, 10);
	}

	getTrendingPoses(limit: number = 5): PoseRecommendation[] {
		// Simple trending simulation - in production, this would use actual usage data
		const trendingIds = ['casual_stand', 'three quarter', 'portrait classic', 'sitting casual', 'walking'];

		return trendingIds
			.map((id) => {
				const template = POSE_TEMPLATES.find((t) => t.id === id);
				if (!template) return null;

				const difficulty = calculatePoseDifficulty(template.pose);

				return {
					pose: template.pose,
					poseId: template.id,
					name: template.name,
					description: template.description || '',
					confidence: 0.8 + Math.random() * 0.2,
					reasons: ['当前热门姿势', '用户好评如潮'],
					difficulty: difficulty.difficulty,
					tags: template.tags || [],
					estimatedTime: calculateEstimatedTime(difficulty.difficulty, 'intermediate'),
					tips: generatePoseTips(template.id, {}),
					commonMistakes: generateCommonMistakes(template.id),
					suitability: {
						overall: 85,
						style: 80,
						lighting: 85,
						difficulty: 80
					}
				};
			})
			.filter((r): r is PoseRecommendation => r !== null)
			.slice(0, limit);
	}

	getSeasonalPoses(season: string = getCurrentSeason()): PoseRecommendation[] {
		// Seasonal pose recommendations
		const seasonalPoses: Record<string, string[]> = {
			spring: ['casual_stand', 'natural smile', 'outdoor relaxed'],
			summer: ['beach casual', 'sitting casual', 'active dynamic'],
			autumn: ['cozy warm', 'artistic creative', 'nature inspired'],
			winter: ['elegant formal', 'indoor cozy', 'holiday festive']
		};

		const poses = seasonalPoses[season] || seasonalPoses.spring;

		return poses
			.map((id) => {
				const template = POSE_TEMPLATES.find((t) => t.id === id);
				if (!template) return null;

				const difficulty = calculatePoseDifficulty(template.pose);

				return {
					pose: template.pose,
					poseId: template.id,
					name: template.name,
					description: `${season}季节推荐姿势`,
					confidence: 0.75,
					reasons: [`适合${season}季节`, '时节氛围感强'],
					difficulty: difficulty.difficulty,
					tags: [...(template.tags || []), season],
					estimatedTime: calculateEstimatedTime(difficulty.difficulty, 'intermediate'),
					tips: generatePoseTips(template.id, {}),
					commonMistakes: generateCommonMistakes(template.id),
					suitability: {
						overall: 80,
						style: 75,
						lighting: 80,
						difficulty: 75
					}
				};
			})
			.filter((r): r is PoseRecommendation => r !== null);
	}

	learnFromFeedback(poseId: string, rating: number, wasUsed: boolean): void {
		if (!this.feedbackHistory.has(poseId)) {
			this.feedbackHistory.set(poseId, { ratings: [], uses: 0 });
		}

		const history = this.feedbackHistory.get(poseId)!;

		if (rating > 0) {
			history.ratings.push(rating);
			// Keep only last 10 ratings
			if (history.ratings.length > 10) {
				history.ratings.shift();
			}
		}

		if (wasUsed) {
			history.uses++;
		}

		// Update adaptive learning store
		if (rating >= 4) {
			adaptiveLearning.recordSuccessfulPose(poseId);
		} else if (rating <= 2) {
			adaptiveLearning.recordAvoidedPose(poseId);
		}
	}
}

// Get current season
function getCurrentSeason(): string {
	const month = new Date().getMonth();

	if (month >= 2 && month <= 4) return 'spring';
	if (month >= 5 && month <= 7) return 'summer';
	if (month >= 8 && month <= 10) return 'autumn';
	return 'winter';
}

// Global recommendation engine instance
let recommendationEngine: IntelligentRecommendationEngine | null = null;

export function getRecommendationEngine(): RecommendationEngine {
	if (!recommendationEngine) {
		recommendationEngine = new IntelligentRecommendationEngine();
	}
	return recommendationEngine;
}

// Convenience function for quick recommendations
export function recommendPoses(context: RecommendationContext): PoseRecommendation[] {
	return getRecommendationEngine().recommend(context);
}

// Get best recommendation for a given context
export function getBestRecommendation(context: RecommendationContext): PoseRecommendation | null {
	const recommendations = recommendPoses(context);
	return recommendations.length > 0 ? recommendations[0] : null;
}
