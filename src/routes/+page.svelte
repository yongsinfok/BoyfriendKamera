<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { settings, currentStyle, presetStyles, defaultModel } from '$lib/stores/settings';
	import { goto } from '$app/navigation';
	import { isAnalyzing, aiSuggestion, createSession, addPhotoToSession, currentSession, currentPhotoCount } from '$lib/stores/camera';
	import { getGLMService, captureFrame } from '$lib/services/glm';

	let videoElement: HTMLVideoElement;
	let stream: MediaStream | null = null;
	let analysisInterval: number | null = null;
	let isCapturing = false;

	// For cleanup of visibility change listener
	let visibilityChangeHandler: (() => void) | null = null;

	// Test mode for photo upload
	let testMode = false;
	let uploadedImage: string | null = null;

	// Photo save feedback
	let showSavedFeedback = false;

	// Zoom controls
	let zoomLevel = 1; // 1 = 1x, 2 = 2x, 0.5 = 0.5x
	let zoomOptions = [0.5, 1, 2]; // Available zoom levels
	let currentZoomIndex = 1; // Start at 1x (index 1)
	let minZoom = 1;
	let maxZoom = 1;
	let zoomSupported = false;

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
				// Check zoom capabilities after camera is ready
				videoElement.onloadedmetadata = () => {
					checkZoomCapabilities();
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

	function checkZoomCapabilities() {
		const track = stream?.getVideoTracks()[0];
		if (!track) return;

		const capabilities = track.getCapabilities() as { zoom?: { min: number; max: number } };
		if (capabilities?.zoom) {
			minZoom = capabilities.zoom.min;
			maxZoom = capabilities.zoom.max;
			zoomSupported = true;
			// Set default zoom to 1x
			setZoom(1);
		} else {
			zoomSupported = false;
		}
	}

	async function setZoom(level: number) {
		const track = stream?.getVideoTracks()[0];
		if (!track) return;

		const capabilities = track.getCapabilities() as { zoom?: { min: number; max: number } };

		if (capabilities?.zoom) {
			const clampedLevel = Math.max(capabilities.zoom.min, Math.min(capabilities.zoom.max, level));
			try {
				await track.applyConstraints({ advanced: [{ zoom: clampedLevel }] });
				zoomLevel = clampedLevel;
			} catch (err) {
				console.error('Failed to set zoom:', err);
			}
		}
	}

	function cycleZoom() {
		currentZoomIndex = (currentZoomIndex + 1) % zoomOptions.length;
		const newZoom = zoomOptions[currentZoomIndex];
		setZoom(newZoom);
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

			// Skip analysis if page is hidden (battery optimization)
			if (document.hidden) return;

			try {
				isAnalyzing.set(true);
				const base64Frame = captureFrame(videoElement, 0.5);

				// Use the selected model from settings
				const model = $defaultModel || 'glm-4.6v-flash';
				const glm = getGLMService(apiKey, model);
				const style = $currentStyle?.name || '';
				const suggestion = await glm.analyzeFrame(base64Frame, style);

				aiSuggestion.set(suggestion);

				// Vibrate if score is good (lightweight vibration for battery)
				if (suggestion.should_vibrate && enableVibration && 'vibrate' in navigator) {
					navigator.vibrate(30); // Reduced from 50ms to 30ms for battery
				}
			} catch (err) {
				console.error('AI analysis failed:', err);
			} finally {
				isAnalyzing.set(false);
			}
		}, 2000) as unknown as number;
	}

	// Stop analysis loop (for battery optimization when page is hidden)
	function stopAnalysisLoop() {
		if (analysisInterval) {
			clearInterval(analysisInterval);
			analysisInterval = null;
		}
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
					// Show saved feedback
					showSavedFeedback = true;
					setTimeout(() => showSavedFeedback = false, 1500);
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
			// Use the selected model from settings
			const model = $defaultModel || 'glm-4.6v-flash';
			const glm = getGLMService(apiKey, model);
			const style = $currentStyle?.name || '';

			// Compress image and convert to base64
			const base64 = await new Promise<string>((resolve, reject) => {
				const img = new Image();
				img.onload = () => {
					// Create canvas to resize/compress
					const canvas = document.createElement('canvas');
					const ctx = canvas.getContext('2d');

					// Calculate new dimensions (max 1024x1024 for GLM-4V)
					const maxDim = 1024;
					let width = img.width;
					let height = img.height;

					if (width > maxDim || height > maxDim) {
						if (width > height) {
							height = Math.round((height * maxDim) / width);
							width = maxDim;
						} else {
							width = Math.round((width * maxDim) / height);
							height = maxDim;
						}
					}

					canvas.width = width;
					canvas.height = height;

					if (ctx) {
						ctx.drawImage(img, 0, 0, width, height);
						// Use JPEG quality 0.8 for compression
						resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
					} else {
						reject(new Error('Failed to get canvas context'));
					}
				};
				img.onerror = () => reject(new Error('Failed to load image'));
				img.src = URL.createObjectURL(file);
			});

			const suggestion = await glm.analyzeFrame(base64, style);
			aiSuggestion.set(suggestion);

			if (suggestion.should_vibrate && enableVibration && 'vibrate' in navigator) {
				navigator.vibrate(50);
			}
		} catch (err) {
			console.error('AI analysis failed:', err);
			aiSuggestion.set({
				composition_suggestion: `分析失败: ${err instanceof Error ? err.message : '未知错误'}`,
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

		// Battery optimization: pause/resume AI when page visibility changes
		visibilityChangeHandler = () => {
			if (document.hidden) {
				// Page is hidden, stop AI analysis to save battery
				stopAnalysisLoop();
			} else {
				// Page is visible again, resume AI analysis if conditions are met
				if (apiKey && !testMode && videoElement) {
					startAnalysisLoop();
				}
			}
		};

		document.addEventListener('visibilitychange', visibilityChangeHandler);
	});

	onDestroy(() => {
		stopCamera();
		// Cleanup visibility change listener
		if (visibilityChangeHandler) {
			document.removeEventListener('visibilitychange', visibilityChangeHandler);
			visibilityChangeHandler = null;
		}
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
				<!-- Vertical lines at 33.33% and 66.67% -->
				<div class="grid-line vertical v1"></div>
				<div class="grid-line vertical v2"></div>
				<!-- Horizontal lines at 33.33% and 66.67% -->
				<div class="grid-line horizontal h1"></div>
				<div class="grid-line horizontal h2"></div>

				<!-- Position indicator circle from AI -->
				{#if $aiSuggestion?.guide_lines && $aiSuggestion.guide_lines.length > 0}
					{#each $aiSuggestion.guide_lines as guide}
						{#if guide.type === 'standing_position' && guide.x !== undefined && guide.y !== undefined}
							<div class="position-indicator" style="left: {guide.x * 100}%; top: {guide.y * 100}%;"></div>
						{/if}
					{/each}
				{/if}
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
			<button class="history-btn" on:click={goToHistory}>
				📚 {$currentPhotoCount > 0 ? `(${$currentPhotoCount})` : ''}
			</button>
		</div>

		<!-- Zoom control (only show when zoom is supported and in camera mode) -->
		{#if zoomSupported && !testMode}
			<button class="zoom-btn" on:click={cycleZoom}>
				{zoomOptions[currentZoomIndex]}x
			</button>
		{/if}

		<!-- Saved feedback toast -->
		{#if showSavedFeedback}
			<div class="saved-toast">
				✓ 已保存到相册
			</div>
		{/if}

		<!-- AI suggestion text -->
		<div class="ai-suggestion">
			{#if $aiSuggestion && $aiSuggestion.composition_suggestion}
				{$aiSuggestion.composition_suggestion}
				{#if $aiSuggestion.overall_score > 0.7}
					<span class="score-good">✨</span>
				{/if}
			{:else if $isAnalyzing}
				<span class="analyzing">AI 正在思考...</span>
			{:else if !apiKey}
				请先在设置中配置 API Key
			{:else}
				{testMode ? '请上传照片' : '准备拍照中...'}
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

	/* iOS-style 9-grid lines */
	.grid-line.vertical {
		width: 1px;
		height: 100%;
	}

	.grid-line.vertical.v1 {
		left: 33.33%;
	}

	.grid-line.vertical.v2 {
		left: 66.67%;
	}

	.grid-line.horizontal {
		width: 100%;
		height: 1px;
	}

	.grid-line.horizontal.h1 {
		top: 33.33%;
	}

	.grid-line.horizontal.h2 {
		top: 66.67%;
	}

	/* Position indicator circle */
	.position-indicator {
		position: absolute;
		width: 60px;
		height: 60px;
		transform: translate(-50%, -50%);
		border: 3px solid rgba(255, 215, 0, 0.8);
		border-radius: 50%;
		background: rgba(255, 215, 0, 0.1);
		box-shadow: 0 0 20px rgba(255, 215, 0, 0.5), inset 0 0 10px rgba(255, 215, 0, 0.3);
		animation: pulse 2s ease-in-out infinite;
		pointer-events: none;
	}

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

	/* Zoom button */
	.zoom-btn {
		position: absolute;
		top: 5rem;
		right: 1rem;
		background: rgba(0, 0, 0, 0.6);
		border: 2px solid rgba(255, 255, 255, 0.3);
		color: white;
		padding: 0.5rem 1rem;
		border-radius: 20px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		pointer-events: auto;
		backdrop-filter: blur(10px);
		transition: all 0.2s;
		min-width: 60px;
	}

	.zoom-btn:active {
		transform: scale(0.95);
		background: rgba(0, 0, 0, 0.8);
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

	/* Saved feedback toast */
	.saved-toast {
		position: absolute;
		top: 5rem;
		left: 50%;
		transform: translateX(-50%);
		background: rgba(16, 185, 129, 0.9);
		color: white;
		padding: 0.75rem 1.5rem;
		border-radius: 20px;
		font-weight: 500;
		animation: slideIn 0.3s ease-out, fadeOut 0.3s ease-in 1.2s forwards;
		z-index: 100;
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
	}

	@keyframes fadeOut {
		from {
			opacity: 1;
		}
		to {
			opacity: 0;
		}
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
