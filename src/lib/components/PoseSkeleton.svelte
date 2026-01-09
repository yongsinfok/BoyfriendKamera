<script lang="ts">
	import type { Pose, PoseKeypoint } from '$lib/types';
	import { onMount } from 'svelte';
	import { quintInOut } from 'svelte/easing';

	interface Props {
		pose: Pose;
		opacity?: number;
		transitionDuration?: number;
	}

	let { pose, opacity = 0.8, transitionDuration = 300 }: Props = $props();

	// Store for smooth interpolation
	let currentPose: Pose = $state({ ...pose });
	let previousPose: Pose | null = $state(null);
	let transitioning = $state(false);

	// Linear interpolation between two values
	const lerp = (start: number, end: number, t: number): number => {
		return start + (end - start) * t;
	};

	// Interpolate between two keypoints
	const lerpKeypoint = (
		start: PoseKeypoint | undefined,
		end: PoseKeypoint | undefined,
		t: number
	): PoseKeypoint | undefined => {
		if (!start && !end) return undefined;
		if (!start) return end;
		if (!end) return start;
		return {
			x: lerp(start.x, end.x, t),
			y: lerp(start.y, end.y, t),
			visibility: lerp(start.visibility || 0, end.visibility || 0, t)
		};
	};

	// Smoothly interpolate entire pose
	const lerpPose = (start: Pose, end: Pose, t: number): Pose => {
		const result: Pose = {};
		const allKeys = new Set([...Object.keys(start), ...Object.keys(end)]);

		for (const key of allKeys) {
			result[key as keyof Pose] = lerpKeypoint(
				start[key as keyof Pose],
				end[key as keyof Pose],
				t
			);
		}
		return result;
	};

	// Transition animation
	let animationFrame: number;
	let startTime: number;

	const animateTransition = (timestamp: number) => {
		if (!startTime) startTime = timestamp;
		const elapsed = timestamp - startTime;
		const progress = Math.min(elapsed / transitionDuration, 1);
		const easedProgress = quintInOut(progress);

		if (previousPose) {
			currentPose = lerpPose(previousPose, pose, easedProgress);
		}

		if (progress < 1) {
			animationFrame = requestAnimationFrame(animateTransition);
		} else {
			transitioning = false;
			currentPose = pose;
		}
	};

	// Watch for pose changes
	$effect(() => {
		if (pose !== currentPose && !transitioning) {
			previousPose = currentPose;
			transitioning = true;
			startTime = 0;
			animationFrame = requestAnimationFrame(animateTransition);
		}
	});

	onMount(() => {
		return () => {
			if (animationFrame) {
				cancelAnimationFrame(animationFrame);
			}
		};
	});

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
		if (!keypoint || (keypoint.visibility ?? 0) < 0.3) return null;
		return {
			left: `${keypoint.x * 100}%`,
			top: `${keypoint.y * 100}%`,
			opacity: (keypoint.visibility ?? 1) * opacity
		};
	};

	// 线条样式
	const lineStyle = (start: PoseKeypoint | undefined, end: PoseKeypoint | undefined) => {
		if (!start || !end || (start.visibility ?? 0) < 0.3 || (end.visibility ?? 0) < 0.3) return null;
		return {
			x1: `${start.x * 100}%`,
			y1: `${start.y * 100}%`,
			x2: `${end.x * 100}%`,
			y2: `${end.y * 100}%`,
			opacity: Math.min(start.visibility ?? 1, end.visibility ?? 1) * opacity
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
			{@const style = lineStyle(currentPose[from as keyof Pose], currentPose[to as keyof Pose])}
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
		{#each Object.entries(currentPose) as [key, keypoint]}
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
		transition: all 0.1s linear;
	}

	.skeleton-points circle {
		fill: #ffd700;
		animation: pointPulse 1.5s ease-in-out infinite;
		transition: cx 0.1s linear, cy 0.1s linear;
		will-change: cx, cy;
	}

	.head-point {
		fill: #ff6b6b;
		r: 0.012 !important;
		filter: drop-shadow(0 0 0.008 #ff6b6b);
	}

	.hand-point {
		fill: #4ecdc4;
		r: 0.018 !important;
		animation: handWave 1s ease-in-out infinite;
		filter: drop-shadow(0 0 0.01 #4ecdc4);
	}

	@keyframes linePulse {
		0%, 100% {
			stroke-opacity: 0.7;
			stroke-width: 0.008;
		}
		50% {
			stroke-opacity: 1;
			stroke-width: 0.01;
		}
	}

	@keyframes pointPulse {
		0%, 100% {
			transform: scale(1);
			opacity: 1;
		}
		50% {
			transform: scale(1.2);
			opacity: 0.9;
		}
	}

	@keyframes handWave {
		0%, 100% {
			transform: rotate(0deg) scale(1);
		}
		25% {
			transform: rotate(5deg) scale(1.1);
		}
		75% {
			transform: rotate(-5deg) scale(1.1);
		}
	}
</style>
