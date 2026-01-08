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
	private model: 'glm-4v' | 'glm-4.6v' | 'glm-4.6v-flash' | 'glm-4.5v';

	constructor(apiKey: string, model: 'glm-4v' | 'glm-4.6v' | 'glm-4.6v-flash' | 'glm-4.5v' = 'glm-4.6v-flash') {
		this.apiKey = apiKey;
		this.model = model;
	}

	setModel(model: 'glm-4v' | 'glm-4.6v' | 'glm-4.6v-flash' | 'glm-4.5v') {
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
		const styleHint = style ? `\n用户选择的风格：${style}` : '';
		const prompt = `你是一个专业的拍照指导助手。分析当前取景画面，给出拍照建议。${styleHint}

请以 JSON 格式返回：
{
  "composition_suggestion": "构图建议，如：让她稍微往左移动",
  "lighting_assessment": "光线评估，如：光线充足，正面光",
  "angle_suggestion": "角度建议，如：蹲下来拍会更显腿长",
  "overall_score": 0.8,
  "should_vibrate": true,
  "guide_lines": [
    {"type": "rule_of_thirds", "position": "overlay"},
    {"type": "standing_position", "x": 0.3, "y": 0.5}
  ]
}`;

		const response = await this.call([{ role: 'user', content: prompt }], imageBase64);

		try {
			return JSON.parse(response);
		} catch {
			// Fallback if response is not valid JSON
			return {
				composition_suggestion: response,
				lighting_assessment: '无法评估',
				angle_suggestion: '',
				overall_score: 0.5,
				should_vibrate: false
			};
		}
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

export function getGLMService(apiKey: string, model: 'glm-4v' | 'glm-4v-flash' = 'glm-4v-flash'): GLMService {
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
