import { getAnalyticsManager } from './analytics';

/**
 * Social sharing and collaboration system
 * Features: share links, collaboration sessions, community features
 */

export interface ShareableContent {
	type: 'photo' | 'pose' | 'session' | 'achievement';
	title: string;
	description: string;
	imageUrl?: string;
	data: Record<string, any>;
	thumbnail?: string;
}

export interface ShareLink {
	id: string;
	contentId: string;
	createdAt: number;
	expiresAt?: number;
	accessCount: number;
	maxAccess?: number;
	password?: string;
	permissions: {
		allowDownload: boolean;
		allowEdit: boolean;
		allowComment: boolean;
	};
}

export interface CollaborationSession {
	id: string;
	host: string;
	participants: Participant[];
	poseTemplate?: any;
	startedAt: number;
	endedAt?: number;
	status: 'waiting' | 'active' | 'completed';
	sharedPhotos: SharedPhoto[];
}

export interface Participant {
	id: string;
	name: string;
	avatar?: string;
	role: 'host' | 'guest';
	joinedAt: number;
	status: 'online' | 'offline' | 'away';
}

export interface SharedPhoto {
	id: string;
	photoId: string;
	sharedBy: string;
	sharedAt: number;
	comments: Comment[];
	reactions: Reaction[];
}

export interface Comment {
	id: string;
	userId: string;
	userName: string;
	content: string;
	createdAt: number;
}

export interface Reaction {
	emoji: string;
	count: number;
	users: string[];
}

export interface SharePlatform {
	id: string;
	name: string;
	icon: string;
	shareUrl: string;
	supportedTypes: ShareableContent['type'][];
}

// Supported platforms
export const SHARE_PLATFORMS: SharePlatform[] = [
	{
		id: 'wechat',
		name: '微信',
		icon: '💬',
		shareUrl: 'https://api.weixin.qq.com/cgi-bin/share',
		supportedTypes: ['photo', 'pose']
	},
	{
		id: 'weibo',
		name: '微博',
		icon: '📱',
		shareUrl: 'https://service.weibo.com/share/share.php',
		supportedTypes: ['photo', 'pose', 'achievement']
	},
	{
		id: 'qq',
		name: 'QQ',
		icon: '🐧',
		shareUrl: 'https://connect.qq.com/widget/shareqq/index.html',
		supportedTypes: ['photo', 'pose']
	},
	{
		id: 'douyin',
		name: '抖音',
		icon: '🎵',
		shareUrl: 'https://www.douyin.com/share',
		supportedTypes: ['photo', 'video']
	},
	{
		id: 'xiaohongshu',
		name: '小红书',
		icon: '📕',
		shareUrl: 'https://www.xiaohongshu.com/share',
		supportedTypes: ['photo', 'pose', 'session']
	},
	{
		id: 'link',
		name: '复制链接',
		icon: '🔗',
		shareUrl: '',
		supportedTypes: ['photo', 'pose', 'session', 'achievement']
	}
];

// Social sharing manager
export class SocialSharingManager {
	private shareLinks: Map<string, ShareLink> = new Map();
	private activeSessions: Map<string, CollaborationSession> = new Map();

	// Generate shareable link for content
	generateShareLink(content: ShareableContent, options?: {
		expiresIn?: number; // milliseconds
		maxAccess?: number;
		password?: string;
		allowDownload?: boolean;
		allowEdit?: boolean;
		allowComment?: boolean;
	}): ShareLink {
		const id = this.generateId();
		const now = Date.now();

		const shareLink: ShareLink = {
			id,
			contentId: `${content.type}_${now}`,
			createdAt: now,
			expiresAt: options?.expiresIn ? now + options.expiresIn : undefined,
			accessCount: 0,
			maxAccess: options?.maxAccess,
			password: options?.password,
			permissions: {
				allowDownload: options?.allowDownload ?? true,
				allowEdit: options?.allowEdit ?? false,
				allowComment: options?.allowComment ?? true
			}
		};

		this.shareLinks.set(id, shareLink);
		this.saveToStorage();

		// Track sharing event
		const analytics = getAnalyticsManager();
		analytics.trackEvent('content_shared', {
			type: content.type,
			platform: 'link',
			hasPassword: !!options?.password
		});

		return shareLink;
	}

