<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { performanceMonitor, frameRateMonitor, analysisCache } from '$lib/utils/performanceOptimizer';
	import { errorTracker } from '$lib/utils/errorHandling';
	import { quintInOut } from 'svelte/easing';
	import { flip } from 'svelte/animate';
	import { fly } from 'svelte/transition';

	interface Props {
		visible?: boolean;
		position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
	}

	let { visible = true, position = 'top-right' }: Props = $props();

	let fps = $state(60);
	let latency = $state(0);
	let cacheHitRate = $state(0);
	let errorCount = $state(0);
	let systemQuality = $state(100);
	let mostCommonError = $state<string | null>(null);

	let updateInterval: ReturnType<typeof setInterval>;

	// Load visibility from localStorage first, then use prop as default
	let isVisible = $state(
		typeof window !== 'undefined'
			? localStorage.getItem('metrics_visible') !== 'false'
			: visible
	);

	// Save visibility to localStorage whenever it changes
	$effect(() => {
		if (typeof window !== 'undefined') {
			localStorage.setItem('metrics_visible', String(isVisible));
		}
	});

	// Position classes
	const positionClasses: Record<typeof position, string> = {
		'top-left': 'top-4 left-4',
		'top-right': 'top-4 right-4',
		'bottom-left': 'bottom-4 left-4',
		'bottom-right': 'bottom-4 right-4'
	};

	function updateMetrics() {
		// FPS from frame rate monitor
		fps = frameRateMonitor.getFPS();

		// Average AI analysis latency
		const aiStats = performanceMonitor.getStats('analyzePose');
		latency = aiStats ? Math.round(aiStats.avg) : 0;

		// Cache hit rate
		const totalRequests = performanceMonitor.getStats('analyzePose')?.count || 0;
		const cacheHits = performanceMonitor.getStats('analyzePose_cache_hit')?.count || 0;
		cacheHitRate = totalRequests > 0 ? Math.round((cacheHits / totalRequests) * 100) : 0;

		// Error tracking
		errorCount = errorTracker.getErrorRate();
		const commonError = errorTracker.getMostCommonError();
		mostCommonError = commonError ? getErrorLabel(commonError) : null;

		// Calculate system quality score
		const fpsScore = Math.min(100, (fps / 60) * 100);
		const latencyScore = latency > 0 ? Math.max(0, 100 - (latency / 2000) * 100) : 100;
		const cacheScore = cacheHitRate;
		const errorScore = Math.max(0, 100 - errorCount * 10);

		systemQuality = Math.round((fpsScore * 0.3 + latencyScore * 0.3 + cacheScore * 0.2 + errorScore * 0.2));
	}

	function getErrorLabel(errorType: string): string {
		const labels: Record<string, string> = {
			NETWORK_ERROR: '网络错误',
			API_ERROR: 'API错误',
			PARSING_ERROR: '解析错误',
			RATE_LIMIT_ERROR: '请求限制',
			AUTHENTICATION_ERROR: '认证失败',
			TIMEOUT_ERROR: '超时',
			INVALID_RESPONSE: '响应无效'
		};
		return labels[errorType] || errorType;
	}

	function getQualityColor(score: number): string {
		if (score >= 80) return '#4ade80';
		if (score >= 60) return '#fbbf24';
		if (score >= 40) return '#f97316';
		return '#ef4444';
	}

	function getQualityLabel(score: number): string {
		if (score >= 80) return '优秀';
		if (score >= 60) return '良好';
		if (score >= 40) return '一般';
		return '较差';
	}

	function getFpsColor(fps: number): string {
		if (fps >= 50) return '#4ade80';
		if (fps >= 30) return '#fbbf24';
		if (fps >= 20) return '#f97316';
		return '#ef4444';
	}

	onMount(() => {
		// Start frame rate monitoring
		frameRateMonitor.start();

		// Update metrics every 500ms
		updateInterval = setInterval(updateMetrics, 500);
	});

	onDestroy(() => {
		if (updateInterval) clearInterval(updateInterval);
		frameRateMonitor.stop();
	});
