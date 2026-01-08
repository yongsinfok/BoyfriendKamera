import type { AISuggestion, PhotoAnalysis, StyleProfile } from '$lib/types';

const GLM_API_BASE = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

export interface GLMMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

export interface GLMResponse {
	choices: Array<{
		message: {
			content: string;
		};
	}>;
}

export class GLMService {
	private apiKey: string;
	private model: 'glm-4v' | 'glm-4.6v' | 'glm-4.6v-flash' | 'glm-4.6v-flashx' | 'glm-4.5v';

	constructor(apiKey: string, model: 'glm-4v' | 'glm-4.6v' | 'glm-4.6v-flash' | 'glm-4.6v-flashx' | 'glm-4.5v' = 'glm-4.6v-flash') {
		this.apiKey = apiKey;
		this.model = model;
	}

	setModel(model: 'glm-4v' | 'glm-4.6v' | 'glm-4.6v-flash' | 'glm-4.6v-flashx' | 'glm-4.5v') {
		this.model = model;
	}

	setApiKey(apiKey: string) {
		this.apiKey = apiKey;
	}

	private async call(messages: GLMMessage[], imageUrl?: string): Promise<string> {
		// Ensure imageUrl has the data URL prefix if it's just base64
		let formattedImageUrl = imageUrl;
		if (imageUrl && !imageUrl.startsWith('data:')) {
			formattedImageUrl = `data:image/jpeg;base64,${imageUrl}`;
		}

		const requestBody = {
			model: this.model,
			messages: formattedImageUrl
				? [
						{ role: 'user', content: [{ type: 'image_url', image_url: { url: formattedImageUrl } }, { type: 'text', text: messages[0].content }] }
				  ]
				: messages,
			temperature: 0.7,
			max_tokens: 1024
		};

		const response = await fetch(GLM_API_BASE, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${this.apiKey}`
			},
			body: JSON.stringify(requestBody)
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error('GLM API Error:', response.status, errorText);
			throw new Error(`GLM API error: ${response.status} - ${errorText}`);
		}

		const data: GLMResponse = await response.json();
		return data.choices[0]?.message?.content || '';
	}

	// Real-time guidance analysis
	async analyzeFrame(imageBase64: string, style?: string): Promise<AISuggestion> {
		const styleHint = style ? `\n目标风格：${style}。` : '';
		const prompt = `你是一个超级友好的拍照助手，给拍照建议时要宽松和鼓励！${styleHint}

**重要标准：大部分情况都可以说"✨ 很好"！**
只有明显的问题才需要调整（比如光线太暗、人太小、完全背光）。

格式要求：
- 15字以内
- 不要用JSON格式

示例（多用鼓励）：
- "✨ 很好，就这样拍"
- "✨ 这个角度不错"
- "✨ 光线很好，拍吧"
- "✨ 构图可以了"
- "光线暗一点，可以拍"
- "人稍微大一点更好"
- "往后退半步就好"
- "稍微往左一点"

**记住：用户想要的是信心！不要一直挑毛病！如果画面没什么大问题，就鼓励用户拍照！**`;

		const response = await this.call([{ role: 'user', content: prompt }], imageBase64);

		// Clean up the response
		let cleanText = response.trim()
			.replace(/^["`]|["`]$/g, '') // Remove quotes and backticks
			.replace(/```json\n?|\n?```/g, '') // Remove code blocks
			.replace(/\n+/g, ' ') // Replace newlines with space
			.trim();

		// Remove common prefixes if AI still uses them
		cleanText = cleanText
			.replace(/^(建议|拍照建议|构图建议|AI建议)[:：]\s*/i, '')
			.replace(/^(composition_suggestion|suggestion|text)[:：]\s*/i, '')
			.trim();

		// Check if response contains JSON and extract value if so
		const jsonMatch = cleanText.match(/"composition_suggestion"\s*:\s*"([^"]+)"/);
		if (jsonMatch) {
			cleanText = jsonMatch[1];
		}

		// Determine if photo is good based on response
		// More lenient: just having ✨ or positive words is enough
		const isGood = cleanText.includes('✨') || cleanText.includes('很好') || cleanText.includes('不错') || cleanText.includes('可以了') || cleanText.includes('拍吧');

		return {
			composition_suggestion: cleanText || '准备拍照中...',
			lighting_assessment: '',
			angle_suggestion: '',
			overall_score: isGood ? 0.85 : 0.6,
			should_vibrate: isGood
		};
	}

