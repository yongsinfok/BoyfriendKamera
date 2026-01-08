/**
 * Save photo blob to device gallery (download)
 * Works in PWA/Web environment by triggering a download
 */
export async function savePhotoToGallery(blob: Blob, filename?: string): Promise<boolean> {
	try {
		// Generate filename with timestamp if not provided
		if (!filename) {
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
			filename = `boyfriend-camera-${timestamp}.jpg`;
		}

		// Create download link
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = filename;

		// Append to document, click, and cleanup
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);

		// Revoke URL after a short delay
		setTimeout(() => URL.revokeObjectURL(url), 100);

		return true;
	} catch (error) {
		console.error('Failed to save photo:', error);
		return false;
	}
}

/**
 * Save multiple photos to gallery
 */
export async function savePhotosToGallery(blobs: Blob[]): Promise<number> {
	let savedCount = 0;

	// Add small delay between downloads to avoid browser blocking
	for (let i = 0; i < blobs.length; i++) {
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
		const filename = `boyfriend-camera-${timestamp}-${i + 1}.jpg`;
		const success = await savePhotoToGallery(blobs[i], filename);
		if (success) savedCount++;

		// Wait 300ms between downloads (except for the last one)
		if (i < blobs.length - 1) {
			await new Promise(resolve => setTimeout(resolve, 300));
		}
	}

	return savedCount;
}

/**
 * Get a display-friendly filename from photo metadata
 */
export function getPhotoFilename(photoId: string, createdAt: Date): string {
	const date = new Date(createdAt);
	const timestamp = date.toISOString().replace(/[:.]/g, '-').slice(0, -5);
	return `boyfriend-camera-${timestamp}.jpg`;
}
