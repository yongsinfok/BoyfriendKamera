<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { sessionService, photoService } from '$lib/services/db';
	import { savePhotoToGallery } from '$lib/utils/photo';
	import type { Photo, Session } from '$lib/types';

	// Swipe action for left swipe to reveal delete button
	function swipeable(node: HTMLElement, params: { onDelete: () => void; onSelect: () => void }) {
		let startX = 0;
		let startY = 0;
		let currentX = 0;
		let isDragging = false;

		function onTouchStart(e: TouchEvent) {
			startX = e.touches[0].clientX;
			startY = e.touches[0].clientY;
			currentX = 0;
			isDragging = false;
			node.style.transition = 'none';
		}

		function onTouchMove(e: TouchEvent) {
			const x = e.touches[0].clientX;
			const y = e.touches[0].clientY;
			const deltaX = x - startX;
			const deltaY = y - startY;

			// Only handle horizontal swipes
			if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
				isDragging = true;
				e.preventDefault();

				// Only allow left swipe (negative deltaX)
				if (deltaX < 0) {
					currentX = Math.max(deltaX, -100); // Max 100px left
					node.style.transform = `translateX(${currentX}px)`;
				}
			}
		}

		function onTouchEnd() {
			node.style.transition = 'transform 0.2s ease-out';

			if (currentX < -70) {
				// Swiped far enough - show delete button
				currentX = -100;
				node.style.transform = 'translateX(-100px)';
				showDeleteButton();
			} else {
				// Not far enough - reset
				currentX = 0;
				node.style.transform = 'translateX(0px)';
			}
			isDragging = false;
		}

		function onClick() {
			if (!isDragging && currentX === 0) {
				params.onSelect();
			}
			// Reset on click
			resetPosition();
		}

		function showDeleteButton() {
			const wrapper = node.parentElement;
			const btn = wrapper?.querySelector('.session-delete-btn') as HTMLElement;
			if (btn) btn.classList.add('visible');
		}

		function hideDeleteButton() {
			const wrapper = node.parentElement;
			const btn = wrapper?.querySelector('.session-delete-btn') as HTMLElement;
			if (btn) btn.classList.remove('visible');
		}

		function resetPosition() {
			currentX = 0;
			node.style.transform = 'translateX(0px)';
			hideDeleteButton();
		}

		node.addEventListener('touchstart', onTouchStart, { passive: true });
		node.addEventListener('touchmove', onTouchMove, { passive: false });
		node.addEventListener('touchend', onTouchEnd, { passive: true });
		node.addEventListener('click', onClick);

		return {
			destroy() {
				node.removeEventListener('touchstart', onTouchStart);
				node.removeEventListener('touchmove', onTouchMove);
				node.removeEventListener('touchend', onTouchEnd);
				node.removeEventListener('click', onClick);
			}
		};
	}

	let sessions: Session[] = [];
	let selectedSession: Session | null = null;
	let photos: Photo[] = [];
	let loading = true;
	let previewPhoto: Photo | null = null;
	let previewIndex = 0;
	let isSaving = false;
	let showSavedToast = false;

	onMount(async () => {
		await loadSessions();
	});

	async function loadSessions() {
		loading = true;
		const allSessions = await sessionService.getAll();
		// Filter out sessions with no photos
		sessions = allSessions.filter(s => s.photos && s.photos.length > 0);
		loading = false;
	}

	async function selectSession(session: Session) {
		selectedSession = session;
		photos = await photoService.getBySession(session.id);
	}

	async function toggleLike(photo: Photo) {
		const updated = !photo.isUserSelected;
		await photoService.update(photo.id, { isUserSelected: updated });
		// Update the photos array reactively
		photos = photos.map(p => p.id === photo.id ? { ...p, isUserSelected: updated } : p);
		// Also update preview if open
		if (previewPhoto?.id === photo.id) {
			previewPhoto = { ...previewPhoto, isUserSelected: updated };
		}
	}

	function openPreview(photo: Photo) {
		previewPhoto = photo;
		previewIndex = photos.indexOf(photo);
	}

	function closePreview() {
		previewPhoto = null;
	}

	function nextPhoto() {
		if (previewIndex < photos.length - 1) {
			previewIndex++;
			previewPhoto = photos[previewIndex];
		}
	}

	function prevPhoto() {
		if (previewIndex > 0) {
			previewIndex--;
			previewPhoto = photos[previewIndex];
		}
	}

	async function deletePhoto(photo: Photo) {
		const sessionId = photo.sessionId;
		await photoService.delete(photo.id);
		photos = photos.filter(p => p.id !== photo.id);
		if (previewPhoto?.id === photo.id) {
			closePreview();
		}

		// Check if session is now empty, delete it if so
		const remainingPhotos = await photoService.getBySession(sessionId);
		if (remainingPhotos.length === 0) {
			// Delete the empty session and go back to session list
			await sessionService.delete(sessionId);
			selectedSession = null;
		}

		// Reload sessions to update counts
		await loadSessions();
		if (selectedSession) {
			const updated = sessions.find(s => s.id === selectedSession.id);
			if (updated) {
				selectedSession = updated;
			}
		}
	}

	async function savePhoto(photo: Photo) {
		isSaving = true;
		try {
			const timestamp = new Date(photo.createdAt).toISOString().replace(/[:.]/g, '-').slice(0, -5);
			const filename = `boyfriend-camera-${timestamp}.jpg`;
			const success = await savePhotoToGallery(photo.blob, filename);
			if (success) {
				showSavedToast = true;
				setTimeout(() => showSavedToast = false, 2000);
			}
		} catch (err) {
			console.error('Failed to save photo:', err);
		} finally {
			isSaving = false;
		}
	}

	function goBack() {
		goto('/');
	}

	function formatDate(date: Date | string): string {
		const d = typeof date === 'string' ? new Date(date) : date;
		const now = new Date();
		const diffMs = now.getTime() - d.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return '刚刚';
		if (diffMins < 60) return `${diffMins}分钟前`;
		if (diffHours < 24) return `${diffHours}小时前`;
		if (diffDays < 7) return `${diffDays}天前`;

		return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
	}

	function formatTime(date: Date | string): string {
		const d = typeof date === 'string' ? new Date(date) : date;
		return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
	}

	async function deleteSession(sessionId: string) {
		await sessionService.delete(sessionId);
		await loadSessions();
	}
