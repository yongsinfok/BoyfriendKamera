<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { activateUpdate } from '../../hooks.client';

	let showUpdateBanner = false;
	let isReloading = false;

	onMount(() => {
		// Listen for service worker update available event
		const handleUpdateAvailable = () => {
			showUpdateBanner = true;
		};

		window.addEventListener('sw-update-available', handleUpdateAvailable);

		return () => {
			window.removeEventListener('sw-update-available', handleUpdateAvailable);
		};
	});

	function handleUpdateClick() {
		if (isReloading) return;
		isReloading = true;
		activateUpdate();
	}

	function handleDismiss() {
		showUpdateBanner = false;
	}
</script>

{#if showUpdateBanner}
	<div class="update-banner">
		<div class="update-banner-content">
			<span class="update-icon">🔄</span>
			<span class="update-text">新版本可用，点击更新</span>
			<button
				class="update-btn"
				onclick={handleUpdateClick}
				disabled={isReloading}
				aria-label="Update now"
			>
				{isReloading ? '更新中...' : '立即更新'}
			</button>
			<button class="dismiss-btn" onclick={handleDismiss} aria-label="Dismiss">
				✕
			</button>
		</div>
	</div>
{/if}

<style>
	.update-banner {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 9999;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		animation: slideDown 0.3s ease-out;
	}

	.update-banner-content {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		padding: 12px 16px;
		max-width: 600px;
		margin: 0 auto;
	}

	.update-icon {
		font-size: 20px;
		animation: spin 2s linear infinite;
	}

	.update-text {
		color: white;
		font-size: 14px;
		font-weight: 500;
		flex: 1;
		text-align: center;
	}

	.update-btn {
		background: white;
		color: #667eea;
		border: none;
		padding: 8px 16px;
		border-radius: 20px;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		white-space: nowrap;
	}

	.update-btn:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
	}

	.update-btn:disabled {
		opacity: 0.7;
		cursor: wait;
	}

	.dismiss-btn {
		background: rgba(255, 255, 255, 0.2);
		color: white;
		border: none;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		font-size: 14px;
		cursor: pointer;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.dismiss-btn:hover {
		background: rgba(255, 255, 255, 0.3);
	}

	@keyframes slideDown {
		from {
			transform: translateY(-100%);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	/* Add padding to body to prevent content jump */
	:global(body) {
		padding-top: 0;
	}

	:global(body.has-update-banner) {
		padding-top: 60px;
	}
</style>