	// Get share URL for a platform
	getShareUrl(shareLink: ShareLink, platform: SharePlatform): string {
		const baseUrl = window.location.origin;
		const contentUrl = `${baseUrl}/share/${shareLink.id}`;

		if (platform.id === 'link') {
			return contentUrl;
		}

		// Add platform-specific parameters
		const params = new URLSearchParams({
			url: contentUrl,
			title: 'BoyfriendKamera 姿势分享',
			summary: '看看这个完美的拍照姿势！'
		});

		return `${platform.shareUrl}?${params.toString()}`;
	}

	// Share content to a platform
	async shareToPlatform(content: ShareableContent, platformId: string): Promise<boolean> {
		const platform = SHARE_PLATFORMS.find(p => p.id === platformId);
		if (!platform) {
			throw new Error(`Platform ${platformId} not found`);
		}

		if (!platform.supportedTypes.includes(content.type)) {
			throw new Error(`Platform ${platformId} does not support ${content.type}`);
		}

		// Generate share link
		const shareLink = this.generateShareLink(content);
		const shareUrl = this.getShareUrl(shareLink, platform);

		// Use Web Share API if available
		if (navigator.share && platform.id !== 'link') {
			try {
				await navigator.share({
					title: content.title,
					text: content.description,
					url: shareUrl
				});
				return true;
			} catch (err) {
				// Fallback to copying link
				return this.copyToClipboard(shareUrl);
			}
		}

		// Fallback to copying link
		return this.copyToClipboard(shareUrl);
	}

	// Create collaboration session
	createCollaborationSession(host: Participant, poseTemplate?: any): CollaborationSession {
		const sessionId = this.generateId();
		const now = Date.now();

		const session: CollaborationSession = {
			id: sessionId,
			host: host.id,
			participants: [host],
			poseTemplate,
			startedAt: now,
			status: 'waiting',
			sharedPhotos: []
		};

		this.activeSessions.set(sessionId, session);
		this.saveToStorage();

		// Track collaboration event
		const analytics = getAnalyticsManager();
		analytics.trackEvent('collaboration_started', {
			sessionId,
			hasTemplate: !!poseTemplate
		});

		return session;
	}

	// Join collaboration session
	joinCollaborationSession(sessionId: string, participant: Participant): CollaborationSession | null {
		const session = this.activeSessions.get(sessionId);
		if (!session) {
			return null;
		}

		// Check if session is active
		if (session.status !== 'waiting' && session.status !== 'active') {
			return null;
		}

		// Add participant
		session.participants.push(participant);
		session.status = 'active';
		this.saveToStorage();

		// Track join event
		const analytics = getAnalyticsManager();
		analytics.trackEvent('collaboration_joined', {
			sessionId,
			participantCount: session.participants.length
		});

		return session;
	}

	// Share photo in collaboration session
	sharePhoto(sessionId: string, photoId: string, sharedBy: string): SharedPhoto | null {
		const session = this.activeSessions.get(sessionId);
		if (!session) {
			return null;
		}

		const sharedPhoto: SharedPhoto = {
			id: this.generateId(),
			photoId,
			sharedBy,
			sharedAt: Date.now(),
			comments: [],
			reactions: []
		};

		session.sharedPhotos.push(sharedPhoto);
		this.saveToStorage();

		return sharedPhoto;
	}

	// Add comment to shared photo
	addComment(sessionId: string, photoId: string, comment: Omit<Comment, 'id' | 'createdAt'>): Comment | null {
		const session = this.activeSessions.get(sessionId);
		if (!session) {
			return null;
		}

		const sharedPhoto = session.sharedPhotos.find(p => p.photoId === photoId);
		if (!sharedPhoto) {
			return null;
		}

		const newComment: Comment = {
			id: this.generateId(),
			...comment,
			createdAt: Date.now()
		};

		sharedPhoto.comments.push(newComment);
		this.saveToStorage();

		return newComment;
	}

	// Add reaction to shared photo
	addReaction(sessionId: string, photoId: string, emoji: string, userId: string): Reaction | null {
		const session = this.activeSessions.get(sessionId);
		if (!session) {
			return null;
		}

		const sharedPhoto = session.sharedPhotos.find(p => p.photoId === photoId);
		if (!sharedPhoto) {
			return null;
		}

		// Find existing reaction or create new one
		let reaction = sharedPhoto.reactions.find(r => r.emoji === emoji);
		if (!reaction) {
			reaction = {
				emoji,
				count: 0,
				users: []
			};
			sharedPhoto.reactions.push(reaction);
		}

		// Add user if not already reacted
		if (!reaction.users.includes(userId)) {
			reaction.users.push(userId);
			reaction.count++;
		}

		this.saveToStorage();

		return reaction;
	}

