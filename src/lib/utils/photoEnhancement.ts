import { getGLMService } from '../services/glm';

/**
 * AI-powered photo enhancement suggestions
 * Analyzes photos and provides intelligent enhancement recommendations
 */

export interface EnhancementSuggestion {
	id: string;
	type: 'lighting' | 'composition' | 'color' | 'filter' | 'crop' | 'retouch';
	priority: 'high' | 'medium' | 'low';
	title: string;
	description: string;
	actionable: boolean;
	previewEffect?: string;
	params?: Record<string, any>;
	confidence: number;
}

export interface EnhancementProfile {
	name: string;
	description: string;
	filters: FilterPreset[];
	adjustments: Adjustment[];
	suitableFor: string[];
}

export interface FilterPreset {
	id: string;
	name: string;
	description: string;
	thumbnail?: string;
	parameters: {
		brightness?: number;
		contrast?: number;
		saturation?: number;
		temperature?: number;
		tint?: number;
		exposure?: number;
		highlights?: number;
		shadows?: number;
		vibrance?: number;
	};
}

export interface Adjustment {
	type: string;
	value: number;
	min: number;
	max: number;
	description: string;
}

export interface EnhancementAnalysis {
	overallQuality: number; // 0-1
	suggestions: EnhancementSuggestion[];
	recommendedProfile: EnhancementProfile;
	quickActions: QuickAction[];
	estimatedImprovement: number;
}

export interface QuickAction {
	id: string;
	name: string;
	icon: string;
	action: () => void;
	description: string;
}

// Predefined enhancement profiles
export const ENHANCEMENT_PROFILES: EnhancementProfile[] = [
	{
		name: '人像优化',
		description: '优化肤色，柔化皮肤，增强眼神光',
		suitableFor: ['portrait', 'selfie', 'closeup'],
		filters: [
			{
				id: 'portrait_warm',
				name: '暖色人像',
				description: '温暖的肤色调',
				parameters: {
					temperature: 15,
					tint: 5,
					brightness: 5,
					contrast: -5,
					saturation: 10,
					vibrance: 15
				}
			},
			{
				id: 'portrait_cool',
				name: '冷色人像',
				description: '清新的冷色调',
				parameters: {
					temperature: -10,
					tint: -5,
					brightness: 5,
					contrast: -5,
					saturation: 5
				}
			}
		],
		adjustments: [
			{ type: 'brightness', value: 5, min: -20, max: 20, description: '亮度' },
			{ type: 'contrast', value: -5, min: -20, max: 20, description: '对比度' },
			{ type: 'saturation', value: 10, min: -30, max: 30, description: '饱和度' },
			{ type: 'highlights', value: -10, min: -50, max: 50, description: '高光' },
			{ type: 'shadows', value: 15, min: -50, max: 50, description: '阴影' }
		]
	},
	{
		name: '风景增强',
		description: '增强天空、植被色彩，提升整体对比度',
		suitableFor: ['landscape', 'nature', 'outdoor'],
		filters: [
			{
				id: 'landscape_vivid',
				name: '鲜艳风景',
				description: '鲜艳自然的色彩',
				parameters: {
					brightness: 0,
					contrast: 10,
					saturation: 20,
					vibrance: 25,
					highlights: -15,
					shadows: 20
				}
			},
			{
				id: 'landscape_dramatic',
				name: '戏剧风景',
				description: '强烈的对比效果',
				parameters: {
					brightness: -5,
					contrast: 25,
					saturation: 15,
					vibrance: 20,
					highlights: -30,
					shadows: 30
				}
			}
		],
		adjustments: [
			{ type: 'brightness', value: 0, min: -20, max: 20, description: '亮度' },
			{ type: 'contrast', value: 10, min: -20, max: 30, description: '对比度' },
			{ type: 'saturation', value: 20, min: -30, max: 40, description: '饱和度' },
			{ type: 'vibrance', value: 25, min: -20, max: 40, description: '自然饱和度' }
		]
	},
	{
		name: '夜景优化',
		description: '减少噪点，提升暗部细节',
		suitableFor: ['night', 'lowlight', 'indoor'],
		filters: [
			{
				id: 'night_clean',
				name: '纯净夜景',
				description: '干净的夜景效果',
				parameters: {
					brightness: 10,
					contrast: 15,
					saturation: -5,
					highlights: 5,
					shadows: 25
				}
			}
		],
		adjustments: [
			{ type: 'brightness', value: 10, min: 0, max: 30, description: '亮度' },
			{ type: 'contrast', value: 15, min: 0, max: 30, description: '对比度' },
			{ type: 'shadows', value: 25, min: 0, max: 50, description: '阴影' }
		]
	},
	{
		name: '胶片风格',
		description: '经典胶片质感与色彩',
		suitableFor: ['any'],
		filters: [
			{
				id: 'film_vintage',
				name: '复古胶片',
				description: '温暖的复古色调',
				parameters: {
					temperature: 20,
					tint: 10,
					brightness: -5,
					contrast: 10,
					saturation: -10,
					vibrance: -5
				}
			},
			{
				id: 'film_bw',
				name: '黑白胶片',
				description: '经典黑白效果',
				parameters: {
					saturation: -100,
					contrast: 20,
					brightness: 5
				}
			}
		],
		adjustments: [
			{ type: 'contrast', value: 10, min: -10, max: 20, description: '对比度' },
			{ type: 'saturation', value: -10, min: -100, max: 20, description: '饱和度' }
		]
	}
];