</script>

{#if isVisible}
	<div
		class="performance-metrics {positionClasses[position]}"
		style="background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1);"
	>
		<!-- Header -->
		<div class="metrics-header">
			<span class="metrics-title">性能指标</span>
			<button class="toggle-btn" onclick={() => (isVisible = false)} aria-label="隐藏">✕</button>
		</div>

		<!-- System Quality Score -->
		<div class="metric-card primary-metric" in:fly|quintInOut="{{ x: -50 }}" out:fly|quintInOut="{{ opacity: 0 }}">
			<div class="metric-icon">⚡</div>
			<div class="metric-content">
				<div class="metric-label">系统质量</div>
				<div class="metric-value" style="color: {getQualityColor(systemQuality)}">
					{systemQuality}%
				</div>
				<div class="metric-sub">{getQualityLabel(systemQuality)}</div>
			</div>
			<div class="quality-ring">
				<svg viewBox="0 0 36 36" class="circular-chart">
					<path
						class="circle-bg"
						d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
					/>
					<path
						class="circle"
						stroke={getQualityColor(systemQuality)}
						stroke-dasharray="{systemQuality}, 100"
						d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
					/>
				</svg>
			</div>
		</div>

		<!-- FPS Metric -->
		<div class="metric-card" in:fly|quintInOut="{{ x: -50 }}" out:fade|global style="--delay: 50ms">
			<div class="metric-icon-small">🎥</div>
			<div class="metric-content-small">
				<div class="metric-label-small">帧率</div>
				<div class="metric-value-small" style="color: {getFpsColor(fps)}">{fps} FPS</div>
			</div>
			<div class="metric-bar">
				<div class="metric-bar-fill" style="width: {Math.min(100, (fps / 60) * 100)}%; background: {getFpsColor(fps)};" />
			</div>
		</div>

		<!-- Latency Metric -->
		<div class="metric-card" in:fly|quintInOut="{{ x: -50 }}" out:fade|global style="--delay: 100ms">
			<div class="metric-icon-small">📡</div>
			<div class="metric-content-small">
				<div class="metric-label-small">AI延迟</div>
				<div class="metric-value-small">
					{latency > 0 ? latency + 'ms' : '-'}
				</div>
			</div>
			<div class="metric-bar">
				<div
					class="metric-bar-fill"
					style="width: {Math.min(100, latency > 0 ? (latency / 2000) * 100 : 0)}%; background: {latency < 1000 ? '#4ade80' : latency < 2000 ? '#fbbf24' : '#ef4444'};"
				/>
			</div>
		</div>

		<!-- Cache Hit Rate -->
		<div class="metric-card" in:fly|quintInOut="{{ x: -50 }}" out:fade|global style="--delay: 150ms">
			<div class="metric-icon-small">💾</div>
			<div class="metric-content-small">
				<div class="metric-label-small">缓存命中率</div>
				<div class="metric-value-small">{cacheHitRate}%</div>
			</div>
			<div class="metric-bar">
				<div
					class="metric-bar-fill"
					style="width: {cacheHitRate}%; background: {cacheHitRate >= 50 ? '#4ade80' : cacheHitRate >= 30 ? '#fbbf24' : '#ef4444'};"
				/>
			</div>
		</div>

		<!-- Error Count -->
		<div class="metric-card" in:fly|quintInOut="{{ x: -50 }}" out:fade|global style="--delay: 200ms">
			<div class="metric-icon-small">⚠️</div>
			<div class="metric-content-small">
				<div class="metric-label-small">错误数</div>
				<div class="metric-value-small" style="color: {errorCount > 5 ? '#ef4444' : errorCount > 2 ? '#fbbf24' : '#4ade80'}">
					{errorCount}
				</div>
			</div>
			{#if mostCommonError}
				<div class="metric-tag" style="background: rgba(239, 68, 68, 0.2); color: #ef4444;">
					{mostCommonError}
				</div>
			{/if}
		</div>

		<!-- Cache Size -->
		<div class="metric-card" in:fly|quintInOut="{{ x: -50 }}" out:fade|global style="--delay: 250ms">
			<div class="metric-icon-small">📦</div>
			<div class="metric-content-small">
				<div class="metric-label-small">缓存条目</div>
				<div class="metric-value-small">{analysisCache.size}</div>
			</div>
		</div>
	</div>

	<!-- Floating toggle button when hidden -->
{:else}
	<button
		class="metrics-toggle-btn {positionClasses[position]}"
		onclick={() => (isVisible = true)}
		aria-label="显示性能指标"
	>
		📊
	</button>
{/if}

<style>
	.performance-metrics {
		position: fixed;
		z-index: 1000;
		border-radius: 12px;
		padding: 16px;
		min-width: 280px;
		max-width: 320px;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
		transition: opacity 0.3s ease;
	}

	.metrics-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 12px;
		padding-bottom: 8px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.metrics-title {
		color: #fff;
		font-size: 14px;
		font-weight: 600;
		letter-spacing: 0.5px;
	}

	.toggle-btn {
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.6);
		cursor: pointer;
		font-size: 16px;
		padding: 4px 8px;
		border-radius: 4px;
		transition: all 0.2s;
	}

	.toggle-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
	}

	.metric-card {
		position: relative;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 8px;
		padding: 12px;
		margin-bottom: 8px;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.primary-metric {
		background: linear-gradient(135deg, rgba(74, 222, 128, 0.15), rgba(59, 130, 246, 0.15));
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.metric-icon {
		font-size: 32px;
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 12px;
	}

	.metric-icon-small {
		font-size: 20px;
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.08);
		border-radius: 8px;
	}

	.metric-content {
		flex: 1;
	}

	.metric-content-small {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.metric-label {
		color: rgba(255, 255, 255, 0.7);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin-bottom: 4px;
	}

	.metric-label-small {
		color: rgba(255, 255, 255, 0.6);
		font-size: 11px;
	}

	.metric-value {
		color: #fff;
		font-size: 28px;
		font-weight: 700;
		line-height: 1;
	}

	.metric-value-small {
		color: #fff;
		font-size: 16px;
		font-weight: 600;
	}

	.metric-sub {
		color: rgba(255, 255, 255, 0.5);
		font-size: 12px;
		margin-top: 2px;
	}

	.quality-ring {
		width: 48px;
		height: 48px;
	}

	.circular-chart {
		display: block;
		margin: 0 auto;
		max-width: 100%;
		max-height: 100%;
	}

	.circle-bg {
		fill: none;
		stroke: rgba(255, 255, 255, 0.1);
		stroke-width: 2.5;
	}

	.circle {
		fill: none;
		stroke-width: 2.5;
		stroke-linecap: round;
		transition: stroke-dasharray 0.5s ease;
	}

	.metric-bar {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 3px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 0 0 8px 8px;
		overflow: hidden;
	}

	.metric-bar-fill {
		height: 100%;
		transition: width 0.3s ease, background 0.3s ease;
	}

	.metric-tag {
		position: absolute;
		top: -6px;
		right: 8px;
		padding: 2px 8px;
		border-radius: 10px;
		font-size: 10px;
		font-weight: 500;
		white-space: nowrap;
	}

	.metrics-toggle-btn {
		position: fixed;
		z-index: 999;
		background: rgba(0, 0, 0, 0.8);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 50%;
		width: 48px;
		height: 48px;
		font-size: 20px;
		cursor: pointer;
		transition: all 0.3s ease;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
	}

	.metrics-toggle-btn:hover {
		transform: scale(1.1);
		background: rgba(0, 0, 0, 0.9);
		border-color: rgba(255, 255, 255, 0.3);
	}

	/* Animations */
	@keyframes pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.7;
		}
	}

	.metric-icon {
		animation: pulse 2s ease-in-out infinite;
	}
</style>
