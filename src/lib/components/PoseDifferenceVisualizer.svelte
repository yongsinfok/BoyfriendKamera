<script lang="ts">
	import type { Pose, PoseKeypoint } from '$lib/types';

	interface Props {
		targetPose: Pose;
		currentPose?: Pose;
		opacity?: number;
	}

	let { targetPose, currentPose, opacity = 0.6 }: Props = $props();

	// Calculate difference between target and current for each keypoint
	const getDifference = (target: PoseKeypoint, current?: PoseKeypoint) => {
		if (!current) return null;

		const dx = target.x - current.x;
		const dy = target.y - current.y;
		const distance = Math.sqrt(dx * dx + dy * dy);

		return {
			dx,
			dy,
			distance,
			angle: Math.atan2(dy, dx) * (180 / Math.PI)
		};
	};

	// Get color based on distance
	const getDistanceColor = (distance: number) => {
		if (distance < 0.03) return '#4ade80'; // Green - excellent
		if (distance < 0.08) return '#fbbf24'; // Yellow - good
		if (distance < 0.15) return '#f97316'; // Orange - needs work
		return '#ef4444'; // Red - poor
	};

	// Get body part label
	const getBodyPartLabel = (key: string): string => {
		const labels: Record<string, string> = {
			nose: '头',
			left_eye: '左眼',
			right_eye: '右眼',
			left_ear: '左耳',
			right_ear: '右耳',
			left_shoulder: '左肩',
			right_shoulder: '右肩',
			left_elbow: '左肘',
			right_elbow: '右肘',
			left_wrist: '左手',
			right_wrist: '右手',
			left_hip: '左臀',
			right_hip: '右臀',
			left_knee: '左膝',
			right_knee: '右膝',
			left_ankle: '左脚',
			right_ankle: '右脚'
		};
		return labels[key] || key;
	};

	// Generate difference indicators for each keypoint
	const differenceIndicators = $derived(() => {
		const indicators: Array<{
			key: string;
			label: string;
			targetX: number;
			targetY: number;
			currentX?: number;
			currentY?: number;
			difference: ReturnType<typeof getDifference>;
			color: string;
		}> = [];

		for (const [key, targetKeypoint] of Object.entries(targetPose)) {
			if (!targetKeypoint || targetKeypoint.visibility < 0.5) continue;

			const currentKeypoint = currentPose?.[key as keyof Pose];
			const diff = getDifference(targetKeypoint, currentKeypoint);

			if (diff) {
				indicators.push({
					key,
					label: getBodyPartLabel(key),
					targetX: targetKeypoint.x,
					targetY: targetKeypoint.y,
					currentX: currentKeypoint?.x,
					currentY: currentKeypoint?.y,
					difference: diff,
					color: getDistanceColor(diff.distance)
				});
			}
		}

		return indicators.sort((a, b) => b.difference.distance - a.difference.distance);
	});

	// Overall accuracy score
	const overallAccuracy = $derived(() => {
		if (!currentPose || differenceIndicators().length === 0) return 0;

		const totalError = differenceIndicators().reduce((sum, ind) => sum + ind.difference.distance, 0);
		const avgError = totalError / differenceIndicators().length;
		return Math.max(0, Math.min(100, (1 - avgError / 0.3) * 100));
	});
</script>

<svg class="pose-difference-overlay" viewBox="0 0 1 1" preserveAspectRatio="none">
	<defs>
		<!-- Arrow marker for direction indicators -->
		<marker
			id="arrowhead"
			markerWidth="6"
			markerHeight="6"
			refX="5"
			refY="3"
			orient="auto"
		>
			<polygon points="0 0, 6 3, 0 6" fill="white" opacity="0.9" />
		</marker>

		<!-- Glow filter -->
		<filter id="glow">
			<feGaussianBlur stdDeviation="0.008" result="coloredBlur" />
			<feMerge>
				<feMergeNode in="coloredBlur" />
				<feMergeNode in="SourceGraphic" />
			</feMerge>
		</filter>
	</defs>

	{#each differenceIndicators() as indicator}
		<!-- Direction arrow from current to target position -->
		{#if indicator.currentX !== undefined && indicator.currentY !== undefined}
			<line
				x1={indicator.currentX}
				y1={indicator.currentY}
				x2={indicator.targetX}
				y2={indicator.targetY}
				stroke={indicator.color}
				stroke-width={Math.min(0.015, indicator.difference.distance * 0.15)}
				stroke-opacity={opacity}
				stroke-dasharray="0.01,0.005"
				marker-end="url(#arrowhead)"
				filter="url(#glow)"
				class="difference-arrow"
			>
				<animate
				 attributeName="stroke-dashoffset"
				 from="0"
				 to="-0.03"
				 dur="1s"
				 repeatCount="indefinite"
				/>
			</line>

			<!-- Current position dot -->
			<circle
				cx={indicator.currentX}
				cy={indicator.currentY}
				r="0.012"
				fill={indicator.color}
				opacity={opacity * 0.7}
				class="current-position"
			/>

			<!-- Target position ring -->
			<circle
				cx={indicator.targetX}
				cy={indicator.targetY}
				r="0.018"
				fill="none"
				stroke={indicator.color}
				stroke-width="0.008"
				opacity={opacity}
				class="target-ring"
			>
				<animate
				 attributeName="r"
				 values="0.015;0.022;0.015"
				 dur="2s"
				 repeatCount="indefinite"
				/>
			</circle>
		{/if}
	{/each}
</svg>

<!-- Accuracy score display -->
{#if currentPose && differenceIndicators().length > 0}
	<div class="accuracy-badge" style:opacity={opacity}>
		<div class="accuracy-score" style="color: {overallAccuracy() >= 80 ? '#4ade80' : overallAccuracy() >= 60 ? '#fbbf24' : '#ef4444'}">
			{Math.round(overallAccuracy())}%
		</div>
		<div class="accuracy-label">准确度</div>
	</div>
{/if}

<style>
	.pose-difference-overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		overflow: visible;
	}

	.difference-arrow {
		animation: pulse 2s ease-in-out infinite;
	}

	.current-position {
		animation: fadeIn 0.3s ease-out;
	}

	.target-ring {
		animation: pulseRing 2s ease-in-out infinite;
	}

	.accuracy-badge {
		position: absolute;
		top: 70px;
		right: 20px;
		background: rgba(0, 0, 0, 0.85);
		backdrop-filter: blur(10px);
		border-radius: 12px;
		padding: 12px 16px;
		text-align: center;
		border: 2px solid rgba(255, 255, 255, 0.1);
		animation: slideIn 0.5s ease-out;
	}

	.accuracy-score {
		font-size: 28px;
		font-weight: 700;
		line-height: 1;
	}

	.accuracy-label {
		font-size: 11px;
		color: #ffffff;
		margin-top: 4px;
		font-weight: 500;
	}

	@keyframes pulse {
		0%, 100% {
			stroke-opacity: 0.6;
		}
		50% {
			stroke-opacity: 1;
		}
	}

	@keyframes pulseRing {
		0%, 100% {
			stroke-opacity: 0.5;
			transform: scale(1);
		}
		50% {
			stroke-opacity: 1;
			transform: scale(1.1);
		}
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: scale(0);
		}
		to {
			opacity: 0.7;
			transform: scale(1);
		}
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateX(20px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}
</style>
