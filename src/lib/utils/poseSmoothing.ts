import type { Pose, PoseKeypoint } from '$lib/types';

/**
 * Advanced pose smoothing and stabilization system
 * Reduces jitter and improves pose detection stability using:
 * - Exponential moving averages
 * - Kalman filtering
 * - Outlier detection
 * - Confidence-weighted smoothing
 */

export interface SmoothingConfig {
	// Exponential moving average factor (0-1)
	// Lower = more smoothing, higher = more responsive
	emaFactor: number;

	// Minimum confidence threshold (0-1)
	minConfidence: number;

	// Maximum allowed change per frame (0-1)
	maxChange: number;

	// Outlier detection threshold (standard deviations)
	outlierThreshold: number;

	// Whether to enable Kalman filtering
	enableKalman: boolean;

	// Process noise for Kalman filter
	processNoise: number;

	// Measurement noise for Kalman filter
	measurementNoise: number;
}

export const DEFAULT_SMOOTHING: SmoothingConfig = {
	emaFactor: 0.3,
	minConfidence: 0.3,
	maxChange: 0.15,
	outlierThreshold: 3.0,
	enableKalman: true,
	processNoise: 0.01,
	measurementNoise: 0.1
};

// Kalman filter for 2D points
class KalmanFilter2D {
	private x: number; // State vector [x, y, vx, vy]
	private P: number[][]; // State covariance matrix
	private Q: number[][]; // Process noise covariance
	private R: number[][]; // Measurement noise covariance

	constructor(processNoise: number = 0.01, measurementNoise: number = 0.1) {
		// Initial state [x=0, y=0, vx=0, vy=0]
		this.x = [0, 0, 0, 0];

		// Initial covariance (high uncertainty)
		this.P = [
			[1, 0, 0, 0],
			[0, 1, 0, 0],
			[0, 0, 1, 0],
			[0, 0, 0, 1]
		];

		// Process noise (random acceleration)
		this.Q = [
			[processNoise, 0, 0, 0],
			[0, processNoise, 0, 0],
			[0, 0, processNoise, 0],
			[0, 0, 0, processNoise]
		];

		// Measurement noise
		this.R = [
			[measurementNoise, 0],
			[0, measurementNoise]
		];
	}

	predict(deltaTime: number = 1): void {
		// State transition matrix (constant velocity model)
		const F = [
			[1, 0, deltaTime, 0],
			[0, 1, 0, deltaTime],
			[0, 0, 1, 0],
			[0, 0, 0, 1]
		];

		// Predict state: x = F * x
		const newX = [
			F[0][0] * this.x[0] + F[0][1] * this.x[1] + F[0][2] * this.x[2] + F[0][3] * this.x[3],
			F[1][0] * this.x[0] + F[1][1] * this.x[1] + F[1][2] * this.x[2] + F[1][3] * this.x[3],
			F[2][0] * this.x[0] + F[2][1] * this.x[1] + F[2][2] * this.x[2] + F[2][3] * this.x[3],
			F[3][0] * this.x[0] + F[3][1] * this.x[1] + F[3][2] * this.x[2] + F[3][3] * this.x[3]
		];

		// Predict covariance: P = F * P * F^T + Q
		const FP = this.multiplyMatrix(F, this.P);
		const FPT = this.transposeMatrix(FP);
		const FPFT = this.multiplyMatrix(FP, FPT);
		this.P = this.addMatrix(FPFT, this.Q);

		this.x = newX;
	}

	update(measurementX: number, measurementY: number): void {
		// Measurement matrix (we only observe position, not velocity)
		const H = [
			[1, 0, 0, 0],
			[0, 1, 0, 0]
		];

		// Measurement vector
		const z = [measurementX, measurementY];

		// Innovation: y = z - H * x
		const Hx = [H[0][0] * this.x[0] + H[0][1] * this.x[1], H[1][0] * this.x[0] + H[1][1] * this.x[1]];
		const y = [z[0] - Hx[0], z[1] - Hx[1]];

		// Innovation covariance: S = H * P * H^T + R
		const HP = this.multiplyMatrix(H, this.P);
		const HPT = this.transposeMatrix(HP);
		const HPH = this.multiplyMatrix(HP, HPT);
		const S = this.addMatrix(HPH, this.R);

		// Kalman gain: K = P * H^T * S^-1
		const PT = this.transposeMatrix(this.P);
		const PHT = this.multiplyMatrix(PT, this.transposeMatrix(H));
		const K = this.multiplyMatrix(PHT, this.inverseMatrix2x2(S));

		// Update state: x = x + K * y
		this.x[0] += K[0][0] * y[0] + K[0][1] * y[1];
		this.x[1] += K[1][0] * y[0] + K[1][1] * y[1];
		this.x[2] += K[2][0] * y[0] + K[2][1] * y[1];
		this.x[3] += K[3][0] * y[0] + K[3][1] * y[1];

		// Update covariance: P = (I - K * H) * P
		const KH = this.multiplyMatrix(K, H);
		const I_KH = [
			[1 - KH[0][0], -KH[0][1], -KH[0][2], -KH[0][3]],
			[-KH[1][0], 1 - KH[1][1], -KH[1][2], -KH[1][3]],
			[-KH[2][0], -KH[2][1], 1 - KH[2][2], -KH[2][3]],
			[-KH[3][0], -KH[3][1], -KH[3][2], 1 - KH[3][3]]
		];
		this.P = this.multiplyMatrix(I_KH, this.P);
	}

