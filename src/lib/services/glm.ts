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
		const prompt = `你是一个专业且友好的拍照助手。${styleHint}

**任务：分析当前画面，给出具体的拍照改进建议**

评价标准（严格但有礼貌）：
1. 构图：人物是否居中、位置是否合适、背景是否干净
2. 光线：是否过曝/欠曝、有没有逆光、光线方向
3. 角度：角度是否太平、太高或太低
4. 比例：人物在画面中大小是否合适

**重要原则：**
- 总能找到可以改进的地方（具体、可操作）
- 不要敷衍地说"很好"，除非构图真的完美
- 建议要具体："往左移一步" 比 "调整位置" 更好
- 15字以内
- **必须同时返回九宫格位置建议！**

示例：
- "往左移一步，现在太靠右" + 位置 "right-middle"
- "往下蹲一点，角度会更好" + 位置 "center"
- "光线太暗，找个亮点的位置" + 位置 "center"
- "退后一步，人太小了" + 位置 "center"
- "稍微抬头，避免双下巴" + 位置 "center-top"
- "背景太乱，换个方向拍" + 位置 "left-middle"
- "现在逆光了，转到侧面" + 位置 "right-bottom"
- "手机拿高一点，俯拍更瘦" + 位置 "center-bottom"
- "✨ 这个角度完美，拍吧" + 位置 "center"（只在真的很好时）

**必须以JSON格式返回：**
{
  "suggestion": "具体的拍照建议（15字以内）",
  "grid_position": "九宫格位置，用以下值之一：center-top, center, center-bottom, left-top, left-middle, left-bottom, right-top, right-middle, right-bottom"
}

九宫格位置说明：
- center: 正中心
- center-top: 上方中间
- center-bottom: 下方中间
- left-top: 左上角
- left-middle: 左侧中间
- left-bottom: 左下角
- right-top: 右上角
- right-middle: 右侧中间
- right-bottom: 右下角

**用户需要的是具体指导，不是敷衍的鼓励！给出有价值的建议！**`;

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

		// Try to parse JSON response
		let suggestionText = cleanText;
		let gridPosition = 'center'; // Default position
		let guideLines: { type: string; x?: number; y?: number }[] = [];

		try {
			// First try to match JSON in the response
			const jsonMatch = cleanText.match(/\{[^}]*"suggestion"[^}]*"grid_position"[^}]*\}/);
			if (jsonMatch) {
				const parsed = JSON.parse(jsonMatch[0]);
				suggestionText = parsed.suggestion || suggestionText;
				gridPosition = parsed.grid_position || 'center';
			} else {
				// Try to parse the entire response as JSON
				const parsed = JSON.parse(cleanText);
				suggestionText = parsed.suggestion || parsed.composition_suggestion || suggestionText;
				gridPosition = parsed.grid_position || 'center';
			}
		} catch {
			// If JSON parsing fails, use the text as is
			// Check if response contains old format JSON and extract value if so
			const oldJsonMatch = cleanText.match(/"composition_suggestion"\\s*:\\s*"([^"]+)"/);
			if (oldJsonMatch) {
				suggestionText = oldJsonMatch[1];
			}
		}

		// Convert grid position to guide lines
		// Grid is 3x3, so positions are at: 0.167, 0.5, 0.833 for rows and cols
		const positionMap: Record<string, { x: number; y: number }> = {
			'center': { x: 0.5, y: 0.5 },
			'center-top': { x: 0.5, y: 0.167 },
			'center-bottom': { x: 0.5, y: 0.833 },
			'left-top': { x: 0.167, y: 0.167 },
			'left-middle': { x: 0.167, y: 0.5 },
			'left-bottom': { x: 0.167, y: 0.833 },
			'right-top': { x: 0.833, y: 0.167 },
			'right-middle': { x: 0.833, y: 0.5 },
			'right-bottom': { x: 0.833, y: 0.833 }
		};

		const pos = positionMap[gridPosition] || positionMap['center'];
		guideLines = [{
			type: 'standing_position',
			x: pos.x,
			y: pos.y
		}];

		// Determine if photo is good based on response
		// More lenient: just having ✨ or positive words is enough
		const isGood = suggestionText.includes('✨') || suggestionText.includes('很好') || suggestionText.includes('不错') || suggestionText.includes('可以了') || suggestionText.includes('拍吧');

		return {
			composition_suggestion: suggestionText || '准备拍照中...',
			lighting_assessment: '',
			angle_suggestion: '',
			overall_score: isGood ? 0.85 : 0.6,
			should_vibrate: isGood,
			guide_lines: guideLines
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