	// Photo selection analysis
	async selectPhotos(photoData: Array<{ id: string; base64: string }>): Promise<{ selected: Array<{ photo_id: string; score: number; reasons: string[] }>; summary: string }> {
		const photoList = photoData.map((p, i) => `照片${i + 1}: [ID: ${p.id}]`).join('\n');
		const prompt = `你是一个专业摄影师。请从以下 ${photoData.length} 张照片中选出最佳的 1-3 张。

照片列表：
${photoList}

请分析每张照片的构图、光线、表情、角度等，选出最佳照片。

请以 JSON 格式返回：
{
  "selected": [
    {
      "photo_id": "照片ID（如 1, 2, 3）",
      "score": 0.9,
      "reasons": ["构图遵循三分法", "表情自然", "光线柔和"]
    }
  ],
  "summary": "这批照片中，第1张和第3张最佳..."
}`;

		const response = await this.call([{ role: 'user', content: prompt }]);

		try {
			return JSON.parse(response);
		} catch {
			return {
				selected: [],
				summary: response
			};
		}
	}

	// Style learning from uploaded photos
	async learnStyle(imageBase64: string): Promise<StyleProfile> {
		const prompt = `你是一个照片风格分析专家。请分析用户上传的满意照片，提取其风格特征。

请以 JSON 格式返回：
{
  "composition": ["center", "eye_level"],
  "preferred_angles": ["front", "slight_side"],
  "tone": "warm",
  "lighting": "soft",
  "background": "clean",
  "mood": "happy",
  "tags": ["portrait", "smile", "outdoor"]
}`;

		const response = await this.call([{ role: 'user', content: prompt }], imageBase64);

		try {
			return JSON.parse(response);
		} catch {
			return {
				composition: [],
				preferred_angles: [],
				tone: 'neutral',
				lighting: 'natural',
				background: 'unknown',
				mood: 'neutral',
				tags: []
			};
		}
	}

	// Analyze a single photo
	async analyzePhoto(imageBase64: string): Promise<PhotoAnalysis> {
		const prompt = `请分析这张照片的质量，包括构图、光线、表情等方面。

请以 JSON 格式返回：
{
  "score": 0.85,
  "reasons": ["构图好", "光线佳"],
  "tags": ["portrait", "smile"],
  "composition": "center",
  "lighting": "soft",
  "angle": "eye_level"
}`;

		const response = await this.call([{ role: 'user', content: prompt }], imageBase64);

		try {
			return JSON.parse(response);
		} catch {
			return {
				score: 0.5,
				reasons: [],
				tags: []
			};
		}
	}
}

// Singleton instance
let glmService: GLMService | null = null;

export function getGLMService(apiKey: string, model: 'glm-4v' | 'glm-4.6v' | 'glm-4.6v-flash' | 'glm-4.6v-flashx' | 'glm-4.5v' = 'glm-4.6v-flash'): GLMService {
	if (!glmService || glmService['apiKey'] !== apiKey) {
		glmService = new GLMService(apiKey, model);
	}
	return glmService;
}

// Helper to convert canvas/blob to base64
export async function imageToBase64(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const result = reader.result as string;
			// Remove data URL prefix to get just the base64
			const base64 = result.split(',')[1];
			resolve(base64);
		};
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	});
}

// Helper to capture frame from video
export function captureFrame(video: HTMLVideoElement, quality: number = 0.7): string {
	const canvas = document.createElement('canvas');
	canvas.width = video.videoWidth;
	canvas.height = video.videoHeight;

	const ctx = canvas.getContext('2d');
	if (!ctx) return '';

	// Use lower resolution for faster processing
	const scale = 0.5;
	canvas.width = video.videoWidth * scale;
	canvas.height = video.videoHeight * scale;

	ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
	return canvas.toDataURL('image/jpeg', quality);
}
