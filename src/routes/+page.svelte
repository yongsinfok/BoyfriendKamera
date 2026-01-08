<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { settings, currentStyle, presetStyles } from '$lib/stores/settings';
	import { goto } from '$app/navigation';
	import { isAnalyzing, aiSuggestion, createSession, addPhotoToSession } from '$lib/stores/camera';
	import { getGLMService, captureFrame } from '$lib/services/glm';

	let videoElement: HTMLVideoElement;
	let stream: MediaStream | null = null;
	let analysisInterval: number | null = null;
	let isCapturing = false;

	// Test mode for photo upload
	let testMode = false;
	let uploadedImage: string | null = null;
	let fileInput: HTMLInputElement;

	// Settings
	let apiKey = $settings.apiKey;
	let enableVibration = $settings.enableVibration;
	let enableGuideLines = $settings.enableGuideLines;

	// Subscribe to settings changes
	settings.subscribe((s) => {
		apiKey = s.apiKey;
		enableVibration = s.enableVibration;
		enableGuideLines = s.enableGuideLines;
	});

	async function startCamera() {
		try {
			stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
				audio: false
			});
			if (videoElement) {
				videoElement.srcObject = stream;
				// Start AI analysis loop after camera is ready
				videoElement.onloadedmetadata = () => {
					if (apiKey && !testMode) {
						startAnalysisLoop();
					}
				};
			}
		} catch (err) {
			console.error('Camera access failed:', err);
			aiSuggestion.set({
				composition_suggestion: '请允许相机访问权限',
				lighting_assessment: '',
				angle_suggestion: '',
				overall_score: 0,
				should_vibrate: false
			});
		}
	}

	function stopCamera() {
		if (analysisInterval) {
			clearInterval(analysisInterval);
			analysisInterval = null;
		}
		if (stream) {
			stream.getTracks().forEach(track => track.stop());
			stream = null;
		}
	}

	// AI Analysis loop - every 2 seconds
	function startAnalysisLoop() {
		if (analysisInterval) clearInterval(analysisInterval);

		analysisInterval = setInterval(async () => {
			if (!videoElement || !apiKey || isCapturing || testMode) return;

			try {
				isAnalyzing.set(true);
				const base64Frame = captureFrame(videoElement, 0.5);

				const glm = getGLMService(apiKey, 'glm-4v-flash');
				const style = $currentStyle?.name || '';
				const suggestion = await glm.analyzeFrame(base64Frame, style);

				aiSuggestion.set(suggestion);

				// Vibrate if score is good
				if (suggestion.should_vibrate && enableVibration && 'vibrate' in navigator) {
					navigator.vibrate(50);
				}
			} catch (err) {
				console.error('AI analysis failed:', err);
			} finally {
				isAnalyzing.set(false);
			}
		}, 2000) as unknown as number;
	}

	async function takePhoto() {
		if (!videoElement || testMode) return;

		isCapturing = true;

		// Flash effect
		const flash = document.createElement('div');
		flash.className = 'flash-effect';
		document.body.appendChild(flash);
		setTimeout(() => flash.remove(), 100);

		// Capture photo
		const canvas = document.createElement('canvas');
		canvas.width = videoElement.videoWidth;
		canvas.height = videoElement.videoHeight;
		const ctx = canvas.getContext('2d');
		if (ctx) {
			ctx.drawImage(videoElement, 0, 0);

			canvas.toBlob(async (blob) => {
				if (blob) {
					await addPhotoToSession(blob);
				}
				isCapturing = false;
			}, 'image/jpeg', 0.9);
		} else {
			isCapturing = false;
		}
	}

	// Handle file upload for testing
	async function handleFileUpload(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		// Read and display the image
		const reader = new FileReader();
		reader.onload = (e) => {
			uploadedImage = e.target?.result as string;
		};
		reader.readAsDataURL(file);

		// Analyze the image
		if (!apiKey) {
			aiSuggestion.set({
				composition_suggestion: '请先在设置中配置 API Key',
				lighting_assessment: '',
				angle_suggestion: '',
				overall_score: 0,
				should_vibrate: false
			});
			return;
		}

		isAnalyzing.set(true);
		try {
			const glm = getGLMService(apiKey, 'glm-4v-flash');
			const style = $currentStyle?.name || '';

			// Convert file to base64
			const base64 = await new Promise<string>((resolve) => {
				const reader = new FileReader();
				reader.onload = (e) => {
					const result = e.target?.result as string;
					// Remove data:image/...;base64, prefix
					resolve(result.split(',')[1]);
				};
				reader.readAsDataURL(file);
			});

			const suggestion = await glm.analyzeFrame(base64, style);
			aiSuggestion.set(suggestion);

			if (suggestion.should_vibrate && enableVibration && 'vibrate' in navigator) {
				navigator.vibrate(50);
			}
		} catch (err) {
			console.error('AI analysis failed:', err);
			aiSuggestion.set({
				composition_suggestion: '分析失败，请重试',
				lighting_assessment: '',
				angle_suggestion: '',
				overall_score: 0,
				should_vibrate: false
			});
		} finally {
			isAnalyzing.set(false);
		}
	}

	function toggleTestMode() {
		testMode = !testMode;
		if (testMode) {
			stopCamera();
			uploadedImage = null;
		} else {
			uploadedImage = null;
			startCamera();
		}
	}

	function showStyleSelector() {
		// Simple implementation - cycle through styles
		const styles = $presetStyles;
		const currentIndex = styles.findIndex(s => s.id === $currentStyle?.id);
		const nextIndex = (currentIndex + 1) % styles.length;
		currentStyle.set(styles[nextIndex]);
	}

	function goToHistory() {
		goto('/history');
	}

	function goToSettings() {
		goto('/settings');
	}

	onMount(() => {
		// Initialize settings
		settings.init();
		// Create new session
		createSession();
		// Start camera
		startCamera();
	});

	onDestroy(() => {
		stopCamera();
	});