	getPosition(): { x: number; y: number } {
		return { x: this.x[0], y: this.x[1] };
	}

	getVelocity(): { vx: number; vy: number } {
		return { vx: this.x[2], vy: this.x[3] };
	}

	// Helper matrix operations
	private multiplyMatrix(A: number[][], B: number[][]): number[][] {
		const rowsA = A.length;
		const colsA = A[0].length;
		const colsB = B[0].length;
		const result = Array(rowsA)
			.fill(0)
			.map(() => Array(colsB).fill(0));

		for (let i = 0; i < rowsA; i++) {
			for (let j = 0; j < colsB; j++) {
				for (let k = 0; k < colsA; k++) {
					result[i][j] += A[i][k] * B[k][j];
				}
			}
		}

		return result;
	}

	private transposeMatrix(A: number[][]): number[][] {
		return A[0].map((_, c) => A.map((r) => r[c]));
	}

	private addMatrix(A: number[][], B: number[][]): number[][] {
		return A.map((row, i) => row.map((val, j) => val + B[i][j]));
	}

	private inverseMatrix2x2(M: number[][]): number[][] {
		const det = M[0][0] * M[1][1] - M[0][1] * M[1][0];
		if (Math.abs(det) < 1e-10) {
			// Return identity if singular
			return [
				[1, 0],
				[0, 1]
			];
		}
		const invDet = 1 / det;
		return [
			[M[1][1] * invDet, -M[0][1] * invDet],
			[-M[1][0] * invDet, M[0][0] * invDet]
		];
	}
}

// Smoothed keypoint with history
interface SmoothedKeypoint {
	position: { x: number; y: number };
	visibility: number;
	ema: { x: number; y: number };
	kalman: KalmanFilter2D;
	history: { x: number; y: number; confidence: number }[];
	stdDev: { x: number; y: number };
	lastUpdate: number;
}

// Pose smoother class
export class PoseSmoother {
	private smoothedPose: Map<string, SmoothedKeypoint> = new Map();
	private config: SmoothingConfig;
	private lastUpdateTime: number = 0;

	constructor(config: SmoothingConfig = DEFAULT_SMOOTHING) {
		this.config = config;
	}

