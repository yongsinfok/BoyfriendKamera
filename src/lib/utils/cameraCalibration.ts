/**
 * Advanced camera calibration system
 * Compensates for lens distortion, camera positioning, and sensor characteristics
 */

export interface CalibrationData {
	// Lens distortion parameters
	barrelDistortion: number; // -1 to 1
	pincushionDistortion: number; // -1 to 1
	chromaticAberration: number; // 0 to 1

	// Sensor characteristics
	sensorSkew: number; // Rotation in degrees
	aspectRatioCorrection: number; // Width/height ratio correction

	// Positioning
	cameraTilt: { x: number; y: number }; // Tilt angle in degrees
	cameraOffset: { x: number; y: number }; // Offset from center

	// Field of view
	fovHorizontal: number; // Degrees
	fovVertical: number; // Degrees

	// Calibration quality score
	calibrationQuality: number; // 0-100
	calibrationDate: number; // Timestamp
}

export interface CalibrationResult {
	isCalibrated: boolean;
	data: CalibrationData;
	recommendedAdjustments: string[];
	accuracyImprovement: number; // Percentage
}

// Default calibration data
const DEFAULT_CALIBRATION: CalibrationData = {
	barrelDistortion: 0,
	pincushionDistortion: 0,
	chromaticAberration: 0,
	sensorSkew: 0,
	aspectRatioCorrection: 1,
	cameraTilt: { x: 0, y: 0 },
	cameraOffset: { x: 0, y: 0 },
	fovHorizontal: 70,
	fovVertical: 50,
	calibrationQuality: 70,
	calibrationDate: Date.now()
};

// Load calibration from localStorage
export function loadCalibration(): CalibrationData {
	if (typeof window === 'undefined') return DEFAULT_CALIBRATION;

	try {
		const stored = localStorage.getItem('camera-calibration');
		if (stored) {
			return { ...DEFAULT_CALIBRATION, ...JSON.parse(stored) };
		}
	} catch (e) {
		console.error('Failed to load calibration:', e);
	}

	return DEFAULT_CALIBRATION;
}

// Save calibration to localStorage
export function saveCalibration(data: CalibrationData): void {
	if (typeof window === 'undefined') return;

	try {
		localStorage.setItem('camera-calibration', JSON.stringify(data));
	} catch (e) {
		console.error('Failed to save calibration:', e);
	}
}

// Correct point for lens distortion
export function correctDistortion(
	point: { x: number; y: number },
	calibration: CalibrationData
): { x: number; y: number } {
	const { x, y } = point;
	const cx = 0.5; // Center x
	const cy = 0.5; // Center y

	// Normalize to center
	let nx = (x - cx) * 2;
	let ny = (y - cy) * 2;

	// Apply barrel/pincushion correction
	const r2 = nx * nx + ny * ny;
	const r = Math.sqrt(r2);
	const barrelFactor = 1 + calibration.barrelDistortion * r2;
	const pincushionFactor = 1 - calibration.pincushionDistortion * r2;

	nx /= (barrelFactor * pincushionFactor || 1);
	ny /= (barrelFactor * pincushionFactor || 1);

	// Denormalize
	return {
		x: nx / 2 + cx,
		y: ny / 2 + cy
	};
}

// Correct point for sensor skew
export function correctSkew(
	point: { x: number; y: number },
	calibration: CalibrationData
): { x: number; y: number } {
	const { x, y } = point;
	const cx = 0.5;
	const cy = 0.5;
	const angle = (calibration.sensorSkew * Math.PI) / 180;
	const cos = Math.cos(angle);
	const sin = Math.sin(angle);

	// Rotate point
	return {
		x: (x - cx) * cos - (y - cy) * sin + cx,
		y: (x - cx) * sin + (y - cy) * cos + cy
	};
}

// Apply aspect ratio correction
export function correctAspectRatio(
	point: { x: number; y: number },
	calibration: CalibrationData
): { x: number; y: number } {
	const correction = calibration.aspectRatioCorrection;
	if (Math.abs(correction - 1) < 0.01) return point;

	return {
		x: point.x,
		y: point.y * correction
	};
}

// Full calibration pipeline
export function applyCalibration(
	point: { x: number; y: number },
	calibration?: CalibrationData
): { x: number; y: number } {
	const cal = calibration || loadCalibration();

	let corrected = point;
	corrected = correctDistortion(corrected, cal);
	corrected = correctSkew(corrected, cal);
	corrected = correctAspectRatio(corrected, cal);

	return corrected;
}

