import type { AISuggestion, Pose } from '$lib/types';

/**
 * Enhanced error handling and fallback system
 */

export enum ErrorType {
	NETWORK_ERROR = 'NETWORK_ERROR',
	API_ERROR = 'API_ERROR',
	PARSING_ERROR = 'PARSING_ERROR',
	RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
	AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
	TIMEOUT_ERROR = 'TIMEOUT_ERROR',
	INVALID_RESPONSE = 'INVALID_RESPONSE'
}

export enum ErrorSeverity {
	LOW = 'LOW', // User can continue
	MEDIUM = 'MEDIUM', // Degraded experience
	HIGH = 'HIGH', // Critical failure
	CRITICAL = 'CRITICAL' // App unusable
}

export interface AppError {
	type: ErrorType;
	severity: ErrorSeverity;
	message: string;
	userMessage: string; // User-friendly message
	timestamp: number;
	retryable: boolean;
	fallbackAvailable: boolean;
}

// Error classifier
export function classifyError(error: any): AppError {
	const timestamp = Date.now();

	// Network errors
	if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
		return {
			type: ErrorType.NETWORK_ERROR,
			severity: ErrorSeverity.MEDIUM,
			message: 'Network connection failed',
			userMessage: '网络连接失败，请检查网络设置',
			timestamp,
			retryable: true,
			fallbackAvailable: true
		};
	}

	// API errors
	if (error.message?.includes('401') || error.message?.includes('403')) {
		return {
			type: ErrorType.AUTHENTICATION_ERROR,
			severity: ErrorSeverity.HIGH,
			message: 'Authentication failed',
			userMessage: 'API密钥无效，请检查设置',
			timestamp,
			retryable: false,
			fallbackAvailable: false
		};
	}

	if (error.message?.includes('429')) {
		return {
			type: ErrorType.RATE_LIMIT_ERROR,
			severity: ErrorSeverity.MEDIUM,
			message: 'Rate limit exceeded',
			userMessage: '请求过于频繁，请稍后再试',
			timestamp,
			retryable: true,
			fallbackAvailable: true
		};
	}

	if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
		return {
			type: ErrorType.TIMEOUT_ERROR,
			severity: ErrorSeverity.MEDIUM,
			message: 'Request timeout',
			userMessage: '请求超时，正在重试...',
			timestamp,
			retryable: true,
			fallbackAvailable: true
		};
	}

	// Parsing errors
	if (error instanceof SyntaxError) {
		return {
			type: ErrorType.PARSING_ERROR,
			severity: ErrorSeverity.LOW,
			message: 'Failed to parse AI response',
			userMessage: 'AI响应格式错误',
			timestamp,
			retryable: true,
			fallbackAvailable: true
		};
	}

	// Default
	return {
		type: ErrorType.API_ERROR,
		severity: ErrorSeverity.MEDIUM,
		message: error.message || 'Unknown error',
		userMessage: '分析出现问题，正在使用备用方案',
		timestamp,
		retryable: true,
		fallbackAvailable: true
	};
}