</script>

<svelte:head>
	<title>历史记录 - 男友相机</title>
	<meta name="theme-color" content="#000000" />
</svelte:head>

<div class="history-container">
	<!-- Header -->
	<div class="header">
		<button class="back-btn" on:click={goBack} aria-label="返回">
			←
		</button>
		<h1>历史记录</h1>
		<div class="spacer"></div>
	</div>

	<!-- Content -->
	<div class="content">
		{#if loading}
			<div class="loading">加载中...</div>
		{:else if sessions.length === 0}
			<div class="empty">
				<p>还没有拍照记录</p>
				<button class="start-btn" on:click={goBack}>开始拍照</button>
			</div>
		{:else if !selectedSession}
			<!-- Session list -->
			<div class="session-list">
				{#each sessions as session}
					<div class="session-item-wrapper">
						<!-- Delete button (revealed on swipe) -->
						<button
							class="session-delete-btn"
							on:click|stopPropagation={() => deleteSession(session.id)}
						>
							删除
						</button>
						<!-- Session item -->
						<div
							class="session-item"
							use:swipeable={{ onDelete: () => deleteSession(session.id), onSelect: () => selectSession(session) }}
						>
							<div class="session-icon">📷</div>
							<div class="session-info">
								<div class="session-date">{formatDate(session.startedAt)}</div>
								<div class="session-time">{formatTime(session.startedAt)} · {session.photos?.length || 0} 张照片</div>
							</div>
							<div class="session-arrow">›</div>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<!-- Photos in selected session -->
			<div class="photos-view">
				<button class="back-to-sessions" on:click={() => selectedSession = null}>
					← 返回
				</button>

				<div class="session-title">
					{formatDate(selectedSession.startedAt)} {formatTime(selectedSession.startedAt)}
				</div>

				{#if photos.length === 0}
					<div class="empty-photos">暂无照片</div>
				{:else}
					<div class="photos-grid">
						{#each photos as photo}
							<div class="photo-item" on:click={() => openPreview(photo)}>
								<img src={URL.createObjectURL(photo.blob)} alt="照片" />
								<button
									class="like-btn"
									class:liked={photo.isUserSelected}
									on:click|stopPropagation={() => toggleLike(photo)}
									aria-label={photo.isUserSelected ? '取消喜欢' : '喜欢'}
								>
									{photo.isUserSelected ? '❤️' : '🤍'}
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>

<!-- Photo Preview Modal -->
{#if previewPhoto}
	<div class="preview-modal" on:click={closePreview}>
		<div class="preview-content" on:click|stopPropagation>
			<button class="preview-close" on:click={closePreview}>✕</button>
			<button class="preview-delete" on:click={() => deletePhoto(previewPhoto!)}>🗑️</button>

			<button class="preview-nav prev" on:click={prevPhoto} disabled={previewIndex === 0}>
				‹
			</button>
			<button class="preview-nav next" on:click={nextPhoto} disabled={previewIndex === photos.length - 1}>
				›
			</button>

			<img src={URL.createObjectURL(previewPhoto.blob)} alt="预览" class="preview-image" />

			<!-- Saved toast -->
			{#if showSavedToast}
				<div class="saved-toast">
					✓ 已保存到相册
				</div>
			{/if}

			<div class="preview-actions">
				<button
					class="preview-save"
					on:click={() => savePhoto(previewPhoto!)}
					disabled={isSaving}
				>
					{isSaving ? '⏳ 保存中...' : '📥 保存到相册'}
				</button>
				<button
					class="preview-like"
					class:liked={previewPhoto.isUserSelected}
					on:click={() => toggleLike(previewPhoto!)}
				>
					{previewPhoto.isUserSelected ? '❤️ 已喜欢' : '🤍 喜欢'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.history-container {
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

	.back-btn,
	.spacer {
		width: 40px;
	}

	.back-btn {
		background: transparent;
		border: none;
		color: #fff;
		font-size: 1.5rem;
		padding: 0.25rem 0.5rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		transition: background 0.2s;
	}

	.back-btn:active {
		background: rgba(255, 255, 255, 0.1);
	}

	.content {
		flex: 1;
		padding: 1rem;
		overflow-y: auto;
	}

	.loading,
	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 50vh;
		gap: 1rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.start-btn {
		padding: 0.75rem 2rem;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		border: none;
		border-radius: 20px;
		color: white;
		font-weight: 600;
		cursor: pointer;
	}

	/* Session list */
	.session-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.session-item-wrapper {
		position: relative;
		overflow: hidden;
		border-radius: 12px;
	}

	.session-delete-btn {
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		width: 100px;
		background: #ef4444;
		border: none;
		border-radius: 12px;
		color: white;
		font-weight: 600;
		font-size: 1rem;
		cursor: pointer;
		z-index: 1;
		transform: translateX(100%);
		transition: transform 0.3s ease-out;
	}

	.session-delete-btn.visible {
		transform: translateX(0);
	}

	.session-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 12px;
		cursor: pointer;
		transition: background 0.2s, transform 0.1s ease-out;
		position: relative;
		z-index: 2;
		user-select: none; /* Prevent text selection during swipe */
	}

	.session-item:active {
		background: rgba(255, 255, 255, 0.1);
	}

	.session-icon {
		font-size: 1.5rem;
		width: 44px;
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 50%;
	}

	.session-info {
		flex: 1;
	}

	.session-date {
		font-weight: 500;
		margin-bottom: 0.25rem;
	}

	.session-time {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.session-arrow {
		font-size: 1.5rem;
		color: rgba(255, 255, 255, 0.3);
	}

	/* Photos view */
	.photos-view {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.back-to-sessions {
		padding: 0.5rem 1rem;
		background: rgba(255, 255, 255, 0.1);
		border: none;
		border-radius: 20px;
		color: white;
		cursor: pointer;
		align-self: flex-start;
	}

	.session-title {
		font-size: 1.2rem;
		font-weight: 600;
		text-align: center;
	}

	.empty-photos {
		text-align: center;
		color: rgba(255, 255, 255, 0.5);
		padding: 3rem 0;
	}

	.photos-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.5rem;
	}

	.photo-item {
		aspect-ratio: 1;
		position: relative;
		border-radius: 8px;
		overflow: hidden;
		cursor: pointer;
	}

	.photo-item img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.like-btn {
		position: absolute;
		bottom: 8px;
		right: 8px;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		border: none;
		background: rgba(0, 0, 0, 0.6);
		font-size: 1rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.2s;
	}

	.like-btn:active {
		transform: scale(0.9);
	}

	.like-btn.liked {
		background: rgba(255, 255, 255, 0.2);
	}

	/* Preview modal */
	.preview-modal {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.95);
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.preview-content {
		position: relative;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.preview-image {
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
	}

	.preview-close,
	.preview-delete {
		position: absolute;
		top: 1rem;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		border: none;
		background: rgba(255, 255, 255, 0.1);
		color: white;
		font-size: 1.2rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.preview-close {
		right: 1rem;
	}

	.preview-delete {
		top: auto;
		bottom: 5rem;
		right: 1rem;
	}

	.preview-nav {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		width: 50px;
		height: 50px;
		border-radius: 50%;
		border: none;
		background: rgba(255, 255, 255, 0.1);
		color: white;
		font-size: 2rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.2s;
	}

	.preview-nav:active {
		background: rgba(255, 255, 255, 0.2);
	}

	.preview-nav.prev {
		left: 1rem;
	}

	.preview-nav.next {
		right: 1rem;
	}

	.preview-nav:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.preview-actions {
		position: absolute;
		bottom: 2rem;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		gap: 1rem;
	}

	.preview-save,
	.preview-like {
		padding: 0.75rem 1.5rem;
		border-radius: 20px;
		border: none;
		background: rgba(255, 255, 255, 0.1);
		color: white;
		font-size: 1rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		transition: background 0.2s;
	}

	.preview-save:active,
	.preview-like:active {
		background: rgba(255, 255, 255, 0.2);
	}

	.preview-save:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.preview-like.liked {
		background: rgba(255, 62, 108, 0.3);
	}

	/* Saved toast */
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
		animation: slideIn 0.3s ease-out, fadeOut 0.3s ease-in 1.7s forwards;
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
</style>
