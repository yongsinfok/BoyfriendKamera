<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { settings } from '$lib/stores/settings';

	let apiKeyInput = '';
	let enableVibration = true;
	let enableGuideLines = true;
	let showApiKey = false;
	let isSaving = false;
	let saveSuccess = false;

	onMount(() => {
		// Load current settings
		const saved = settings.get();
		if (saved) {
			apiKeyInput = saved.apiKey || '';
			enableVibration = saved.enableVibration ?? true;
			enableGuideLines = saved.enableGuideLines ?? true;
		}
	});

	async function saveSettings() {
		isSaving = true;
		saveSuccess = false;

		await settings.set({
			apiKey: apiKeyInput.trim(),
			enableVibration,
			enableGuideLines
		});

		isSaving = false;
		saveSuccess = true;

		// Hide success message after 2 seconds
		setTimeout(() => {
			saveSuccess = false;
		}, 2000);
	}

	function goBack() {
		goto('/');
	}
</script>

<svelte:head>
	<title>设置 - 男友相机</title>
	<meta name="theme-color" content="#000000" />
</svelte:head>

<div class="settings-container">
	<!-- Header -->
	<div class="header">
		<button class="back-btn" on:click={goBack} aria-label="返回">
			←
		</button>
		<h1>设置</h1>
		<div class="spacer"></div>
	</div>

	<!-- Settings form -->
	<div class="settings-content">
		<div class="setting-group">
			<div class="setting-item">
				<div class="setting-label">
					<label for="api-key">GLM API Key</label>
					<span class="setting-hint">智谱AI的API密钥</span>
				</div>
				<div class="api-key-input-wrapper">
					<input
						id="api-key"
						type={showApiKey ? 'text' : 'password'}
						bind:value={apiKeyInput}
						placeholder="输入你的 API Key"
						class="setting-input"
						disabled={isSaving}
					/>
					<button
						class="toggle-visibility"
						on:click={() => showApiKey = !showApiKey}
						aria-label={showApiKey ? '隐藏' : '显示'}
					>
						{showApiKey ? '👁️' : '🔒'}
					</button>
				</div>
				<a
					href="https://open.bigmodel.cn/usercenter/apikeys"
					target="_blank"
					rel="noopener noreferrer"
					class="get-api-link"
				>
					获取 API Key →
				</a>
			</div>
		</div>

		<div class="setting-group">
			<h2>相机设置</h2>

			<div class="setting-item">
				<div class="setting-label">
					<label for="vibration">震动反馈</label>
					<span class="setting-hint">拍照时震动提示</span>
				</div>
				<label class="toggle-switch">
					<input
						id="vibration"
						type="checkbox"
						bind:checked={enableVibration}
						disabled={isSaving}
					/>
					<span class="toggle-slider"></span>
				</label>
			</div>

			<div class="setting-item">
				<div class="setting-label">
					<label for="guidelines">辅助线</label>
					<span class="setting-hint">显示三分线辅助构图</span>
				</div>
				<label class="toggle-switch">
					<input
						id="guidelines"
						type="checkbox"
						bind:checked={enableGuideLines}
						disabled={isSaving}
					/>
					<span class="toggle-slider"></span>
				</label>
			</div>
		</div>
	</div>

	<!-- Save button -->
	<div class="save-section">
		<button
			class="save-btn"
			on:click={saveSettings}
			disabled={isSaving}
			class:success={saveSuccess}
		>
			{isSaving ? '保存中...' : saveSuccess ? '✓ 已保存' : '保存设置'}
		</button>
	</div>
</div>

<style>
	.settings-container {
		min-height: 100vh;
		background: #0a0a0a;
		color: #fff;
		display: flex;
		flex-direction: column;
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem;
		background: rgba(255, 255, 255, 0.05);
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.header h1 {
		font-size: 1.1rem;
		font-weight: 600;
		margin: 0;
	}

	.back-btn {
		background: transparent;
		border: none;
		color: #fff;
		font-size: 1.5rem;
		padding: 0.25rem 0.5rem;
		cursor: pointer;
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		transition: background 0.2s;
	}

	.back-btn:active {
		background: rgba(255, 255, 255, 0.1);
	}

	.spacer {
		width: 40px;
	}

	.settings-content {
		flex: 1;
		padding: 1.5rem;
		overflow-y: auto;
	}

	.setting-group {
		margin-bottom: 2rem;
	}

	.setting-group h2 {
		font-size: 0.85rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.5);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0 0 1rem 0;
	}

	.setting-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
		flex-wrap: wrap;
		gap: 1rem;
	}

	.setting-item:last-child {
		border-bottom: none;
	}

	.setting-label {
		flex: 1;
		min-width: 200px;
	}

	.setting-label label {
		display: block;
		font-weight: 500;
		margin-bottom: 0.25rem;
	}

	.setting-hint {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.5);
	}

	/* API Key input wrapper */
	.api-key-input-wrapper {
		display: flex;
		gap: 0.5rem;
		flex: 1;
		min-width: 200px;
	}

	.setting-input {
		flex: 1;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 8px;
		padding: 0.75rem 1rem;
		color: #fff;
		font-size: 0.9rem;
		font-family: monospace;
		transition: border-color 0.2s;
	}

	.setting-input:focus {
		outline: none;
		border-color: #667eea;
	}

	.setting-input::placeholder {
		color: rgba(255, 255, 255, 0.3);
	}

	.setting-input:disabled {
		opacity: 0.5;
	}

	.toggle-visibility {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 8px;
		padding: 0 1rem;
		color: #fff;
		cursor: pointer;
		font-size: 1.2rem;
		transition: background 0.2s;
	}

	.toggle-visibility:hover {
		background: rgba(255, 255, 255, 0.15);
	}

	.get-api-link {
		display: inline-block;
		margin-top: 0.75rem;
		color: #667eea;
		text-decoration: none;
		font-size: 0.85rem;
	}

	.get-api-link:hover {
		text-decoration: underline;
	}

	/* Toggle switch */
	.toggle-switch {
		position: relative;
		display: inline-block;
		width: 52px;
		height: 28px;
	}

	.toggle-switch input {
		opacity: 0;
		width: 0;
		height: 0;
	}

	.toggle-slider {
		position: absolute;
		cursor: pointer;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(255, 255, 255, 0.2);
		transition: 0.3s;
		border-radius: 28px;
	}

	.toggle-slider:before {
		position: absolute;
		content: "";
		height: 22px;
		width: 22px;
		left: 3px;
		bottom: 3px;
		background-color: white;
		transition: 0.3s;
		border-radius: 50%;
	}

	.toggle-switch input:checked + .toggle-slider {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	}

	.toggle-switch input:checked + .toggle-slider:before {
		transform: translateX(24px);
	}

	.toggle-switch input:disabled + .toggle-slider {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Save section */
	.save-section {
		padding: 1.5rem;
		background: rgba(255, 255, 255, 0.02);
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		position: sticky;
		bottom: 0;
	}

	.save-btn {
		width: 100%;
		padding: 1rem;
		border: none;
		border-radius: 12px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
	}

	.save-btn:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
	}

	.save-btn:active:not(:disabled) {
		transform: translateY(0);
	}

	.save-btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.save-btn.success {
		background: linear-gradient(135deg, #10b981 0%, #059669 100%);
	}
</style>
