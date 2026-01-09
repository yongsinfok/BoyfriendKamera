<script lang="ts">
	import type { Pose, PoseKeypoint } from '$lib/types';
	import { quintInOut } from 'svelte/easing';
	import { onMount, onDestroy } from 'svelte';

	interface Props {
		targetPose: Pose;
		currentPose?: Pose;
		opacity?: number;
		showLabels?: boolean;
		showAngles?: boolean;
		showDistances?: boolean;
	}

	let { targetPose, currentPose, opacity = 0.7, showLabels = true, showAngles = true, showDistances = true }: Props = $props();

	// AR overlay elements
	interface ARGuide {
		id: string;
		type: 'target_circle' | 'directional_arrow' | 'angle_arc' | 'distance_line' | 'label' | 'trajectory';
		position: { x: number; y: number };
		targetPosition?: { x: number; y: number };
		style: Record<string, string>;
		animated: boolean;
		priority: number;
	}

	let arGuides = $state<ARGuide[]>([]);
	let animationFrame: number | null = null;
	let lastUpdateTime = 0;

	// Generate AR guides based on pose comparison
	function generateARGuides(): ARGuide[] {
		const guides: ARGuide[] = [];
		if (!currentPose) return guides;

		for (const [key, targetKeypoint] of Object.entries(targetPose)) {
			if (!targetKeypoint) continue;

			const currentKeypoint = currentPose[key as keyof Pose];

			// Target circle for keypoint
			guides.push({
				id: `target_${key}`,
				type: 'target_circle',
				position: targetKeypoint,
				style: {
					fill: 'rgba(74, 222, 128, 0.2)',
					stroke: 'rgba(74, 222, 128, 0.8)',
					strokeWidth: '2px'
				},
				animated: true,
				priority: 1
			});

			// Directional arrow if current position differs
			if (currentKeypoint) {
				const dx = targetKeypoint.x - currentKeypoint.x;
				const dy = targetKeypoint.y - currentKeypoint.y;
				const distance = Math.sqrt(dx * dx + dy * dy);

				if (distance > 0.03) {
					const angle = Math.atan2(dy, dx) * (180 / Math.PI);

					guides.push({
						id: `arrow_${key}`,
						type: 'directional_arrow',
						position: currentKeypoint,
						targetPosition: targetKeypoint,
						style: {
							stroke: distance > 0.1 ? '#ef4444' : distance > 0.08 ? '#f97316' : '#fbbf24',
							strokeWidth: '3px',
							transform: `rotate(${angle}deg)`
						},
						animated: true,
						priority: distance > 0.08 ? 3 : 2
					});

					// Distance label
					if (showDistances) {
						guides.push({
							id: `distance_${key}`,
							type: 'label',
							position: {
								x: (currentKeypoint.x + targetKeypoint.x) / 2,
								y: (currentKeypoint.y + targetKeypoint.y) / 2
							},
							style: {
								color: '#ffffff',
								fontSize: '12px',
								background: 'rgba(0, 0, 0, 0.7)'
							},
							animated: false,
							priority: 2
						});
					}
				}
			}
		}

		// Angle visualization for arms
		if (showAngles && currentPose) {
			// Left arm angle
			if (
				currentPose.left_shoulder &&
				currentPose.left_elbow &&
				currentPose.left_wrist
			) {
				const angle = calculateAngle(
					currentPose.left_shoulder,
					currentPose.left_elbow,
					currentPose.left_wrist
				);

				guides.push({
					id: 'angle_left_arm',
					type: 'angle_arc',
					position: currentPose.left_elbow,
					style: {
						fill: 'rgba(59, 130, 246, 0.3)',
						stroke: '#3b82f6',
						strokeWidth: '2px'
					},
					animated: false,
					priority: 2
				});
			}

			// Right arm angle
			if (
				currentPose.right_shoulder &&
				currentPose.right_elbow &&
				currentPose.right_wrist
			) {
				const angle = calculateAngle(
					currentPose.right_shoulder,
					currentPose.right_elbow,
					currentPose.right_wrist
				);

				guides.push({
					id: 'angle_right_arm',
					type: 'angle_arc',
					position: currentPose.right_elbow,
					style: {
						fill: 'rgba(59, 130, 246, 0.3)',
						stroke: '#3b82f6',
						strokeWidth: '2px'
					},
					animated: false,
					priority: 2
				});
			}
		}

		// Trajectory lines for smooth movement
		const trajectoryGuides = generateTrajectoryGuides();
		guides.push(...trajectoryGuides);

		return guides;
	}

	// Calculate angle between three points
	function calculateAngle(
		p1: PoseKeypoint,
		p2: PoseKeypoint,
		p3: PoseKeypoint
	): number {
		const angle1 = Math.atan2(p1.y - p2.y, p1.x - p2.x);
		const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
		return Math.abs(((angle1 - angle2 * 180) / Math.PI) % 360);
	}

	// Generate trajectory guides for smooth movement
	function generateTrajectoryGuides(): ARGuide[] {
		const guides: ARGuide[] = [];

		// Add movement trajectories for key body parts
		const keyParts = ['nose', 'left_shoulder', 'right_shoulder', 'left_wrist', 'right_wrist'];

		for (const part of keyParts) {
			const target = targetPose[part as keyof Pose];
			if (!target) continue;

			guides.push({
				id: `trajectory_${part}`,
				type: 'trajectory',
				position: target,
				style: {
					stroke: 'rgba(168, 85, 247, 0.5)',
					strokeWidth: '2px',
					strokeDasharray: '5,5'
				},
				animated: true,
				priority: 3
			});
		}

		return guides;
	}

	// Update AR guides periodically
	function updateGuides(timestamp: number) {
		if (timestamp - lastUpdateTime < 100) {
			// Throttle updates to every 100ms
			animationFrame = requestAnimationFrame(updateGuides);
			return;
		}

		lastUpdateTime = timestamp;
		arGuides = generateARGuides();
		animationFrame = requestAnimationFrame(updateGuides);
	}

	onMount(() => {
		arGuides = generateARGuides();
		animationFrame = requestAnimationFrame(updateGuides);
	});

	onDestroy(() => {
		if (animationFrame) {
			cancelAnimationFrame(animationFrame);
		}
	});
