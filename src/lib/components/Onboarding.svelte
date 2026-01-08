<script lang="ts">
	import { settings } from '$lib/stores/settings';
	import { goto } from '$app/navigation';

	export let onClose: () => void = () => {};

	let currentStep = 0;

	const steps = [
		{
			icon: '📷',
			title: '欢迎使用男友相机',
			description: '帮你拍出女友满意照片的 AI 助手',
			detail: '实时 AI 指导，让你每次都能拍出好照片'
		},
		{
			icon: '✨',
			title: '实时 AI 指导',
			description: '拍照时 AI 会告诉你如何调整',
			detail: '构图建议、光线分析、角度提示，一应俱全'
		},
		{
			icon: '🎨',
			title: '选择风格',
			description: '多种预设风格可选',
			detail: '小红书风、日系、胶片、Ins风、极简等风格'
		},
		{
			icon: '⚙️',
			title: '配置 API Key',
			description: '需要配置智谱 AI 的 API Key',
			detail: '前往 open.bigmodel.cn 获取，数据完全隐私'
		},
		{
			icon: '🚀',
			title: '开始拍照',
			description: '一切准备就绪',
			detail: '点击开始，进入相机界面'
		}
	];

	function nextStep() {
		if (currentStep < steps.length - 1) {
			currentStep++;
		} else {
			completeOnboarding();
		}
	}

	function prevStep() {
		if (currentStep > 0) {
			currentStep--;
		}
	}

	async function completeOnboarding() {
		// Mark onboarding as complete
		settings.set({ hasSeenOnboarding: true });

		// If on step 3 (API Key), go to settings, otherwise go to camera
		if (currentStep === 3) {
			goto('/settings');
		}

		onClose();
	}

	function skipOnboarding() {
		settings.set({ hasSeenOnboarding: true });
		onClose();
	}
</script>

<div class="onboarding-overlay" on:click={skipOnboarding}>
	<div class="onboarding-content" on:click|stopPropagation>
		<button class="close-btn" on:click={skipOnboarding} aria-label="跳过">✕</button>

		<div class="onboarding-body">
			<!-- Progress dots -->
			<div class="progress-dots">
				{#each steps as _, index}
					<div
						class="dot"
						class:active={index === currentStep}
						class:completed={index < currentStep}
					></div>
				{/each}
			</div>

			<!-- Current step content -->
			<div class="step-content" class:fade-in={true}>
				<div class="step-icon">{steps[currentStep].icon}</div>
				<h2 class="step-title">{steps[currentStep].title}</h2>
				<p class="step-description">{steps[currentStep].description}</p>
				<p class="step-detail">{steps[currentStep].detail}</p>
			</div>

			<!-- Navigation -->
			<div class="onboarding-nav">
				{#if currentStep > 0}
					<button class="nav-btn secondary" on:click={prevStep}>
						上一步
					</button>
				{:else}
					<div></div>
				{/if}

				<button class="nav-btn primary" on:click={nextStep}>
					{currentStep === steps.length - 1 ? '开始使用' : '下一步'}
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	.onboarding-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.9);
		z-index: 9999;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		animation: fadeIn 0.3s ease-out;
	}

	.onboarding-content {
		background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
		border-radius: 24px;
		max-width: 400px;
		width: 100%;
		padding: 2rem;
		position: relative;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
		animation: slideUp 0.4s ease-out;
	}

	.close-btn {
		position: absolute;
		top: 1rem;
		right: 1rem;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		border: none;
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.6);
		font-size: 1.2rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.close-btn:active {
		background: rgba(255, 255, 255, 0.2);
		transform: scale(0.95);
	}

	.onboarding-body {
		display: flex;
		flex-direction: column;
		min-height: 320px;
	}

	.progress-dots {
		display: flex;
		justify-content: center;
		gap: 8px;
		margin-bottom: 2rem;
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.2);
		transition: all 0.3s;
	}

	.dot.active {
		width: 24px;
		border-radius: 4px;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	}

	.dot.completed {
		background: rgba(102, 126, 234, 0.5);
	}

	.step-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}

	.step-icon {
		font-size: 4rem;
		margin-bottom: 1.5rem;
		animation: float 3s ease-in-out infinite;
	}

	.step-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: #fff;
		margin: 0 0 0.75rem 0;
	}

	.step-description {
		font-size: 1.1rem;
		color: #a0a0a0;
		margin: 0 0 0.5rem 0;
	}

	.step-detail {
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.5);
		margin: 0;
		line-height: 1.5;
	}

	.onboarding-nav {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		margin-top: 2rem;
	}

	.nav-btn {
		flex: 1;
		padding: 0.875rem 1.5rem;
		border-radius: 12px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		border: none;
	}

	.nav-btn.primary {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
	}

	.nav-btn.primary:active {
		transform: scale(0.98);
		opacity: 0.9;
	}

	.nav-btn.secondary {
		background: rgba(255, 255, 255, 0.1);
		color: white;
	}

	.nav-btn.secondary:active {
		background: rgba(255, 255, 255, 0.2);
	}

	.fade-in {
		animation: fadeIn 0.3s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(30px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes float {
		0%, 100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-10px);
		}
	}
</style>