// Detect calibration issues from pose analysis
export function detectCalibrationIssues(pose: any): string[] {
	const issues: string[] = [];

	// Check for skew (uneven shoulders at same height)
	if (pose.left_shoulder && pose.right_shoulder) {
		const shoulderYDiff = Math.abs(pose.left_shoulder.y - pose.right_shoulder.y);
		if (shoulderYDiff > 0.05 && shoulderYDiff < 0.1) {
			issues.push('检测到轻微相机倾斜（肩膀不平）');
		} else if (shoulderYDiff >= 0.1) {
			issues.push('检测到明显相机倾斜，建议校准');
		}
	}

	// Check for aspect ratio issues
	if (pose.left_shoulder && pose.right_shoulder && pose.left_hip && pose.right_hip) {
		const shoulderWidth = Math.abs(pose.right_shoulder.x - pose.left_shoulder.x);
		const hipWidth = Math.abs(pose.right_hip.x - pose.left_hip.x);
		const ratio = hipWidth / shoulderWidth;

		if (ratio < 0.7 || ratio > 1.3) {
			issues.push('检测到可能的宽高比失真');
		}
	}

	// Check for distortion (straight lines appearing curved)
	if (pose.left_elbow && pose.left_wrist && pose.left_shoulder) {
		const shoulderX = pose.left_shoulder.x;
		const elbowX = pose.left_elbow.x;
		const wristX = pose.left_wrist.x;

		// Check if points follow expected linear pattern
		const expectedWristX = shoulderX + (elbowX - shoulderX) * 2;
		const deviation = Math.abs(wristX - expectedWristX);

		if (deviation > 0.1) {
			issues.push('检测到可能的镜头畸变');
		}
	}

	return issues;
}

// Auto-calibrate from pose analysis
export function autoCalibrateFromPose(pose: any): CalibrationData {
	const calibration = { ...DEFAULT_CALIBRATION };

	// Detect skew from shoulders
	if (pose.left_shoulder && pose.right_shoulder) {
		const leftY = pose.left_shoulder.y;
		const rightY = pose.right_shoulder.y;
		const yDiff = rightY - leftY;

		// Estimate tilt angle
		calibration.sensorSkew = Math.atan2(yDiff, 0.1) * (180 / Math.PI);
		calibration.cameraTilt.y = calibration.sensorSkew;
	}

	// Detect aspect ratio issues
	if (pose.left_shoulder && pose.right_shoulder && pose.left_hip && pose.right_hip) {
		const shoulderWidth = Math.abs(pose.right_shoulder.x - pose.left_shoulder.x);
		const hipWidth = Math.abs(pose.right_hip.x - pose.left_hip.x);
		const ratio = hipWidth / shoulderWidth;

		// Expected ratio is around 0.9-1.0
		if (ratio < 0.9) {
			calibration.aspectRatioCorrection = 1 / ratio;
		} else if (ratio > 1.1) {
			calibration.aspectRatioCorrection = 1 / ratio;
		}
	}

	calibration.calibrationQuality = 75;
	calibration.calibrationDate = Date.now();

	return calibration;
}

// Get recommended calibration adjustments
export function getCalibrationRecommendations(
	calibration: CalibrationData
): string[] {
	const recommendations: string[] = [];

	// Barrel/pincushion distortion
	if (Math.abs(calibration.barrelDistortion) > 0.2) {
		recommendations.push('建议重新校准镜头畸变设置');
	}

	// Sensor skew
	if (Math.abs(calibration.sensorSkew) > 2) {
		recommendations.push(`建议调整相机角度：${calibration.sensorSkew.toFixed(1)}°`);
	}

	// Aspect ratio
	if (Math.abs(calibration.aspectRatioCorrection - 1) > 0.1) {
		recommendations.push('检查传感器宽高比设置');
	}

	// Camera tilt
	if (Math.abs(calibration.cameraTilt.x) > 3 || Math.abs(calibration.cameraTilt.y) > 3) {
		recommendations.push('确保相机完全水平');
	}

	// Quality score
	if (calibration.calibrationQuality < 60) {
		recommendations.push('建议重新进行相机校准以获得最佳精度');
	}

	return recommendations;
}

// Validate calibration quality
export function validateCalibration(calibration: CalibrationData): {
	isValid: boolean;
	quality: 'excellent' | 'good' | 'fair' | 'poor';
	issues: string[];
} {
	const issues: string[] = [];
	let quality: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';

	// Check distortion values
	if (Math.abs(calibration.barrelDistortion) > 0.3) {
		issues.push('桶形畸变超出正常范围');
		quality = 'poor';
	}
	if (Math.abs(calibration.pincushionDistortion) > 0.3) {
		issues.push('枕形畸变超出正常范围');
		quality = 'poor';
	}

	// Check skew
	if (Math.abs(calibration.sensorSkew) > 5) {
		issues.push('传感器倾斜角度过大');
		if (quality === 'excellent') quality = 'fair';
	}

	// Check aspect ratio
	if (calibration.aspectRatioCorrection < 0.9 || calibration.aspectRatioCorrection > 1.1) {
		issues.push('宽高比修正值异常');
		if (quality !== 'poor') quality = 'fair';
	}

	// Check calibration age
	const age = Date.now() - calibration.calibrationDate;
	if (age > 30 * 24 * 60 * 60 * 1000) { // 30 days
		issues.push('校准数据过期（超过30天）');
		if (quality === 'excellent') quality = 'good';
	}

	// Check overall quality score
	if (calibration.calibrationQuality < 50) {
		quality = 'poor';
	} else if (calibration.calibrationQuality < 70) {
		if (quality !== 'poor') quality = 'fair';
	}

	return {
		isValid: quality !== 'poor',
		quality,
		issues
	};
}