</script>

<div class="ar-overlay" style="opacity: {opacity}; pointer-events: none;">
	{#each arGuides.sort((a, b) => b.priority - a.priority) as guide (guide.id)}
		{@const guideElement = getGuideElement(guide)}
			{@if guideElement}
				<svelte:component this={guideElement} {...guide.props} />
			{/if}
		{/each}
	</div>

<style>
	.ar-overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: 50;
	}
</style>

<!-- Helper functions for rendering different guide types -->
<script lang="ts">
	function getGuideElement(guide: ARGuide) {
		switch (guide.type) {
			case 'target_circle':
				return TargetCircle;
			case 'directional_arrow':
				return DirectionalArrow;
			case 'angle_arc':
				return AngleArc;
			case 'label':
				return GuideLabel;
			case 'trajectory':
				return TrajectoryLine;
			default:
				return null;
		}
	}

	// Target circle component
	const TargetCircle = (props: any) => {
		const { position, style } = props;
		return `
			<div style="
				position: absolute;
				left: ${position.x * 100}%;
				top: ${position.y * 100}%;
				transform: translate(-50%, -50%);
				width: 40px;
				height: 40px;
				border-radius: 50%;
				border: 2px solid ${style.stroke};
				background: ${style.fill};
				animation: pulse 2s ease-in-out infinite;
				box-shadow: 0 0 20px ${style.stroke};
			"></div>
		`;
	};

	// Directional arrow component
	const DirectionalArrow = (props: any) => {
		const { position, targetPosition, style } = props;
		if (!targetPosition) return '';

		const dx = targetPosition.x - position.x;
		const dy = targetPosition.y - position.y;
		const angle = Math.atan2(dy, dx) * (180 / Math.PI);
		const length = Math.sqrt(dx * dx + dy * dy) * 100;

		return `
			<div style="
				position: absolute;
				left: ${position.x * 100}%;
				top: ${position.y * 100}%;
				transform: translate(-50%, -50%) rotate(${angle}deg);
				width: ${length}%;
				height: 2px;
				background: ${style.stroke};
				transform-origin: left center;
			">
				<div style="
					position: absolute;
					right: -6px;
					top: -4px;
					width: 0;
					height: 0;
					border-left: 8px solid ${style.stroke};
					border-top: 5px solid transparent;
					border-bottom: 5px solid transparent;
				"></div>
			</div>
		`;
	};

	// Angle arc component
	const AngleArc = (props: any) => {
		const { position, style } = props;
		return `
			<svg style="
				position: absolute;
				left: ${position.x * 100}%;
				top: ${position.y * 100}%;
				transform: translate(-50%, -50%);
				width: 60px;
				height: 60px;
				overflow: visible;
				pointer-events: none;
			">
				<path
					d="M 30 30 A 20 20 0 0 1 50 30"
					fill="${style.fill}"
					stroke="${style.stroke}"
					stroke-width="${style.strokeWidth}"
				/>
			</svg>
		`;
	};

	// Label component
	const GuideLabel = (props: any) => {
		const { position, style } = props;
		return `
			<div style="
				position: absolute;
				left: ${position.x * 100}%;
				top: ${position.y * 100}%;
				transform: translate(-50%, -50%);
				padding: 4px 8px;
				border-radius: 4px;
				color: ${style.color};
				font-size: ${style.fontSize};
				background: ${style.background};
				white-space: nowrap;
				animation: fadeIn 0.3s ease-out;
			">Move here</div>
		`;
	};

	// Trajectory line component
	const TrajectoryLine = (props: any) => {
		const { position, style } = props;
		return `
			<div style="
				position: absolute;
				left: ${position.x * 100}%;
				top: ${position.y * 100}%;
				transform: translate(-50%, -50%);
				width: 100px;
				height: 100px;
				border: 2px dashed ${style.stroke};
				border-radius: 50%;
				animation: rotate 20s linear infinite;
				opacity: 0.5;
			"></div>
		`;
	};
</script>

<style>
	@keyframes pulse {
		0%, 100% {
			transform: translate(-50%, -50%) scale(1);
			opacity: 0.8;
		}
		50% {
			transform: translate(-50%, -50%) scale(1.1);
			opacity: 1;
		}
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translate(-50%, -50%) scale(0.8);
		}
		to {
			opacity: 1;
			transform: translate(-50%, -50%) scale(1);
		}
	}

	@keyframes rotate {
		from {
			transform: translate(-50%, -50%) rotate(0deg);
		}
		to {
			transform: translate(-50%, -50%) rotate(360deg);
		}
	}
</style>