// Fallback suggestion generator
export function generateFallbackSuggestion(error: AppError): AISuggestion {
	const fallbacks: Record<ErrorType, () => AISuggestion> = {
		[ErrorType.NETWORK_ERROR]: () => ({
			composition_suggestion: '网络离线，请手动调整构图',
			lighting_assessment: '请确保光线充足',
			angle_suggestion: '尝试微微侧身角度',
			overall_score: 0.5,
			should_vibrate: false,
			pose_guide: {
				target_pose: getDefaultPose(),
				instructions: ['检查网络连接', '使用手动拍照模式'],
				confidence: 0.5
			}
		}),

		[ErrorType.AUTHENTICATION_ERROR]: () => ({
			composition_suggestion: '请先配置API密钥',
			lighting_assessment: '',
			angle_suggestion: '',
			overall_score: 0,
			should_vibrate: false
		}),

		[ErrorType.RATE_LIMIT_ERROR]: () => ({
			composition_suggestion: 'AI服务繁忙，请稍后再试',
			lighting_assessment: '建议等待30秒后重试',
			angle_suggestion: '或者手动调整拍照角度',
			overall_score: 0.6,
			should_vibrate: false,
			pose_guide: {
				target_pose: getDefaultPose(),
				instructions: ['请求过于频繁', '请等待片刻再试'],
				confidence: 0.6
			}
		}),

		[ErrorType.TIMEOUT_ERROR]: () => ({
			composition_suggestion: 'AI响应慢，请稍候...',
			lighting_assessment: '正在使用缓存建议',
			angle_suggestion: '保持当前姿势即可',
			overall_score: 0.5,
			should_vibrate: false,
			pose_guide: {
				target_pose: getDefaultPose(),
				instructions: ['网络延迟', '保持姿势稳定'],
				confidence: 0.5
			}
		}),

		[ErrorType.PARSING_ERROR]: () => ({
			composition_suggestion: '正在重新分析姿势...',
			lighting_assessment: '请保持姿势稳定',
			angle_suggestion: '尝试微微调整角度',
			overall_score: 0.6,
			should_vibrate: false,
			pose_guide: {
				target_pose: getDefaultPose(),
				instructions: ['重新检测中', '请稍候'],
				confidence: 0.6
			}
		}),

		[ErrorType.API_ERROR]: () => ({
			composition_suggestion: '使用基础构图指导',
			lighting_assessment: '建议面向光源',
			angle_suggestion: '尝试三分法构图',
			overall_score: 0.5,
			should_vibrate: false,
			pose_guide: {
				target_pose: getDefaultPose(),
				instructions: ['AI服务暂时不可用', '使用手动模式'],
				confidence: 0.5
			}
		}),

		[ErrorType.INVALID_RESPONSE]: () => ({
			composition_suggestion: 'AI返回异常，正在重试',
			lighting_assessment: '请保持当前姿势',
			angle_suggestion: '',
			overall_score: 0.6,
			should_vibrate: false,
			pose_guide: {
				target_pose: getDefaultPose(),
				instructions: ['重新分析中', '请稍候'],
				confidence: 0.6
			}
		})
	};

	const fallback = fallbacks[error.type];
	return fallback ? fallback() : generateFallbackSuggestion({
		type: ErrorType.API_ERROR,
		severity: ErrorSeverity.MEDIUM,
		message: error.message,
		userMessage: '使用默认建议',
		timestamp: Date.now(),
		retryable: true,
		fallbackAvailable: true
	});
}

// Default pose for fallbacks
function getDefaultPose(): Pose {
	return {
		nose: { x: 0.5, y: 0.22, visibility: 1 },
		left_shoulder: { x: 0.42, y: 0.4, visibility: 1 },
		right_shoulder: { x: 0.58, y: 0.4, visibility: 1 },
		left_elbow: { x: 0.38, y: 0.52, visibility: 0.9 },
		right_elbow: { x: 0.62, y: 0.52, visibility: 0.9 },
		left_wrist: { x: 0.35, y: 0.65, visibility: 0.85 },
		right_wrist: { x: 0.65, y: 0.65, visibility: 0.85 },
		left_hip: { x: 0.44, y: 0.68, visibility: 0.95 },
		right_hip: { x: 0.56, y: 0.68, visibility: 0.95 }
	};
}

// Error recovery strategies
export async function recoverFromError(
	error: AppError,
	context: {
		retryCount: number;
		maxRetries: number;
		lastSuccess: AISuggestion | null;
	}
): Promise<AISuggestion> {
	// If we have a recent successful result, use it
	if (context.lastSuccess && context.retryCount < context.maxRetries) {
		return {
			...context.lastSuccess,
			composition_suggestion: `${context.lastSuccess.composition_suggestion} (缓存)`
		};
	}

	// If retryable and haven't exceeded retries, throw to retry
	if (error.retryable && context.retryCount < context.maxRetries) {
		throw error; // Signal to retry
	}

	// Otherwise use fallback
	return generateFallbackSuggestion(error);
}

// Error tracking for monitoring
export class ErrorTracker {
	private errors: AppError[] = [];
	private errorCounts: Map<ErrorType, number> = new Map();

	track(error: AppError): void {
		this.errors.push(error);
		this.errors = this.errors.slice(-100); // Keep last 100

		const count = this.errorCounts.get(error.type) || 0;
		this.errorCounts.set(error.type, count + 1);
	}

	getErrorRate(): number {
		return this.errors.length;
	}

	getErrorCounts(): Record<ErrorType, number> {
		const counts: Record<string, number> = {};
		for (const [type, count] of this.errorCounts.entries()) {
			counts[type] = count;
		}
		return counts as Record<ErrorType, number>;
	}

	getMostCommonError(): ErrorType | null {
		let maxCount = 0;
		let mostCommon: ErrorType | null = null;

		for (const [type, count] of this.errorCounts.entries()) {
			if (count > maxCount) {
				maxCount = count;
				mostCommon = type;
			}
		}

		return mostCommon;
	}

	shouldDisableFeature(): boolean {
		const recentErrors = this.errors.filter(
			e => Date.now() - e.timestamp < 60000 // Last minute
		);

		// If more than 10 errors in last minute, disable temporarily
		return recentErrors.length > 10;
	}

	clear(): void {
		this.errors = [];
		this.errorCounts.clear();
	}
}

// Global error tracker instance
export const errorTracker = new ErrorTracker();