	// End collaboration session
	endCollaborationSession(sessionId: string): CollaborationSession | null {
		const session = this.activeSessions.get(sessionId);
		if (!session) {
			return null;
		}

		session.endedAt = Date.now();
		session.status = 'completed';
		this.saveToStorage();

		// Track session end
		const analytics = getAnalyticsManager();
		analytics.trackEvent('collaboration_ended', {
			sessionId,
			duration: session.endedAt - session.startedAt,
			participantCount: session.participants.length,
			photosShared: session.sharedPhotos.length
		});

		return session;
	}

	// Get active sessions
	getActiveSessions(): CollaborationSession[] {
		return Array.from(this.activeSessions.values()).filter(
			s => s.status === 'waiting' || s.status === 'active'
		);
	}

	// Get session by ID
	getSession(sessionId: string): CollaborationSession | undefined {
		return this.activeSessions.get(sessionId);
	}

	// Get share link by ID
	getShareLink(linkId: string): ShareLink | undefined {
		const link = this.shareLinks.get(linkId);

		// Check if link has expired
		if (link && link.expiresAt && Date.now() > link.expiresAt) {
			this.shareLinks.delete(linkId);
			return undefined;
		}

		return link;
	}

	// Validate share link access
	validateAccess(linkId: string, password?: string): boolean {
		const link = this.getShareLink(linkId);
		if (!link) {
			return false;
		}

		// Check password
		if (link.password && link.password !== password) {
			return false;
		}

		// Check access count
		if (link.maxAccess && link.accessCount >= link.maxAccess) {
			return false;
		}

		// Increment access count
		link.accessCount++;
		this.saveToStorage();

		return true;
	}

	// Generate shareable QR code
	async generateQRCode(shareLink: ShareLink): Promise<string> {
		const url = `${window.location.origin}/share/${shareLink.id}`;

		// Use QR code API
		const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;

		return qrApiUrl;
	}

	// Copy to clipboard helper
	private async copyToClipboard(text: string): Promise<boolean> {
		try {
			await navigator.clipboard.writeText(text);
			return true;
		} catch (err) {
			// Fallback for older browsers
			const textArea = document.createElement('textarea');
			textArea.value = text;
			textArea.style.position = 'fixed';
			textArea.style.opacity = '0';
			document.body.appendChild(textArea);
			textArea.focus();
			textArea.select();
			try {
				document.execCommand('copy');
				document.body.removeChild(textArea);
				return true;
			} catch (err) {
				document.body.removeChild(textArea);
				return false;
			}
		}
	}

	// Generate unique ID
	private generateId(): string {
		return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
	}

	// Save to localStorage
	private saveToStorage(): void {
		if (typeof window === 'undefined') return;

		try {
			const data = {
				shareLinks: Array.from(this.shareLinks.entries()),
				activeSessions: Array.from(this.activeSessions.entries())
			};
			localStorage.setItem('social_sharing_data', JSON.stringify(data));
		} catch (e) {
			console.error('Failed to save sharing data:', e);
		}
	}

	// Load from localStorage
	private loadFromStorage(): void {
		if (typeof window === 'undefined') return;

		try {
			const stored = localStorage.getItem('social_sharing_data');
			if (stored) {
				const data = JSON.parse(stored);
				this.shareLinks = new Map(data.shareLinks || []);
				this.activeSessions = new Map(data.activeSessions || []);
			}
		} catch (e) {
			console.error('Failed to load sharing data:', e);
		}
	}

	// Clear all data
	clearAll(): void {
		this.shareLinks.clear();
		this.activeSessions.clear();
		if (typeof window !== 'undefined') {
			localStorage.removeItem('social_sharing_data');
		}
	}

	constructor() {
		this.loadFromStorage();
	}
}

// Global social sharing manager instance
let globalSocialSharing: SocialSharingManager | null = null;

export function getSocialSharingManager(): SocialSharingManager {
	if (!globalSocialSharing) {
		globalSocialSharing = new SocialSharingManager();
	}
	return globalSocialSharing;
}