</script>

<svelte:head>
	<meta name="theme-color" content="#000000" />
</svelte:head>

<div class="camera-container">
	{#if testMode && uploadedImage}
		<!-- Test mode - show uploaded image -->
		<img src={uploadedImage} alt="Test image" class="test-image" />
	{:else}
		<!-- Camera mode -->
		<video
			bind:this={videoElement}
			autoplay
			playsinline
			muted
			class="camera-feed"
			class:hidden={testMode}
		></video>
	{/if}

	<div class="overlay">
		<!-- Rule of thirds grid (only in camera mode) -->
		{#if enableGuideLines && !testMode}
			<div class="grid-lines">
				<div class="grid-line vertical"></div>
				<div class="grid-line vertical right"></div>
				<div class="grid-line horizontal"></div>
				<div class="grid-line horizontal bottom"></div>
			</div>
		{/if}

		<!-- Top bar with mode toggle and style selector -->
		<div class="top-bar">
			<button class="test-mode-btn" on:click={toggleTestMode}>
				{testMode ? '📷 相机' : '🖼️ 测试'}
			</button>
			<button class="style-btn" on:click={showStyleSelector}>
				{#if $currentStyle}
					📷 {$currentStyle.name}
				{:else}
					📷 风格
				{/if}
			</button>
			<button class="history-btn" on:click={goToHistory}>📚 历史</button>
		</div>

		<!-- AI suggestion text -->
		<div class="ai-suggestion">
			{#if $isAnalyzing}
				<span class="analyzing">AI 正在思考...</span>
			{:else if $aiSuggestion}
				{#if $aiSuggestion.composition_suggestion}
					{$aiSuggestion.composition_suggestion}
				{:else}
					{testMode ? '请上传照片' : '准备拍照中...'}
				{/if}
				{#if $aiSuggestion.overall_score > 0.7}
					<span class="score-good">✨</span>
				{/if}
			{:else if !apiKey}
				请先在设置中配置 API Key
			{:else}
				正在初始化 AI...
			{/if}
		</div>

		<!-- Bottom controls -->
		<div class="bottom-controls">
			<button class="history-btn-small" on:click={goToHistory} aria-label="历史记录">📚</button>
			{#if testMode}
				<!-- Upload button in test mode -->
				<label class="upload-btn" aria-label="上传照片">
					<input
						type="file"
						accept="image/*"
						bind:this={fileInput}
						on:change={handleFileUpload}
						hidden
					>
					<span>📤 上传</span>
				</label>
			{:else}
				<!-- Shutter button in camera mode -->
				<button
					class="shutter-btn"
					on:click={takePhoto}
					disabled={isCapturing}
					class:capturing={isCapturing}
					aria-label="拍照"
				></button>
			{/if}
			<button class="settings-btn-small" on:click={goToSettings} aria-label="设置">⚙️</button>
		</div>
	</div>
</div>

<style>
	.camera-container {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: #000;
	}

	.camera-feed {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.camera-feed.hidden {
		display: none;
	}

	.test-image {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	.grid-lines {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
	}

	.grid-line {
		position: absolute;
		background: rgba(255, 255, 255, 0.3);
	}

	.grid-line.vertical {
		width: 1px;
		height: 100%;
		left: 33.33%;
	}

	.grid-line.vertical.right {
		left: 66.67%;
	}

	.grid-line.horizontal {
		width: 100%;
		height: 1px;
		top: 33.33%;
	}

	.grid-line.horizontal.bottom {
		top: 66.67%;
	}

	.top-bar {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		display: flex;
		justify-content: space-between;
		padding: 1rem;
		gap: 0.5rem;
		pointer-events: auto;
	}

	.top-bar button {
		background: rgba(0, 0, 0, 0.5);
		border: none;
		color: white;
		padding: 0.5rem 1rem;
		border-radius: 20px;
		font-size: 0.9rem;
		cursor: pointer;
		backdrop-filter: blur(10px);
		white-space: nowrap;
	}

	.test-mode-btn {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
	}

	.ai-suggestion {
		position: absolute;
		bottom: 140px;
		left: 50%;
		transform: translateX(-50%);
		background: rgba(0, 0, 0, 0.7);
		color: white;
		padding: 0.75rem 1rem;
		border-radius: 20px;
		font-size: 0.9rem;
		max-width: 80%;
		text-align: center;
		pointer-events: auto;
		backdrop-filter: blur(10px);
	}

	.analyzing {
		opacity: 0.7;
	}

	.score-good {
		margin-left: 0.5rem;
	}

	.bottom-controls {
		position: absolute;
		bottom: 2rem;
		left: 0;
		right: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 2rem;
		pointer-events: auto;
	}

	.history-btn-small,
	.settings-btn-small {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.5);
		border: none;
		color: white;
		font-size: 1.2rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		backdrop-filter: blur(10px);
	}

	.shutter-btn {
		width: 70px;
		height: 70px;
		border-radius: 50%;
		background: white;
		border: 4px solid rgba(255, 255, 255, 0.3);
		cursor: pointer;
		transition: transform 0.1s, box-shadow 0.1s;
	}

	.shutter-btn:active {
		transform: scale(0.9);
	}

	.shutter-btn.capturing {
		opacity: 0.5;
	}

	.upload-btn {
		width: 70px;
		height: 70px;
		border-radius: 50%;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		border: 4px solid rgba(255, 255, 255, 0.3);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.1s, box-shadow 0.1s;
	}

	.upload-btn span {
		color: white;
		font-size: 0.8rem;
	}

	.upload-btn:active {
		transform: scale(0.9);
	}

	/* Flash effect */
	:global(.flash-effect) {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: white;
		z-index: 9999;
		animation: flash 0.1s ease-out;
	}

	@keyframes flash {
		from { opacity: 1; }
		to { opacity: 0; }
	}
</style>