	smoothPose(pose: Pose, deltaTime: number = 1): Pose {
		const result: Pose = {};

		for (const [key, keypoint] of Object.entries(pose)) {
			if (!keypoint) {
				result[key as keyof Pose] = undefined;
				continue;
			}

			const confidence = keypoint.visibility ?? 0;

			// Skip low confidence detections
			if (confidence < this.config.minConfidence) {
				const existing = this.smoothedPose.get(key);
				if (existing) {
					result[key as keyof Pose] = {
						...keypoint,
						x: existing.ema.x,
						y: existing.ema.y
					};
				} else {
					result[key as keyof Pose] = keypoint;
				}
				continue;
			}

			// Get or create smoothed keypoint
			let smoothed = this.smoothedPose.get(key);

			if (!smoothed) {
				smoothed = {
					position: { x: keypoint.x, y: keypoint.y },
					visibility: confidence,
					ema: { x: keypoint.x, y: keypoint.y },
					kalman: new KalmanFilter2D(this.config.processNoise, this.config.measurementNoise),
					history: [],
					stdDev: { x: 0, y: 0 },
					lastUpdate: Date.now()
				};
				this.smoothedPose.set(key, smoothed);
			}

			// Update history
			smoothed.history.push({ x: keypoint.x, y: keypoint.y, confidence });
			if (smoothed.history.length > 10) {
				smoothed.history.shift();
			}

			// Calculate statistics
			const meanX = smoothed.history.reduce((sum, h) => sum + h.x, 0) / smoothed.history.length;
			const meanY = smoothed.history.reduce((sum, h) => sum + h.y, 0) / smoothed.history.length;
			const varianceX =
				smoothed.history.reduce((sum, h) => sum + Math.pow(h.x - meanX, 2), 0) / smoothed.history.length;
			const varianceY =
				smoothed.history.reduce((sum, h) => sum + Math.pow(h.y - meanY, 2), 0) / smoothed.history.length;
			smoothed.stdDev = { x: Math.sqrt(varianceX), y: Math.sqrt(varianceY) };

			// Detect outliers
			const isOutlierX = Math.abs(keypoint.x - meanX) > this.config.outlierThreshold * smoothed.stdDev.x;
			const isOutlierY = Math.abs(keypoint.y - meanY) > this.config.outlierThreshold * smoothed.stdDev.y;

			let smoothedX = keypoint.x;
			let smoothedY = keypoint.y;

			if (isOutlierX || isOutlierY) {
				// Use EMA value for outliers
				smoothedX = smoothed.ema.x;
				smoothedY = smoothed.ema.y;
			} else {
				// Apply exponential moving average
				const alpha = this.config.emaFactor * confidence;
				smoothed.ema.x = alpha * keypoint.x + (1 - alpha) * smoothed.ema.x;
				smoothed.ema.y = alpha * keypoint.y + (1 - alpha) * smoothed.ema.y;

				smoothedX = smoothed.ema.x;
				smoothedY = smoothed.ema.y;

				// Apply Kalman filter if enabled
				if (this.config.enableKalman) {
					smoothed.kalman.predict(deltaTime);
					smoothed.kalman.update(keypoint.x, keypoint.y);
					const kfPosition = smoothed.kalman.getPosition();

					// Blend EMA and Kalman
					smoothedX = 0.5 * smoothedX + 0.5 * kfPosition.x;
					smoothedY = 0.5 * smoothedY + 0.5 * kfPosition.y;
				}

				// Limit maximum change
				const dx = smoothedX - smoothed.position.x;
				const dy = smoothedY - smoothed.position.y;
				const distance = Math.sqrt(dx * dx + dy * dy);

				if (distance > this.config.maxChange) {
					const ratio = this.config.maxChange / distance;
					smoothedX = smoothed.position.x + dx * ratio;
					smoothedY = smoothed.position.y + dy * ratio;
				}
			}

			// Update position
			smoothed.position = { x: smoothedX, y: smoothedY };
			smoothed.visibility = Math.max(smoothed.visibility * 0.9, confidence);
			smoothed.lastUpdate = Date.now();

			result[key as keyof Pose] = {
				x: smoothedX,
				y: smoothedY,
				visibility: smoothed.visibility
			};
		}

		// Clean up old keypoints
		this.cleanupOldKeypoints();

		return result;
	}

	reset(): void {
		this.smoothedPose.clear();
	}

	private cleanupOldKeypoints(): void {
		const now = Date.now();
		const maxAge = 2000; // 2 seconds

		for (const [key, smoothed] of this.smoothedPose.entries()) {
			if (now - smoothed.lastUpdate > maxAge) {
				this.smoothedPose.delete(key);
			}
		}
	}

	getSmoothedPose(): Pose {
		const result: Pose = {};
		for (const [key, smoothed] of this.smoothedPose.entries()) {
			result[key as keyof Pose] = {
				x: smoothed.position.x,
				y: smoothed.position.y,
				visibility: smoothed.visibility
			};
		}
		return result;
	}
}

// Global pose smoother instance
let globalSmoother: PoseSmoother | null = null;

export function getPoseSmoother(config?: SmoothingConfig): PoseSmoother {
	if (!globalSmoother) {
		globalSmoother = new PoseSmoother(config);
	}
	return globalSmoother;
}

// Quick smoothing function for one-off use
export function smoothPoseOnce(pose: Pose, config: SmoothingConfig = DEFAULT_SMOOTHING): Pose {
	const smoother = new PoseSmoother(config);
	return smoother.smoothPose(pose);
}

// Calculate pose stability (0-1, higher is more stable)
export function calculatePoseStability(poseHistory: Pose[]): {
	overall: number;
	byKeypoint: Map<string, number>;
} {
	if (poseHistory.length < 2) {
		return { overall: 1, byKeypoint: new Map() };
	}

	const keypointStability = new Map<string, number>();
	let totalStability = 0;
	let keypointCount = 0;

	for (const key of Object.keys(poseHistory[0])) {
		const positions: { x: number; y: number }[] = [];

		for (const pose of poseHistory) {
			const kp = pose[key as keyof Pose];
			if (kp) {
				positions.push({ x: kp.x, y: kp.y });
			}
		}

		if (positions.length < 2) continue;

		// Calculate variance
		const meanX = positions.reduce((sum, p) => sum + p.x, 0) / positions.length;
		const meanY = positions.reduce((sum, p) => sum + p.y, 0) / positions.length;
		const variance =
			positions.reduce((sum, p) => sum + Math.pow(p.x - meanX, 2) + Math.pow(p.y - meanY, 2), 0) /
			positions.length;

		// Convert variance to stability (lower variance = higher stability)
		const stability = Math.max(0, 1 - variance * 10);
		keypointStability.set(key, stability);

		totalStability += stability;
		keypointCount++;
	}

	const overall = keypointCount > 0 ? totalStability / keypointCount : 0;

	return { overall, byKeypoint: keypointStability };
}
