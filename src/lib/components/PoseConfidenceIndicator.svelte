<script lang="ts">
	export let confidence: number;
	export let label: string = 'AI置信度';

	// Confidence level categorization
	const getConfidenceLevel = (score: number) => {
		if (score >= 0.85) return { level: 'high', icon: '🎯', color: '#4ade80', text: '优秀' };
		if (score >= 0.7) return { level: 'medium', icon: '✓', color: '#fbbf24', text: '良好' };
		if (score >= 0.5) return { level: 'low', icon: '⚠️', color: '#f97316', text: '一般' };
		return { level: 'poor', icon: '❌', color: '#ef4444', text: '需调整' };
	};

	$: conf = getConfidenceLevel(confidence);
	$: percentage = Math.round(confidence * 100);
</script>

<div class="confidence-indicator" class:conf-high={conf.level === 'high'} class:conf-medium={conf.level === 'medium'} class:conf-low={conf.level === 'low'} class:conf-poor={conf.level === 'poor'}>
	<div class="confidence-header">
		<span class="confidence-icon">{conf.icon}</span>
		<span class="confidence-label">{label}</span>
		<span class="confidence-score" style="color: {conf.color}">{percentage}%</span>
	</div>

	<!-- Progress bar -->
	<div class="confidence-bar-container">
		<div class="confidence-bar" style="width: {percentage}%; background-color: {conf.color}"></div>
	</div>

	<!-- Status text -->
	<div class="confidence-status" style="color: {conf.color}">
		{conf.text}
	</div>

	<!-- Animated glow effect for high confidence -->
	{#if conf.level === 'high'}
		<div class="confidence-glow"></div>
	{/if}
</div>

<style>
	.confidence-indicator {
		position: relative;
		background: rgba(0, 0, 0, 0.85);
		backdrop-filter: blur(10px);
		border-radius: 16px;
		padding: 16px;
		min-width: 200px;
		border: 2px solid rgba(255, 255, 255, 0.1);
		transition: all 0.3s ease;
	}

	.confidence-indicator.conf-high {
		border-color: rgba(74, 222, 128, 0.3);
		box-shadow: 0 0 20px rgba(74, 222, 128, 0.2);
	}

	.confidence-indicator.conf-medium {
		border-color: rgba(251, 191, 36, 0.3);
	}

	.confidence-indicator.conf-low {
		border-color: rgba(249, 115, 22, 0.3);
	}

	.confidence-indicator.conf-poor {
		border-color: rgba(239, 68, 68, 0.3);
		animation: shake 0.5s ease-in-out;
	}

	.confidence-header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 12px;
	}

	.confidence-icon {
		font-size: 20px;
		animation: iconBounce 1s ease-in-out infinite;
	}

	.confidence-label {
		flex: 1;
		font-size: 14px;
		font-weight: 600;
		color: #ffffff;
	}

	.confidence-score {
		font-size: 18px;
		font-weight: 700;
	}

	.confidence-bar-container {
		width: 100%;
		height: 8px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 4px;
		overflow: hidden;
		margin-bottom: 8px;
	}

	.confidence-bar {
		height: 100%;
		border-radius: 4px;
		transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s ease;
		position: relative;
		overflow: hidden;
	}

	.confidence-bar::after {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(
			90deg,
			transparent,
			rgba(255, 255, 255, 0.3),
			transparent
		);
		animation: shimmer 2s ease-in-out infinite;
	}

	.confidence-status {
		font-size: 12px;
		font-weight: 600;
		text-align: center;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.confidence-glow {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 120%;
		height: 120%;
		background: radial-gradient(circle, rgba(74, 222, 128, 0.15) 0%, transparent 70%);
		animation: pulse 2s ease-in-out infinite;
		pointer-events: none;
	}

	@keyframes shimmer {
		0% {
			transform: translateX(-100%);
		}
		100% {
			transform: translateX(100%);
		}
	}

	@keyframes iconBounce {
		0%, 100% {
			transform: scale(1) rotate(0deg);
		}
		50% {
			transform: scale(1.1) rotate(5deg);
		}
	}

	@keyframes pulse {
		0%, 100% {
			opacity: 0.5;
			transform: translate(-50%, -50%) scale(1);
		}
		50% {
			opacity: 1;
			transform: translate(-50%, -50%) scale(1.1);
		}
	}

	@keyframes shake {
		0%, 100% {
			transform: translateX(0);
		}
		25% {
			transform: translateX(-5px);
		}
		75% {
			transform: translateX(5px);
		}
	}
</style>