// Photo enhancement analyzer
export class PhotoEnhancementAnalyzer {
	private glmService = getGLMService();

	// Analyze photo and generate enhancement suggestions
	async analyzePhoto(imageBase64: string, context?: {
		pose?: any;
		photoType?: string;
		userPreferences?: Record<string, any>;
	}): Promise<EnhancementAnalysis> {
		// Use AI to analyze the photo
		const analysis = await this.performAIAnalysis(imageBase64, context);

		// Generate enhancement suggestions
		const suggestions = this.generateSuggestions(analysis, context);

		// Select best profile
		const recommendedProfile = this.selectProfile(analysis, context);

		// Create quick actions
		const quickActions = this.createQuickActions(suggestions);

		return {
			overallQuality: analysis.quality || 0.7,
			suggestions,
			recommendedProfile,
			quickActions,
			estimatedImprovement: this.estimateImprovement(suggestions)
		};
	}

	// Perform AI analysis
	private async performAIAnalysis(imageBase64: string, context?: any): Promise<any> {
		try {
			const prompt = `分析这张照片的质量并提供改进建议。请评估：
1. 整体质量（0-100分）
2. 光线状况（过曝/欠曝/正常）
3. 色彩平衡（色温、色调）
4. 构图问题
5. 需要改进的地方

返回JSON格式：
{
  "quality": 75,
  "lighting": "normal",
  "exposure": 0,
  "white_balance": "neutral",
  "color_saturation": "normal",
  "issues": ["slightly_underexposed", "cool_tones"],
  "strengths": ["good_composition", "clear_focus"],
  "suggested_type": "portrait"
}`;

			const response = await this.glmService.analyzePose(imageBase64, context?.pose);
			const cleanText = response.composition_suggestion || '';

			// Try to parse structured response
			try {
				const parsed = JSON.parse(cleanText);
				return parsed;
			} catch {
				// Fallback to basic analysis
				return {
					quality: 70,
					lighting: 'normal',
					exposure: 0,
					white_balance: 'neutral',
					color_saturation: 'normal',
					issues: [],
					strengths: [],
					suggested_type: context?.photoType || 'any'
				};
			}
		} catch (error) {
			console.error('AI analysis failed:', error);
			return {
				quality: 65,
				lighting: 'normal',
				exposure: 0,
				issues: [],
				strengths: []
			};
		}
	}

	// Generate enhancement suggestions
	private generateSuggestions(analysis: any, context?: any): EnhancementSuggestion[] {
		const suggestions: EnhancementSuggestion[] = [];

		// Lighting suggestions
		if (analysis.lighting === 'underexposed' || analysis.exposure < -5) {
			suggestions.push({
				id: 'brighten',
				type: 'lighting',
				priority: 'high',
				title: '提亮照片',
				description: '照片偏暗，建议增加亮度',
				actionable: true,
				params: { brightness: 10, shadows: 20 },
				confidence: 0.85
			});
		} else if (analysis.lighting === 'overexposed' || analysis.exposure > 5) {
			suggestions.push({
				id: 'darken',
				type: 'lighting',
				priority: 'high',
				title: '降低亮度',
				description: '照片过曝，建议降低亮度',
				actionable: true,
				params: { brightness: -10, highlights: -20 },
				confidence: 0.85
			});
		}

		// Color balance suggestions
		if (analysis.white_balance === 'cool' || analysis.issues?.includes('cool_tones')) {
			suggestions.push({
				id: 'warm_tones',
				type: 'color',
				priority: 'medium',
				title: '增加暖色',
				description: '照片偏冷，建议增加暖色调',
				actionable: true,
				params: { temperature: 15, tint: 5 },
				confidence: 0.75
			});
		} else if (analysis.white_balance === 'warm' || analysis.issues?.includes('warm_tones')) {
			suggestions.push({
				id: 'cool_tones',
				type: 'color',
				priority: 'medium',
				title: '增加冷色',
				description: '照片偏暖，建议增加冷色调',
				actionable: true,
				params: { temperature: -15, tint: -5 },
				confidence: 0.75
			});
		}

		// Saturation suggestions
		if (analysis.color_saturation === 'low') {
			suggestions.push({
				id: 'increase_saturation',
				type: 'color',
				priority: 'medium',
				title: '增加饱和度',
				description: '色彩偏淡，建议增加饱和度',
				actionable: true,
				params: { saturation: 20, vibrance: 15 },
				confidence: 0.8
			});
		}

		// Composition suggestions
		if (analysis.issues?.includes('cropping_needed')) {
			suggestions.push({
				id: 'crop_improve',
				type: 'crop',
				priority: 'medium',
				title: '优化裁剪',
				description: '建议裁剪以改善构图',
				actionable: true,
				confidence: 0.7
			});
		}

		// Filter suggestions
		if (analysis.suggested_type === 'portrait') {
			suggestions.push({
				id: 'portrait_filter',
				type: 'filter',
				priority: 'low',
				title: '应用人像滤镜',
				description: '使用暖色人像滤镜优化肤色',
				actionable: true,
				previewEffect: 'portrait_warm',
				params: { filterId: 'portrait_warm' },
				confidence: 0.75
			});
		}

		return suggestions.sort((a, b) => {
			const priorityOrder = { high: 0, medium: 1, low: 2 };
			return priorityOrder[a.priority] - priorityOrder[b.priority];
		});
	}

