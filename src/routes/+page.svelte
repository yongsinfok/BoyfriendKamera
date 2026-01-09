<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { settings, currentStyle, presetStyles, defaultModel } from '$lib/stores/settings';
	import { goto } from '$app/navigation';
	import { isAnalyzing, aiSuggestion, createSession, addPhotoToSession, currentSession, currentPhotoCount } from '$lib/stores/camera';
	import { getGLMService, captureFrame } from '$lib/services/glm';
	import PoseSkeleton from '$lib/components/PoseSkeleton.svelte';
	import PoseConfidenceIndicator from '$lib/components/PoseConfidenceIndicator.svelte';
	import PoseDifferenceVisualizer from '$lib/components/PoseDifferenceVisualizer.svelte';
	import PerformanceMetrics from '$lib/components/PerformanceMetrics.svelte';

	let videoElement: HTMLVideoElement;
	let stream: MediaStream | null = null;
	let analysisInterval: number | null = null;
	let isCapturing = false;

	// Camera modes (iOS style)
	type CameraMode = 'photo' | 'video' | 'portrait' | 'square' | 'pano';
	let currentMode: CameraMode = 'photo';
	let cameraModes: { id: CameraMode; label: string; icon: string }[] = [
		{ id: 'video', label: '视频', icon: '🎥' },
		{ id: 'photo', label: '照片', icon: '📷' },
		{ id: 'square', label: '方形', icon: '⬜' },
		{ id: 'portrait', label: '人像', icon: '👤' }
	];

	// Flash modes
	type FlashMode = 'auto' | 'on' | 'off';
	let flashMode: FlashMode = 'auto';

	// HDR
	let hdrEnabled = false;

	// Live Photo
	let livePhotoEnabled = true;

	// Timer
	let timerSeconds = 0; // 0, 3, 10
	let timerActive = false;

	// Grid
	let gridEnabled = false;

	// Filters
	let showFilters = false;

	// Camera facing
	let facingMode: 'user' | 'environment' = 'environment';

	// Zoom
	let zoomLevel = 1;
	let minZoom = 1;
	let maxZoom = 1;
	let zoomSupported = false;

	// Focus
	let focusPoint: { x: number; y: number } | null = null;
	let showFocusSquare = false;

	// Exposure lock
	let exposureLocked = false;

	// Test mode
	let testMode = false;
	let uploadedImage: string | null = null;

	// Photo save feedback
	let showSavedFeedback = false;

	// Settings
	let apiKey = $settings.apiKey;
	let enableVibration = $settings.enableVibration;
	let aiCoachMode = $settings.enablePoseGuide || false;

	// Subscribe to settings changes
	settings.subscribe((s) => {
		apiKey = s.apiKey;
		enableVibration = s.enableVibration;
		gridEnabled = s.enableGuideLines;
		aiCoachMode = s.enablePoseGuide || false;
	});

	async function startCamera() {
		try {
			stream = await navigator.mediaDevices.getUserMedia({
				video: {
					facingMode: facingMode,
					width: { ideal: 1920 },
					height: { ideal: 1080 }
				},
				audio: false
			});
			if (videoElement) {
				videoElement.srcObject = stream;
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
			setZoom(1);
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

	async function switchCamera() {
		facingMode = facingMode === 'environment' ? 'user' : 'environment';
		stopCamera();
		await startCamera();
	}

	function cycleFlash() {
		const modes: FlashMode[] = ['auto', 'on', 'off'];
		const currentIndex = modes.indexOf(flashMode);
		flashMode = modes[(currentIndex + 1) % modes.length];
	}

	function toggleHDR() {
		hdrEnabled = !hdrEnabled;
	}

	function toggleLivePhoto() {
		livePhotoEnabled = !livePhotoEnabled;
	}

	function cycleTimer() {
		const options = [0, 3, 10];
		const currentIndex = options.indexOf(timerSeconds);
		timerSeconds = options[(currentIndex + 1) % options.length];
	}

	function toggleGrid() {
		gridEnabled = !gridEnabled;
		settings.update({ enableGuideLines: gridEnabled });
	}

	async function takePhoto() {
		if (!videoElement || testMode) return;

		// Timer countdown
		if (timerSeconds > 0) {
			timerActive = true;
			for (let i = timerSeconds; i > 0; i--) {
				await new Promise(resolve => setTimeout(resolve, 1000));
			}
			timerActive = false;
		}

		isCapturing = true;

		// Flash effect
		if (flashMode === 'on') {
			const flash = document.createElement('div');
			flash.className = 'flash-effect';
			document.body.appendChild(flash);
			setTimeout(() => flash.remove(), 100);
		}

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
					showSavedFeedback = true;
					setTimeout(() => showSavedFeedback = false, 1500);

					// Vibrate feedback
					if (enableVibration && 'vibrate' in navigator) {
						navigator.vibrate(50);
					}
				}
				isCapturing = false;
			}, 'image/jpeg', 0.95);
		} else {
			isCapturing = false;
		}
	}

	function handleVideoTap(event: MouseEvent) {
		if (!videoElement) return;

		const rect = videoElement.getBoundingClientRect();
		const x = (event.clientX - rect.left) / rect.width;
		const y = (event.clientY - rect.top) / rect.height;

		// Set focus point
		focusPoint = { x, y };
		showFocusSquare = true;

		// Hide focus square after animation
		setTimeout(() => {
			showFocusSquare = false;
		}, 1000);

		// Trigger focus/exposure (would need to use ImageCapture API)
		// For now, just visual feedback
	}

	function handleVideoZoom(event: WheelEvent) {
		if (!zoomSupported) return;

		event.preventDefault();
		const delta = event.deltaY > 0 ? -0.5 : 0.5;
		const newZoom = Math.max(minZoom, Math.min(maxZoom, zoomLevel + delta));
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

	function startAnalysisLoop() {
		if (analysisInterval) clearInterval(analysisInterval);

		analysisInterval = setInterval(async () => {
			if (!videoElement || !apiKey || isCapturing || testMode) return;
			if (document.hidden) return;

			try {
				isAnalyzing.set(true);
				const isFlashModel = ($defaultModel || 'glm-4.6v-flash').includes('flash');
				const quality = isFlashModel ? 0.4 : 0.5;
				const base64Frame = captureFrame(videoElement, quality);

				const model = $defaultModel || 'glm-4.6v-flash';
				const glm = getGLMService(apiKey, model);
				const style = $currentStyle?.name || '';

				let suggestion;
				if (aiCoachMode) {
					suggestion = await glm.analyzePose(base64Frame, style);
				} else {
					suggestion = await glm.analyzeFrame(base64Frame, style);
				}

				aiSuggestion.set(suggestion);

				if (suggestion.should_vibrate && enableVibration && 'vibrate' in navigator) {
					navigator.vibrate(30);
				}

				if (aiCoachMode && suggestion.voice_instruction && 'speechSynthesis' in window) {
					const utterance = new SpeechSynthesisUtterance(suggestion.voice_instruction);
					utterance.lang = 'zh-CN';
					utterance.rate = 0.9;
					speechSynthesis.speak(utterance);
				}
			} catch (err) {
				console.error('AI analysis failed:', err);
			} finally {
				isAnalyzing.set(false);
			}
		}, 2500) as unknown as number;
	}

	function stopAnalysisLoop() {
		if (analysisInterval) {
			clearInterval(analysisInterval);
			analysisInterval = null;
		}
	}

	async function handleFileUpload(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (e) => {
			uploadedImage = e.target?.result as string;
		};
		reader.readAsDataURL(file);

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
			const model = $defaultModel || 'glm-4.6v-flash';
			const glm = getGLMService(apiKey, model);
			const style = $currentStyle?.name || '';

			const base64 = await new Promise<string>((resolve, reject) => {
				const img = new Image();
				img.onload = () => {
					const canvas = document.createElement('canvas');
					const ctx = canvas.getContext('2d');
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
		settings.init();
		createSession();
		startCamera();

		const visibilityHandler = () => {
			if (document.hidden) {
				stopAnalysisLoop();
			} else {
				if (apiKey && !testMode && videoElement) {
					startAnalysisLoop();
				}
			}
		};
		document.addEventListener('visibilitychange', visibilityHandler);

		return () => {
			document.removeEventListener('visibilitychange', visibilityHandler);
		};
	});

	onDestroy(() => {
		stopCamera();
	});
</script>

<svelte:head>
	<meta name="theme-color" content="#000000" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
</svelte:head>

<div class="ios-camera">
	{#if testMode && uploadedImage}
		<!-- Test mode image -->
		<img src={uploadedImage} alt="Test" class="camera-feed" />
	{:else}
		<!-- Camera feed -->
		<video
			bind:this={videoElement}
			autoplay
			playsinline
			muted
			class="camera-feed"
			class:hidden={testMode}
			on:click={handleVideoTap}
			on:wheel={handleVideoZoom}
		></video>
	{/if}

	<!-- Grid overlay -->
	{#if gridEnabled && !testMode}
		<div class="grid-overlay">
			<div class="grid-line vertical v1"></div>
			<div class="grid-line vertical v2"></div>
			<div class="grid-line horizontal h1"></div>
			<div class="grid-line horizontal h2"></div>
		</div>
	{/if}

	<!-- Focus square -->
	{#if showFocusSquare && focusPoint}
		<div class="focus-square" style="left: {focusPoint.x * 100}%; top: {focusPoint.y * 100}%};"></div>
	{/if}

	<!-- AI Pose Guide overlay -->
	{#if aiCoachMode && $aiSuggestion?.pose_guide?.target_pose && !testMode}
		<div class="pose-guide-overlay">
			<PoseSkeleton pose={$aiSuggestion.pose_guide.target_pose} opacity={0.7} />

			{#if $aiSuggestion.pose_guide.current_pose}
				<PoseDifferenceVisualizer
					targetPose={$aiSuggestion.pose_guide.target_pose}
					currentPose={$aiSuggestion.pose_guide.current_pose}
					opacity={0.6}
				/>
			{/if}

			{#if $aiSuggestion.pose_guide.confidence !== undefined}
				<div class="confidence-indicator">
					<PoseConfidenceIndicator
						confidence={$aiSuggestion.pose_guide.confidence}
						label=""
					/>
				</div>
			{/if}

			{#if $aiSuggestion.pose_guide.instructions && $aiSuggestion.pose_guide.instructions.length > 0}
				<div class="pose-instructions-ios">
					{#each $aiSuggestion.pose_guide.instructions.slice(0, 2) as instruction}
						<div class="instruction-item-ios">{instruction}</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	<!-- Top toolbar -->
	<div class="top-toolbar">
		<!-- Flash button -->
		<button class="tool-btn" on:click={cycleFlash} aria-label="闪光灯">
			<span class="tool-icon">
				{#if flashMode === 'auto'}
					⚡
				{:else if flashMode === 'on'}
					⚡
				{:else}
					⚡
				{/if}
			</span>
			<span class="tool-label">{flashMode === 'auto' ? '自动' : flashMode === 'on' ? '开启' : '关闭'}</span>
		</button>

		<!-- HDR button -->
		<button class="tool-btn" class:active={hdrEnabled} on:click={toggleHDR} aria-label="HDR">
			<span class="tool-icon">HDR</span>
		</button>

		<!-- Live Photo -->
		<button class="tool-btn live-photo" class:active={livePhotoEnabled} on:click={toggleLivePhoto} aria-label="实况">
			<span class="tool-icon">{livePhotoEnabled ? '🔵' : '⭕'}</span>
			<span class="live-photo-rings"></span>
		</button>

		<!-- Timer -->
		<button class="tool-btn" class:active={timerSeconds > 0} on:click={cycleTimer} aria-label="定时器">
			<span class="tool-icon">⏱</span>
			<span class="tool-label">{timerSeconds > 0 ? timerSeconds + 's' : ''}</span>
		</button>

		<!-- Camera switch -->
		<button class="camera-switch" on:click={switchCamera} aria-label="切换摄像头">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M20 4h-3.17L15 2H9L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 11.5V13c1.25 0 2.45-.2 3.57-.57a1.02 1.02 0 0 0-.7-1.3c-.95.32-1.93.5-2.87.5V8c0-.55-.45-1-1-1s-1 .45-1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6c0-1.65 1.35-3 3-3s3 1.35 3 3v6c0 1.65-1.35 3-3 3s-3-1.35-3-3V9.5c-2 0-3.92-.5-5.71-1.43a1 1 0 0 0-.7 1.3c1.92 1 4.12 1.43 6.41 1.43z"/>
			</svg>
		</button>
	</div>

	<!-- Mode selector (bottom) -->
	<div class="mode-selector">
		{#each cameraModes as mode}
			<button
				class="mode-btn"
				class:active={currentMode === mode.id}
				on:click={() => currentMode = mode.id}
				aria-label={mode.label}
			>
				<span class="mode-icon">{mode.icon}</span>
				{#if currentMode === mode.id}
					<span class="mode-label">{mode.label}</span>
				{/if}
			</button>
		{/each}
	</div>

	<!-- Shutter button (center bottom) -->
	<div class="shutter-container">
		<!-- Photo gallery preview -->
		<button class="gallery-preview" on:click={goToHistory} aria-label="照片库">
			{#if $currentPhotoCount > 0}
				<span class="gallery-count">{$currentPhotoCount}</span>
			{/if}
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
				<rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="white" stroke-opacity="0.8"/>
				<circle cx="8.5" cy="8.5" r="1.5" fill="white" fill-opacity="0.8"/>
				<circle cx="15.5" cy="8.5" r="1.5" fill="white" fill-opacity="0.8"/>
				<path d="M8 15c1.5 2 6.5 2 8 0" stroke="white" stroke-opacity="0.8" stroke-width="1.5" stroke-linecap="round"/>
			</svg>
		</button>

		<!-- Main shutter button -->
		<button
			class="shutter-button"
			on:click={takePhoto}
			disabled={isCapturing}
			class:capturing={isCapturing}
			class:timer-active={timerActive}
			aria-label="拍照"
		>
			{#if timerActive && timerSeconds > 0}
				<span class="timer-countdown">{timerSeconds}</span>
			{/if}
		</button>

		<!-- Filter/Effects button -->
		<button class="effects-btn" on:click={showStyleSelector} aria-label="效果">
			{#if $currentStyle}
				<span class="effect-icon">{$currentStyle.icon}</span>
			{:else}
				<span class="effect-icon">🎨</span>
			{/if}
		</button>
	</div>

	<!-- AI suggestion overlay (subtle) -->
	{#if $aiSuggestion?.composition_suggestion && !testMode}
		<div class="ai-hint">
			{$aiSuggestion.composition_suggestion}
		</div>
	{/if}

	<!-- Saved feedback -->
	{#if showSavedFeedback}
		<div class="saved-feedback">
			<div class="saved-icon"></div>
		</div>
	{/if}

	<!-- Test mode upload -->
	{#if testMode}
		<div class="test-mode-upload">
			<label class="upload-label">
				<input type="file" accept="image/*" on:change={handleFileUpload} hidden>
				<span>📤 上传照片</span>
			</label>
			<button class="exit-test-btn" on:click={toggleTestMode}>退出测试模式</button>
		</div>
	{/if}

	<!-- Settings access (long press or hidden) -->
	<button class="settings-access" on:click={goToSettings} aria-label="设置">
		⚙️
	</button>

	<!-- Performance metrics -->
	<PerformanceMetrics visible={true} position="top-right" />
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		overflow: hidden;
		background: #000;
		-webkit-user-select: none;
		user-select: none;
	}

	.ios-camera {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: #000;
		overflow: hidden;
	}

	.camera-feed {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	/* Grid overlay */
	.grid-overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 10;
	}

	.grid-line {
		position: absolute;
		background: rgba(255, 255, 255, 0.3);
	}

	.grid-line.vertical {
		width: 1px;
		height: 100%;
		top: 0;
	}

	.grid-line.vertical.v1 { left: 33.33%; }
	.grid-line.vertical.v2 { left: 66.67%; }

	.grid-line.horizontal {
		width: 100%;
		height: 1px;
		left: 0;
	}

	.grid-line.horizontal.h1 { top: 33.33%; }
	.grid-line.horizontal.h2 { top: 66.67%; }

	/* Focus square */
	.focus-square {
		position: absolute;
		width: 60px;
		height: 60px;
		transform: translate(-50%, -50%);
		border: 2px solid #FFCC00;
		border-radius: 4px;
		pointer-events: none;
		z-index: 20;
		animation: focusPulse 1s ease-out;
	}

	.focus-square::before,
	.focus-square::after {
		content: '';
		position: absolute;
		background: #FFCC00;
	}

	.focus-square::before {
		width: 20px;
		height: 1px;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
	}

	.focus-square::after {
		width: 1px;
		height: 20px;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
	}

	@keyframes focusPulse {
		0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
		100% { opacity: 0; transform: translate(-50%, -50%) scale(1.5); }
	}

	/* Top toolbar */
	.top-toolbar {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 20px;
		background: linear-gradient(to bottom, rgba(0, 0, 0, 0.6), transparent);
		z-index: 100;
	}

	.tool-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		background: transparent;
		border: none;
		color: white;
		padding: 8px 12px;
		border-radius: 8px;
		cursor: pointer;
		transition: background 0.2s;
		min-width: 44px;
	}

	.tool-btn:active {
		background: rgba(255, 255, 255, 0.1);
	}

	.tool-btn.active {
		color: #FFCC00;
	}

	.tool-icon {
		font-size: 18px;
		line-height: 1;
	}

	.tool-label {
		font-size: 10px;
		color: rgba(255, 255, 255, 0.6);
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
	}

	/* Live Photo special styling */
	.live-photo .live-photo-rings {
		position: absolute;
		width: 28px;
		height: 28px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 50%;
		animation: none;
	}

	.live-photo.active .live-photo-rings {
		border-color: rgba(255, 204, 0, 0.6);
		animation: livePhotoPulse 2s ease-in-out infinite;
	}

	@keyframes livePhotoPulse {
		0%, 100% { transform: scale(1); opacity: 0.6; }
		50% { transform: scale(1.3); opacity: 0; }
	}

	/* Camera switch button */
	.camera-switch {
		width: 44px;
		height: 44px;
		background: rgba(255, 255, 255, 0.1);
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s;
	}

	.camera-switch:active {
		background: rgba(255, 255, 255, 0.2);
		transform: scale(0.95);
	}

	.camera-switch svg {
		width: 20px;
		height: 20px;
		color: white;
	}

	/* Mode selector */
	.mode-selector {
		position: absolute;
		bottom: 60px;
		left: 0;
		right: 0;
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 8px;
		padding: 0 20px;
		z-index: 100;
	}

	.mode-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		background: transparent;
		border: none;
		color: rgba(255, 255, 255, 0.5);
		padding: 8px 16px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.mode-btn.active {
		color: #FFCC00;
	}

	.mode-btn:active {
		transform: scale(0.95);
	}

	.mode-icon {
		font-size: 22px;
	}

	.mode-label {
		font-size: 10px;
		font-weight: 600;
		white-space: nowrap;
	}

	/* Shutter container */
	.shutter-container {
		position: absolute;
		bottom: 30px;
		left: 0;
		right: 0;
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 40px;
		padding: 0 20px;
		z-index: 100;
	}

	/* Gallery preview */
	.gallery-preview {
		position: relative;
		width: 50px;
		height: 50px;
		background: rgba(255, 255, 255, 0.15);
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s;
		overflow: hidden;
	}

	.gallery-preview:active {
		transform: scale(0.95);
	}

	.gallery-preview svg {
		width: 28px;
		height: 28px;
	}

	.gallery-count {
		position: absolute;
		top: -2px;
		right: -2px;
		background: #FFCC00;
		color: #000;
		font-size: 10px;
		font-weight: bold;
		padding: 2px 6px;
		border-radius: 10px;
		min-width: 16px;
		text-align: center;
	}

	/* Shutter button - iOS style */
	.shutter-button {
		width: 72px;
		height: 72px;
		background: white;
		border: none;
		border-radius: 50%;
		cursor: pointer;
		position: relative;
		transition: all 0.1s;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
	}

	.shutter-button::before {
		content: '';
		position: absolute;
		top: 4px;
		left: 4px;
		right: 4px;
		bottom: 4px;
		border: 2px solid #000;
		border-radius: 50%;
		transition: all 0.1s;
	}

	.shutter-button:active:not(:disabled) {
		transform: scale(0.95);
	}

	.shutter-button:active:not(:disabled)::before {
		top: 8px;
		left: 8px;
		right: 8px;
		bottom: 8px;
		border-width: 4px;
	}

	.shutter-button:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.shutter-button.timer-active {
		background: #FFCC00;
	}

	.timer-countdown {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		font-size: 32px;
		font-weight: bold;
		color: #000;
		animation: timerPulse 1s ease-in-out infinite;
	}

	@keyframes timerPulse {
		0%, 100% { transform: translate(-50%, -50%) scale(1); }
		50% { transform: translate(-50%, -50%) scale(1.1); }
	}

	/* Effects button */
	.effects-btn {
		width: 44px;
		height: 44px;
		background: rgba(255, 255, 255, 0.1);
		border: none;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s;
	}

	.effects-btn:active {
		transform: scale(0.95);
	}

	.effect-icon {
		font-size: 20px;
	}

	/* AI hint - subtle overlay */
	.ai-hint {
		position: absolute;
		bottom: 150px;
		left: 0;
		right: 0;
		text-align: center;
		padding: 0 20px;
		color: rgba(255, 255, 255, 0.7);
		font-size: 14px;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
		pointer-events: none;
		z-index: 50;
	}

	/* Saved feedback animation */
	.saved-feedback {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 1000;
		animation: savedPop 0.6s ease-out forwards;
	}

	.saved-icon {
		width: 60px;
		height: 60px;
		background: rgba(255, 255, 255, 0.95);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 30px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
		animation: savedCheck 0.6s ease-out forwards;
	}

	@keyframes savedPop {
		0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
		50% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
		100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
	}

	@keyframes savedCheck {
		0% { content: ''; }
		50% { content: ''; }
		100% { content: '✓'; }
	}

	.saved-icon::after {
		content: '✓';
		color: #000;
		font-weight: bold;
	}

	/* Test mode upload */
	.test-mode-upload {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 16px;
		padding: 20px;
		background: rgba(0, 0, 0, 0.8);
		z-index: 100;
	}

	.upload-label {
		background: #FFCC00;
		color: #000;
		padding: 12px 24px;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
	}

	.exit-test-btn {
		background: rgba(255, 255, 255, 0.2);
		color: white;
		padding: 12px 24px;
		border: none;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
	}

	/* Settings access (subtle) */
	.settings-access {
		position: absolute;
		top: 12px;
		left: 12px;
		width: 44px;
		height: 44px;
		background: transparent;
		border: none;
		color: rgba(255, 255, 255, 0.5);
		font-size: 20px;
		cursor: pointer;
		z-index: 100;
		opacity: 0;
		transition: opacity 0.3s;
	}

	.ios-camera:hover .settings-access,
	.settings-access:focus {
		opacity: 1;
	}

	/* Pose guide overlay */
	.pose-guide-overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 30;
	}

	.confidence-indicator {
		position: absolute;
		top: 80px;
		left: 50%;
		transform: translateX(-50%);
	}

	.pose-instructions-ios {
		position: absolute;
		bottom: 160px;
		left: 0;
		right: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 0 20px;
	}

	.instruction-item-ios {
		background: rgba(0, 0, 0, 0.7);
		color: white;
		padding: 8px 16px;
		border-radius: 8px;
		font-size: 14px;
		text-align: center;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
		backdrop-filter: blur(10px);
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
		animation: flash 0.1s ease-out forwards;
	}

	@keyframes flash {
		0% { opacity: 1; }
		100% { opacity: 0; }
	}

	/* Responsive adjustments */
	@media (max-width: 375px) {
		.shutter-button {
			width: 64px;
			height: 64px;
		}

		.mode-btn {
			padding: 6px 12px;
		}

		.mode-icon {
			font-size: 18px;
		}
	}

	@media (min-width: 768px) {
		.shutter-button {
			width: 80px;
			height: 80px;
		}

		.top-toolbar {
			padding: 16px 32px;
		}

		.mode-selector {
			bottom: 70px;
		}

		.shutter-container {
			bottom: 40px;
		}
	}
</style>
