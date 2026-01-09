<script lang="ts">
	import type { Pose } from '$lib/types';

	export let pose: Pose;
	export let opacity: number = 0.8;

	// 定义骨架连接关系
	const connections = [
		// 面部
		['left_ear', 'left_eye'],
		['left_eye', 'nose'],
		['nose', 'right_eye'],
		['right_eye', 'right_ear'],

		// 躯干
		['left_shoulder', 'right_shoulder'],
		['left_shoulder', 'left_hip'],
		['right_shoulder', 'right_hip'],
		['left_hip', 'right_hip'],

		// 左臂
		['left_shoulder', 'left_elbow'],
		['left_elbow', 'left_wrist'],

		// 右臂
		['right_shoulder', 'right_elbow'],
		['right_elbow', 'right_wrist'],

		// 左腿
		['left_hip', 'left_knee'],
		['left_knee', 'left_ankle'],

		// 右腿
		['right_hip', 'right_knee'],
		['right_knee', 'right_ankle']
	];

	// 关键点样式配置
	const pointStyle = (keypoint: PoseKeypoint | undefined) => {
		if (!keypoint || keypoint.visibility < 0.3) return null;
		return {
			left: `${keypoint.x * 100}%`,
			top: `${keypoint.y * 100}%`,
			opacity: keypoint.visibility * opacity
		};
	};

	// 线条样式
	const lineStyle = (start: PoseKeypoint | undefined, end: PoseKeypoint | undefined) => {
		if (!start || !end || start.visibility < 0.3 || end.visibility < 0.3) return null;
		return {
			x1: `${start.x * 100}%`,
			y1: `${start.y * 100}%`,
			x2: `${end.x * 100}%`,
			y2: `${end.y * 100}%`,
			opacity: Math.min(start.visibility, end.visibility) * opacity
		};
	};
</script>

<svg class="pose-skeleton" viewBox="0 0 1 1" preserveAspectRatio="none">
	<defs>
		<!-- 发光效果 -->
		<filter id="glow">
			<feGaussianBlur stdDeviation="0.01" result="coloredBlur"/>
			<feMerge>
				<feMergeNode in="coloredBlur"/>
				<feMergeNode in="SourceGraphic"/>
			</feMerge>
		</filter>
	</defs>

	<g class="skeleton-lines" filter="url(#glow)">
		{#each connections as [from, to]}
			{@const style = lineStyle(pose[from as keyof Pose], pose[to as keyof Pose])}
			{#if style}
				<line
					x1={style.x1}
					y1={style.y1}
					x2={style.x2}
					y2={style.y2}
					style:opacity={style.opacity}
					class="skeleton-line"
				/>
			{/if}
		{/each}
	</g>

	<g class="skeleton-points">
		{#each Object.entries(pose) as [key, keypoint]}
			{@const style = pointStyle(keypoint)}
			{#if style}
				<circle
					cx={style.left}
					cy={style.top}
					r="0.015"
					style:opacity={style.opacity}
					class:keypoint
					class:head-point={['nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear'].includes(key)}
					class:hand-point={['left_wrist', 'right_wrist'].includes(key)}
				/>
			{/if}
		{/each}
	</g>
</svg>

<style>
	.pose-skeleton {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		overflow: visible;
	}

	.skeleton-line {
		stroke: #ffd700;
		stroke-width: 0.008;
		stroke-linecap: round;
		stroke-linejoin: round;
		animation: linePulse 2s ease-in-out infinite;
	}

	.skeleton-points circle {
		fill: #ffd700;
		animation: pointPulse 1.5s ease-in-out infinite;
	}

	.head-point {
		fill: #ff6b6b;
		r: 0.012 !important;
	}

	.hand-point {
		fill: #4ecdc4;
		r: 0.018 !important;
		animation: handWave 1s ease-in-out infinite;
	}

	@keyframes linePulse {
		0%, 100% {
			stroke-opacity: 0.7;
		}
		50% {
			stroke-opacity: 1;
		}
	}

	@keyframes pointPulse {
		0%, 100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.2);
		}
	}

	@keyframes handWave {
		0%, 100% {
			transform: rotate(0deg);
		}
		25% {
			transform: rotate(5deg);
		}
		75% {
			transform: rotate(-5deg);
		}
	}
</style>