	// Select best enhancement profile
	private selectProfile(analysis: any, context?: any): EnhancementProfile {
		const suggestedType = analysis.suggested_type || context?.photoType || 'any';

		// Find matching profile
		const matchingProfile = ENHANCEMENT_PROFILES.find(profile =>
			profile.suitableFor.includes(suggestedType) || profile.suitableFor.includes('any')
		);

		return matchingProfile || ENHANCEMENT_PROFILES[0];
	}

	// Create quick actions
	private createQuickActions(suggestions: EnhancementSuggestion[]): QuickAction[] {
		const actions: QuickAction[] = [
			{
				id: 'auto_enhance',
				name: '一键优化',
				icon: '✨',
				description: '自动应用所有推荐优化',
				action: () => this.applyAutoEnhance()
			},
			{
				id: 'fix_lighting',
				name: '修复光线',
				icon: '☀️',
				description: '自动调整曝光和对比度',
				action: () => this.fixLighting()
			},
			{
				id: 'enhance_colors',
				name: '增强色彩',
				icon: '🎨',
				description: '提升饱和度和鲜艳度',
				action: () => this.enhanceColors()
			}
		];

		// Add suggestion-specific actions
		for (const suggestion of suggestions) {
			if (suggestion.actionable) {
				actions.push({
					id: suggestion.id,
					name: suggestion.title,
					icon: this.getIconForType(suggestion.type),
					description: suggestion.description,
					action: () => this.applySuggestion(suggestion)
				});
			}
		}

		return actions.slice(0, 6); // Limit to 6 quick actions
	}

	// Get icon for suggestion type
	private getIconForType(type: EnhancementSuggestion['type']): string {
		const icons: Record<EnhancementSuggestion['type'], string> = {
			lighting: '💡',
			composition: '📐',
			color: '🎨',
			filter: '✨',
			crop: '✂️',
			retouch: '🖌️'
		};
		return icons[type] || '🔧';
	}

	// Estimate improvement percentage
	private estimateImprovement(suggestions: EnhancementSuggestion[]): number {
		if (suggestions.length === 0) return 0;

		const totalConfidence = suggestions.reduce((sum, s) => sum + s.confidence, 0);
		const avgConfidence = totalConfidence / suggestions.length;

		// High priority suggestions contribute more
		const priorityWeight = suggestions.reduce((sum, s) => {
			const weights = { high: 3, medium: 2, low: 1 };
			return sum + weights[s.priority];
		}, 0);

		return Math.min(95, Math.round(avgConfidence * priorityWeight * 10));
	}

	// Apply auto enhance (placeholder)
	private applyAutoEnhance(): void {
		console.log('Applying auto enhance...');
		// This would integrate with the actual photo editing system
	}

	// Fix lighting (placeholder)
	private fixLighting(): void {
		console.log('Fixing lighting...');
	}

	// Enhance colors (placeholder)
	private enhanceColors(): void {
		console.log('Enhancing colors...');
	}

	// Apply specific suggestion (placeholder)
	private applySuggestion(suggestion: EnhancementSuggestion): void {
		console.log('Applying suggestion:', suggestion.title);
	}
}

// Global analyzer instance
let globalAnalyzer: PhotoEnhancementAnalyzer | null = null;

export function getPhotoEnhancementAnalyzer(): PhotoEnhancementAnalyzer {
	if (!globalAnalyzer) {
		globalAnalyzer = new PhotoEnhancementAnalyzer();
	}
	return globalAnalyzer;
}
