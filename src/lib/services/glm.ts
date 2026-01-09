import type { AISuggestion, PhotoAnalysis, StyleProfile, GuideLine, Pose, PoseKeypoint } from '$lib/types';

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

	private async call(messages: GLMMessage[], imageUrl?: string, retryCount: number = 0): Promise<string> {
		const MAX_RETRIES = 2;
		const RETRY_DELAY = 1000; // 1 second

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

		try {
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

				// Retry on 5xx errors or rate limiting (429)
				if ((response.status >= 500 || response.status === 429) && retryCount < MAX_RETRIES) {
					console.log(`Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
					await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
					return this.call(messages, imageUrl, retryCount + 1);
				}

				throw new Error(`GLM API error: ${response.status} - ${errorText}`);
			}

			const data: GLMResponse = await response.json();

			// Validate response
			if (!data.choices || data.choices.length === 0 || !data.choices[0]?.message?.content) {
				throw new Error('Invalid API response: No content returned');
			}

			return data.choices[0].message.content;
		} catch (error) {
			// Retry on network errors
			if (error instanceof TypeError && retryCount < MAX_RETRIES) {
				console.log(`Network error, retrying... (${retryCount + 1}/${MAX_RETRIES})`);
				await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
				return this.call(messages, imageUrl, retryCount + 1);
			}
			throw error;
		}
	}

	// Real-time guidance analysis
	async analyzeFrame(imageBase64: string, style?: string): Promise<AISuggestion> {
		const styleHint = style ? `\n目标风格：${style}。请特别关注这种风格的构图特点。` : '';
		const prompt = `你是一个专业且友好的拍照助手。${styleHint}

**任务：精确分析当前画面，给出具体的拍照改进建议**

请按照以下标准严格评分（0-100分）：
1. 构图（40分）：人物位置、三分法运用、背景简洁度
2. 光线（30分）：曝光准确性、光线方向、阴影处理
3. 角度（20分）：拍摄角度是否合适、是否变形
4. 比例（10分）：人物在画面中的大小是否合适

**输出要求（严格遵守）：**
1. 必须返回JSON格式
2. 建议必须具体、可操作
3. 总分低于70分时，必须给出改进建议
4. 总分70-85分时，给出1-2个小建议
5. 总分85分以上时，可以表示满意但不要说"完美"

**JSON格式：**
{
  "score": 85,
  "suggestion": "具体的拍照建议（15字以内，必须包含方向性词汇）",
  "grid_position": "目标位置（金色光圈位置，用户应该把人物移动到的九宫格位置）",
  "issues": ["主要问题1", "主要问题2"],
  "confidence": 0.9
}

**grid_position说明（目标位置）：**
这个位置是**金色光圈应该显示的位置**，告诉用户"把人物移到这里"：
- center: 移到画面正中央（对称构图）
- center-top: 移到上方，留出下方空间
- center-bottom: 移到下方，留出上方空间
- left-middle: 移到左侧三分之一处（经典三分法）
- right-middle: 移到右侧三分之一处（经典三分法）
- left-top/right-top: 移到角落（对角线构图）
- left-bottom/right-bottom: 移到角落（低角度构图）

**建议示例（按分数）：**
- 人物太靠右，建议往左移：{"score": 60, "suggestion": "把人物移到左侧光圈里", "grid_position": "left-middle", "issues": ["人物太靠右"], "confidence": 0.95}
- 人物太靠左，建议往右移：{"score": 60, "suggestion": "把人物移到右侧光圈里", "grid_position": "right-middle", "issues": ["人物太靠左"], "confidence": 0.95}
- 人物太小：{"score": 65, "suggestion": "走近点，站到光圈里", "grid_position": "center", "issues": ["人物太小"], "confidence": 0.9}
- 构图不错：{"score": 88, "suggestion": "✨ 位置完美，可以拍了", "grid_position": "center", "issues": [], "confidence": 0.92}

**重要：**
- grid_position是**建议移动到的目标位置**，不是当前位置
- 金色光圈会显示在grid_position位置，引导用户移动人物
- 建议中必须提到"光圈"让用户明白要移到金色圆圈位置
- confidence表示你的判断确信程度（0-1之间）
- 当画面模糊或光线太暗时，降低confidence
- 如果检测不到人脸或主体，confidence设为0.3以下

现在分析这张照片并返回JSON：`;

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

		// Try to parse JSON response with enhanced fields
		let suggestionText = cleanText;
		let gridPosition = 'center'; // Default position
		let confidence = 0.7; // Default confidence
		let score = 60; // Default score
		let guideLines: GuideLine[] = [];

		try {
			// First try to match JSON in the response
			const jsonMatch = cleanText.match(/\{[^}]*"suggestion"[^}]*"grid_position"[^}]*\}/);
			if (jsonMatch) {
				const parsed = JSON.parse(jsonMatch[0]);
				suggestionText = parsed.suggestion || suggestionText;
				gridPosition = parsed.grid_position || 'center';
				confidence = parsed.confidence ?? 0.7;
				score = parsed.score ?? 60;
			} else {
				// Try to parse the entire response as JSON
				const parsed = JSON.parse(cleanText);
				suggestionText = parsed.suggestion || parsed.composition_suggestion || suggestionText;
				gridPosition = parsed.grid_position || 'center';
				confidence = parsed.confidence ?? 0.7;
				score = parsed.score ?? 60;
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

		// Normalize score to 0-1 range
		const normalizedScore = Math.min(1, Math.max(0, score / 100));

		// Determine if photo is good based on score and confidence
		// Only vibrate if score is good (85+) AND confidence is high (0.7+)
		const isGood = score >= 85 && confidence >= 0.7;

		// Add confidence indicator to suggestion if low
		if (confidence < 0.5 && suggestionText && !suggestionText.includes('(分析不确定)')) {
			suggestionText += ' (分析不确定)';
		}

		return {
			composition_suggestion: suggestionText || '准备拍照中...',
			lighting_assessment: '',
			angle_suggestion: '',
			overall_score: normalizedScore,
			should_vibrate: isGood,
			guide_lines: guideLines
		};
	}

	// AI Pose Coach - Analyze frame and return pose guidance
	async analyzePose(imageBase64: string, style?: string): Promise<AISuggestion> {
		const styleHint = style ? `\n目标风格：${style}。根据这种风格的特点调整姿势建议。` : '';
		const prompt = `你是一个世界级的专业拍照姿势教练和摄影指导。${styleHint}

**任务：精确分析当前画面，生成完美的目标姿势骨架**

请仔细分析画面中的每一个人，然后：
1. 精确识别当前人物的所有身体部位位置
2. 基于专业摄影美学原则，生成完美的目标姿势
3. 提供具体、可操作的调整指导

**评分标准（总分100）：**
1. 姿态自然度（30分）：动作是否自然、不僵硬
2. 构图美学（30分）：是否符合三分法、对角线、三角形等美学原则
3. 表情状态（20分）：表情是否生动、自然
4. 整体协调性（20分）：身体各部位是否协调统一

**JSON格式返回（必须严格遵循）：**
{
  "score": 88,
  "suggestion": "具体建议（15字内，提到身体部位）",
  "current_pose_analysis": {
    "detected": true,
    "people_count": 1,
    "body_visibility": "full",
    "posture_quality": "fair"
  },
  "target_pose": {
    "nose": {"x": 0.5, "y": 0.22, "visibility": 1.0},
    "left_shoulder": {"x": 0.42, "y": 0.4, "visibility": 1.0},
    "right_shoulder": {"x": 0.58, "y": 0.4, "visibility": 1.0},
    "left_elbow": {"x": 0.35, "y": 0.52, "visibility": 0.95},
    "right_elbow": {"x": 0.65, "y": 0.52, "visibility": 0.95},
    "left_wrist": {"x": 0.28, "y": 0.35, "visibility": 0.9},
    "right_wrist": {"x": 0.72, y": 0.62, "visibility": 0.9},
    "left_hip": {"x": 0.43, "y": 0.68, "visibility": 0.98},
    "right_hip": {"x": 0.57, "y": 0.68, "visibility": 0.98},
    "left_knee": {"x": 0.44, "y": 0.82, "visibility": 0.85},
    "right_knee": {"x": 0.56, "y": 0.82, "visibility": 0.85}
  },
  "adjustments": [
    {"body_part": "左手", "action": "抬高5厘米", "reason": "形成更好的构图线"},
    {"body_part": "头部", "action": "向右倾斜15度", "reason": "展现更优美的面部轮廓"},
    {"body_part": "肩膀", "action": "放松下沉", "reason": "姿态更自然"}
  ],
  "confidence": 0.92
}

**坐标系统说明（极重要）：**
- x: 0.0（画面最左）到 1.0（画面最右）
- y: 0.0（画面最上）到 1.0（画面最下）
- 所有坐标必须是0-1之间的精确值，保留2-3位小数
- visibility: 0.0（完全不可见）到 1.0（完全确定可见）

**专业姿势知识库：**

1. **头部位置**（nose, left_eye, right_eye, left_ear, right_ear）：
   - 自然视角：nose在 y=0.2-0.3 之间
   - 略微倾斜：x偏移0.05-0.1
   - 抬头/低头：上下浮动0.05

2. **肩膀线条**（left_shoulder, right_shoulder）：
   - 平行画面：y值相同
   - 自然放松：y在0.38-0.42之间
   - 宽度：左右间距0.16-0.2（x坐标）

3. **手臂姿态**（elbow, wrist）：
   - 自然下垂：elbow在shoulder下方0.1-0.15
   - 举起姿势：elbow在shoulder水平或稍高
   - 优雅手势：手腕靠近头部或脸颊

4. **躯干核心**（hip）：
   - 腰线位置：y在0.65-0.72之间
   - 宽度：左右间距0.12-0.16
   - 重心稳定：确保身体平衡

5. **下半身**（knee, ankle）：
   - 全身照：knee在y=0.8-0.85
   - 腿部间距：与髋部对齐或稍窄

**美学构图原则：**
- 三分法：主体在横向或纵向三分之一处
- 对角线：身体或手臂形成对角线
- 三角形：手臂和身体形成稳定三角形
- 黄金螺旋：身体姿态符合黄金比例
- 留白原则：画面不要填满，留出呼吸空间

**常见最佳姿势模板：**

1. **自然优雅**（推荐新手）：
   - 双肩放松下沉
   - 一只手轻触头发或脸颊
   - 头部微微倾斜5-10度
   - 身体侧转15-20度

2. **活力青春**：
   - 双臂向上举起呈V字
   - 肩膀打开，展现自信
   - 头部抬起，眼神向上
   - 膝盖微弯，充满动感

3. **文艺气质**：
   - 身体侧转45度
   - 一手叉腰，一手自然下垂
   - 头部略低，眼神向下
   - 整体形成优雅曲线

4. **亲密情侣**：
   - 两人靠近，肩膀相触
   - 头部向内倾斜
   - 前面人手放在后面人肩上
   - 形成稳定的三角形构图

**输出要求：**
1. 必须返回完整的目标姿势骨架（至少包含9个关键点）
2. 坐标必须精确到小数点后2-3位
3. visibility值必须根据实际可见度设置
4. 调整建议必须包含具体的身体部位和动作
5. 如果检测不到人物，score设为0，target_pose为空对象
6. confidence必须反映你的判断确信程度（0-1之间）

现在开始专业分析并返回JSON：`;

		const response = await this.call([{ role: 'user', content: prompt }], imageBase64);

		// Clean up the response
		let cleanText = response.trim()
			.replace(/^["`]|["`]$/g, '')
			.replace(/```json\n?|\n?```/g, '')
			.replace(/\n+/g, ' ')
			.trim();

		// Try to parse enhanced JSON response
		let suggestionText = 'AI正在分析姿势...';
		let confidence = 0.7;
		let score = 60;
		let targetPose: any = {};
		let instructions: string[] = [];
		let poseGuide: any = null;

		try {
			const parsed = JSON.parse(cleanText);
			suggestionText = parsed.suggestion || suggestionText;
			confidence = parsed.confidence ?? 0.7;
			score = parsed.score ?? 60;
			targetPose = parsed.target_pose || {};

			// Enhanced instruction parsing from adjustments array
			if (parsed.adjustments && Array.isArray(parsed.adjustments)) {
				instructions = parsed.adjustments.map((adj: any) => {
					if (typeof adj === 'string') return adj;
					return `${adj.body_part}${adj.action}（${adj.reason}）`;
				});
			} else if (parsed.instructions) {
				instructions = parsed.instructions;
			}

			// Validate pose coordinates
			targetPose = this.validatePoseCoordinates(targetPose);

			// Create enhanced pose guide object
			if (Object.keys(targetPose).length > 0) {
				poseGuide = {
					target_pose: targetPose,
					current_pose: parsed.current_pose_analysis,
					instructions: instructions,
					confidence: confidence
				};
			}
		} catch {
			// If parsing fails, return basic suggestion
			console.error('Failed to parse pose JSON:', cleanText);
			suggestionText = cleanText || '姿势分析中...';
		}

		const normalizedScore = Math.min(1, Math.max(0, score / 100));
		const isGood = score >= 85 && confidence >= 0.7;

		return {
			composition_suggestion: suggestionText,
			lighting_assessment: '',
			angle_suggestion: '',
			overall_score: normalizedScore,
			should_vibrate: isGood,
			pose_guide: poseGuide,
			voice_instruction: instructions.join('，')
		};
	}

	// Validate and normalize pose coordinates
	private validatePoseCoordinates(pose: any): any {
		const validated: any = {};

		for (const [key, value] of Object.entries(pose)) {
			if (value && typeof value === 'object') {
				const x = (value as any).x;
				const y = (value as any).y;
				const visibility = (value as any).visibility;

				// Validate and clamp coordinates to [0, 1] range
				if (typeof x === 'number' && typeof y === 'number') {
					validated[key] = {
						x: Math.max(0, Math.min(1, x)),
						y: Math.max(0, Math.min(1, y)),
						visibility: typeof visibility === 'number' ? Math.max(0, Math.min(1, visibility)) : 0.8
					};
				}
			}
		}

		return validated;
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
