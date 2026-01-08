# 男友相机 (Boyfriend Camera) - 产品需求文档

**版本**: 1.0
**创建日期**: 2025-01-08
**文档类型**: PRD (产品需求文档)

---

## 1. 项目概述

**男友相机 (Boyfriend Camera)** 是一款 PWA Web 应用，帮助用户为女友拍出更好看的照片。

### 1.1 背景

很多男性用户不擅长帮女朋友/伴侣拍照，导致：
- 旅游时拍的照片女朋友不满意
- 不知道怎么构图、找角度
- 不理解女朋友喜欢的照片风格

### 1.2 解决方案

通过 AI 实时分析拍摄场景，给出构图、光线、角度建议，并在拍摄后智能筛选最佳照片。

### 1.3 产品形态

- **平台**：PWA (Progressive Web App)
- **支持系统**：iOS Safari、Android Chrome
- **AI 模型**：GLM-4V / GLM-4V-Flash
- **后端**：Supabase

### 1.4 核心价值

| 价值点 | 说明 |
|--------|------|
| 实时指导 | 拍照时 AI 告诉你怎么调整 |
| 智能选片 | 拍完自动挑出最好看的 |
| 风格学习 | 学会女朋友的审美偏好 |

---

## 2. 用户画像与场景

### 2.1 目标用户

**主要用户**：想帮女朋友/伴侣拍出好照片的男性用户

- 年龄：20-35 岁
- 场景：旅游、户外约会、日常打卡
- 痛点：不会拍照、不懂审美、怕女朋友不满意

**次要用户**：任何需要拍照指导的人

### 2.2 使用场景

**场景 1：旅游拍照**
> 和女朋友去旅游，到了景点想给她拍几张好看的照片发朋友圈。打开 APP，选择她喜欢的风格（如日系），AI 实时告诉你让她站哪里、用什么角度拍。拍了十几张后，AI 自动挑出最好的 3 张。

**场景 2：日常记录**
> 周末去户外约会，阳光不错但不知道怎么利用。APP 提示你"当前光线充足，建议让她侧身站立，你会拍到更好的轮廓"。

**场景 3：风格学习**
> 女朋友给你看她觉得好看的照片，你上传到 APP，AI 分析出她喜欢什么样的构图、角度、色调。以后拍照 AI 就按这个风格指导你。

---

## 3. 痛点分析

### 3.1 用户痛点

| 痛点 | 表现 | 影响 |
|------|------|------|
| **不会构图** | 不知道把人放哪里、用什么角度 | 拍出的照片平平无奇 |
| **光线把控差** | 要么太暗要么太亮，不会利用自然光 | 照片质量不稳定 |
| **审美差异** | 不知道她喜欢什么风格 | 拍了她觉得不好看 |
| **缺乏反馈** | 不知道问题在哪，每次都犯同样的错 | 无法进步 |

### 3.2 现有方案的不足

| 方案 | 不足 |
|------|------|
| 自己摸索 | 效率低，试错成本高 |
| 网上教程 | 理论多，实际拍摄时想不起来 |
| 问女朋友 | 可能伤感情，她也不一定能说清楚 |
| 修图软件 | 只能后期补救，治标不治本 |

### 3.3 男友相机如何解决

| 痛点 | 解决方案 |
|------|----------|
| 不会构图 | AI 实时显示辅助线和建议站位 |
| 光线把控差 | AI 分析当前光线并给出改进建议 |
| 审美差异 | 上传她喜欢的照片学习，AI 按她的审美指导 |
| 缺乏反馈 | 每次拍完 AI 告诉你哪里好、为什么选这张 |

---

## 4. 功能需求

### 4.1 启动与首页

- **快速启动**：打开 APP 后直接进入相机界面，无需额外点击
- **风格选择器**：顶部显示当前选中的风格，点击可切换或跳过
- **首次引导**：首次启动展示功能介绍和 API Key 设置引导

### 4.2 风格系统

#### 4.2.1 预设风格库
- 内置多种流行风格模板：小红书风、日系、胶片、Ins 风、极简等
- 每种风格包含：构图偏好、色调倾向、取景角度建议
- 用户可选任意一种作为拍摄指导基准

#### 4.2.2 自定义风格学习
- 用户可上传女友满意的历史照片
- AI 分析照片特征：构图类型、人物位置、背景选择、色调、表情角度等
- 建立个性化风格画像，后续拍摄按此画像指导

#### 4.2.3 风格切换
- 拍照过程中随时可切换风格
- 切换后 AI 指导立即更新

### 4.3 实时相机界面

- **全屏取景器**：最大化视野，减少干扰
- **构图辅助线**：
  - 三分线叠加
  - AI 生成的引导线
  - 建议站位位置标记
- **实时 AI 文字提示**：底部显示当前建议（如"让她往左移一步"、"蹲下来拍会更显腿长"）
- **快门按钮**：大圆形按钮，支持点击和长按连拍
- **风格切换入口**：右上角快速切换
- **连拍计数器**：显示当前会话已拍摄数量

### 4.4 AI 实时指导

#### 4.4.1 构图建议
- 分析当前画面构图
- 给出角度调整建议
- 建议人物站位
- 背景选择建议

#### 4.4.2 光线分析
- 评估当前光线条件（过曝/欠曝/合适）
- 给出光线改进建议
- 提示最佳拍摄时机

#### 4.4.3 震动反馈
- 当前构图/光线状态良好时震动提示
- 不打扰，轻量反馈

#### 4.4.4 风格化建议
- 基于选中风格给出个性化建议
- 自定义风格学习后持续优化建议内容

### 4.5 拍摄操作

- **单张拍摄**：点击快门拍摄一张
- **连拍模式**：长按快门连续拍摄
- **拍摄预览**：显示已拍摄照片缩略图
- **结束拍摄**：点击"完成"结束当前会话

### 4.6 智能选片

- 拍摄结束后自动分析本次会话所有照片
- AI 筛选出最佳 1-3 张
- 展示选中结果，每张附"好看的理由"
- 用户确认后保存到本地相册
- 未选中照片在 APP 内保留（用于学习）

### 4.7 用户反馈系统

- **历史记录查看**：浏览所有历史拍摄会话
- **点赞/踩**：对 AI 选片结果进行反馈
- **手动调整**：若用户认为另一张更好，可手动替换
- **反馈数据**：用于风格学习模型持续优化

### 4.8 会话管理

- 每次拍摄会话独立保存
- 会话包含：时间戳、使用风格、所有照片、AI 选择、用户反馈
- 会话历史浏览界面
- 可删除历史会话

### 4.9 照片管理

- 仅保存 AI 选中的照片到系统相册
- 未选中照片在 APP 内保留（用于风格学习）
- 可手动删除未选中照片
- 支持批量清理

### 4.10 模型选择

- 支持 GLM-4.6V（高质量分析，速度较慢）
- 支持 GLM-4.6V-Flash（快速响应，适合实时指导）
- 用户可在设置中选择默认模型
- 实时指导优先使用 Flash 模型

### 4.11 设置

- API Key 配置
- 默认风格设置
- 默认模型选择
- 震动反馈开关
- 辅助线显示开关
- 数据清理选项

### 4.12 离线与网络

- 网络状态检测
- 网络不可用时提示用户
- 已缓存照片和会话可离线查看

---

## 5. 非功能需求

### 5.1 性能

| 指标 | 目标 |
|------|------|
| 实时 AI 指导响应 | < 2 秒 |
| 单张选片分析 | < 5 秒 |
| 10 张以内选片 | < 30 秒 |
| APP 启动时间 | < 2 秒 |
| 连拍容量 | 支持 20 张以上不卡顿 |

### 5.2 并发与异步

- 拍摄与分析可异步进行，不阻塞拍摄流程
- 多张照片可并行分析（受 API 限流约束）

### 5.3 隐私与安全

- **API Key 自备**：用户使用自己的 GLM API Key，数据走用户账户
- **数据隔离**：每个用户数据完全隔离，不跨用户共享
- **加密存储**：Supabase 存储的照片和风格画像加密
- **数据删除**：支持一键删除所有历史数据
- **透明度**：首次启动明确告知数据使用方式

### 5.4 平台兼容性

- **iOS**：Safari 14+，支持添加到主屏幕
- **Android**：Chrome 90+，支持 PWA 安装
- **响应式**：适配各种屏幕尺寸
- **PWA 标准**：满足 Web App Manifest 和 Service Worker 要求

### 5.5 电池优化

- 实时分析采用降帧策略（每 2 秒采样一次）
- APP 进入后台时停止 AI 分析
- 震动反馈使用轻量短震动模式
- 相机取景器降低渲染帧率以节能

### 5.6 可用性

- 无网络时清晰提示用户
- 所有异步操作显示加载状态
- 错误信息友好，提供解决建议
- 首次使用提供引导教程

### 5.7 可维护性

- 代码模块化，职责清晰
- AI 模型配置化，方便切换和扩展
- 完整的开发文档和注释
- 统一的错误处理和日志记录

### 5.8 可扩展性

- 支持添加新的预设风格模板
- 支持接入其他视觉模型（架构上预留接口）
- 风格画像数据结构可扩展

### 5.9 数据持久化

- 本地使用 IndexedDB 缓存照片和会话
- Supabase 作为云备份和风格画像存储
- 离线优先策略，有网时自动同步

---

## 6. 技术架构

### 6.1 技术栈选型

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| 前端框架 | SvelteKit | 轻量高性能，PWA 支持优秀 |
| UI 组件库 | Skeleton UI | Svelte 生态的 Tailwind 组件库 |
| 样式方案 | TailwindCSS | 实用优先的 CSS 框架 |
| 状态管理 | Svelte Stores | 原生响应式状态管理 |
| 相机访问 | Web Camera API | 浏览器原生相机 API |
| 本地存储 | IndexedDB (Dexie.js) | 离线存储照片和会话数据 |
| 后端/BaaS | Supabase | 云存储、用户认证、实时数据库 |
| AI 服务 | GLM-4V / GLM-4V-Flash | 智谱 AI 视觉模型 |
| PWA | Vite PWA Plugin | 自动生成 manifest 和 service worker |

### 6.2 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        PWA 客户端                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ 相机页面 │  │ 历史记录 │  │ 风格管理 │  │    设置页面       │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘  │
│         │              │              │              │            │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    Svelte Stores (状态)                      │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         │                        │                    │
         ▼                        ▼                    ▼
┌──────────────┐        ┌──────────────┐      ┌──────────────┐
│  IndexedDB   │        │  GLM API     │      │  Supabase    │
│  (本地缓存)   │        │  (AI 分析)    │      │  (云存储)     │
│  - 照片      │        │  - 实时指导   │      │  - 风格画像   │
│  - 会话      │        │  - 选片分析   │      │  - 用户配置   │
└──────────────┘        └──────────────┘      └──────────────┘
```

### 6.3 核心模块设计

#### 6.3.1 相机模块 (Camera Module)
- 管理 Web Camera API 生命周期
- 实时视频流捕获
- 拍照和连拍功能
- 辅助线绘制层

#### 6.3.2 AI 分析模块 (AI Analysis Module)
- GLM API 调用封装
- 实时指导分析（使用 Flash 模型）
- 选片分析（使用完整模型）
- 请求节流和错误重试

#### 6.3.3 风格模块 (Style Module)
- 预设风格管理
- 自定义风格学习
- 风格画像生成与更新
- 风格切换逻辑

#### 6.3.4 存储模块 (Storage Module)
- IndexedDB 操作封装
- Supabase 客户端封装
- 离线同步逻辑
- 数据加密/解密

#### 6.3.5 PWA 模块 (PWA Module)
- Service Worker 管理
- 离线提示
- 安装引导
- 更新检测

### 6.4 数据流

#### 实时指导流程
```
用户调整角度 → 相机捕获帧 → 节流(2秒) → GLM Flash API
→ 解析建议 → 更新 UI + 震动反馈
```

#### 拍照选片流程
```
用户拍照 → 保存到 IndexedDB → 用户完成拍摄
→ 并行调用 GLM API 分析所有照片
→ 聚合结果 → 展示最佳 1-3 张 → 用户确认 → 保存到相册
```

#### 风格学习流程
```
用户上传照片 → GLM API 分析特征 → 保存风格画像到 Supabase
→ 后续拍摄加载风格画像 → AI 指导个性化
```

---

## 7. 数据模型

### 7.1 Supabase 表结构

#### users (用户表)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  anonymous_id TEXT UNIQUE NOT NULL,  -- 本地生成的匿名 ID
  api_key_encrypted TEXT,             -- 加密后的 GLM API Key
  default_model TEXT DEFAULT 'glm-4v-flash',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### preset_styles (预设风格表)
```sql
CREATE TABLE preset_styles (
  id TEXT PRIMARY KEY,                 -- 风格 ID: xiaohongshu, japanese, film, etc.
  name TEXT NOT NULL,                  -- 风格名称
  description TEXT,                    -- 风格描述
  config JSONB NOT NULL,               -- 风格配置参数
  -- config 示例: { composition: "rule_of_thirds", tone: "warm", angle: "eye_level" }
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### custom_styles (自定义风格画像表)
```sql
CREATE TABLE custom_styles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  name TEXT NOT NULL,                  -- 用户给风格起的名字
  profile JSONB NOT NULL,              -- AI 学习到的风格画像
  -- profile 示例: { composition: ["center", "side"], preferred_angles: ["low"], tone: "bright" }
  sample_count INTEGER DEFAULT 0,      -- 学习样本数量
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### sessions (拍摄会话表)
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  style_id TEXT,                       -- 使用的风格 ID (可为空，表示未选风格)
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  photo_count INTEGER DEFAULT 0,
  ai_selection JSONB,                  -- AI 选中的照片 IDs
  user_feedback JSONB,                 -- 用户反馈调整
  synced_at TIMESTAMPTZ
);
```

#### photos (照片元数据表)
```sql
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id),
  storage_path TEXT,                   -- Supabase Storage 路径
  analysis JSONB,                      -- AI 分析结果
  -- analysis 示例: { score: 0.85, reasons: ["构图好", "光线佳"], tags: ["portrait", "smile"] }
  is_ai_selected BOOLEAN DEFAULT false,
  is_user_selected BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### feedback (用户反馈表)
```sql
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_id UUID REFERENCES photos(id),
  feedback_type TEXT,                  -- 'upvote' | 'downvote' | 'manual_replace'
  replacement_photo_id UUID REFERENCES photos(id),  -- 如果用户手动替换
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### style_samples (风格学习样本表)
```sql
CREATE TABLE style_samples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  custom_style_id UUID REFERENCES custom_styles(id),
  storage_path TEXT,                   -- 样本照片路径
  analysis JSONB,                      -- AI 提取的特征
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.2 IndexedDB 结构

使用 Dexie.js 封装，定义以下 stores：

```javascript
// IndexedDB 结构
const dbSchema = {
  sessions: 'id',          // 会话记录
  photos: 'id, sessionId', // 照片缓存
  settings: 'key',         // 用户设置 (key-value)
  pendingSync: 'id'        // 待同步到云端的数据
};

// 示例数据
// settings store:
// { key: 'apiKey', value: 'sk-xxx' }
// { key: 'defaultStyle', value: 'xiaohongshu' }
// { key: 'defaultModel', value: 'glm-4v-flash' }
```

### 7.3 数据同步策略

| 数据类型 | 本地优先 | 云端备份 | 同步策略 |
|----------|----------|----------|----------|
| 用户设置 | ✓ | ✓ | 有网时立即同步 |
| 拍摄会话 | ✓ | ✓ | 完成后同步 |
| 照片数据 | ✓ | - | 仅本地，选中照片上传云端 |
| 风格画像 | ✓ | ✓ | 有网时立即同步 |

---

## 8. AI 能力设计

### 8.1 模型选择策略

| 场景 | 使用模型 | 理由 |
|------|----------|------|
| 实时指导 | GLM-4V-Flash | 快速响应，满足实时性要求 |
| 选片分析 | GLM-4V | 高质量分析，准确性优先 |
| 风格学习 | GLM-4V | 需要深度提取特征 |

### 8.2 Prompt 设计

#### 8.2.1 实时指导 Prompt

```
你是一个专业的拍照指导助手。分析当前取景画面，给出拍照建议。

用户选择的风格：{style}

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
}
```

#### 8.2.2 选片分析 Prompt

```
你是一个专业摄影师。请从以下 {count} 张照片中选出最佳的 1-3 张。

照片列表：{photos}

请以 JSON 格式返回：
{
  "selected": [
    {
      "photo_id": "xxx",
      "score": 0.9,
      "reasons": ["构图遵循三分法", "表情自然", "光线柔和"]
    }
  ],
  "summary": "这批照片中，第1张和第3张最佳..."
}
```

#### 8.2.3 风格学习 Prompt

```
你是一个照片风格分析专家。请分析用户上传的满意照片，提取其风格特征。

照片：{photo}

请以 JSON 格式返回：
{
  "composition": ["center", "eye_level"],  // 构图偏好
  "preferred_angles": ["front", "slight_side"],  // 偏好角度
  "tone": "warm",  // 色调倾向
  "lighting": "soft",  // 光线偏好
  "background": "clean",  // 背景偏好
  "mood": "happy",  // 情绪倾向
  "tags": ["portrait", "smile", "outdoor"]
}
```

### 8.3 API 调用策略

#### 请求节流
- 实时指导：每 2 秒最多一次请求
- 连续请求时取消 pending 的上一个请求

#### 错误处理
```javascript
const strategy = {
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 10000,
  onTimeout: () => showToast('AI 响应超时，请稍后重试'),
  onError: (error) => {
    if (error.code === 'rate_limit_exceeded') {
      return '请求过于频繁，请稍后再试';
    }
    return 'AI 服务暂时不可用';
  }
};
```

#### 并发控制
- 选片分析时，最多 3 个并发请求
- 避免超出 API 限流

### 8.4 响应处理

所有 AI 响应要求返回 JSON 格式，便于前端解析和 UI 渲染。

```javascript
// 响应解析示例
async function parseAIResponse(rawResponse) {
  try {
    const parsed = JSON.parse(rawResponse);
    return { success: true, data: parsed };
  } catch {
    // 如果 JSON 解析失败，尝试从文本中提取
    return extractJSONFromText(rawResponse);
  }
}
```

---

## 9. 开发路线图

### Phase 0: 项目初始化

**目标**: 搭建开发环境和基础设施

| 任务 | 说明 |
|------|------|
| SvelteKit 项目搭建 | 使用 `npm create svelte@latest` 初始化项目 |
| PWA 配置 | 集成 Vite PWA Plugin，配置 manifest |
| Supabase 初始化 | 创建项目，配置数据库表结构 |
| UI 组件库安装 | 集成 Skeleton UI 和 TailwindCSS |
| 代码规范配置 | ESLint + Prettier |

### Phase 1: 相机基础

**目标**: 实现核心相机功能

| 任务 | 说明 |
|------|------|
| 相机访问 | 使用 Web Camera API 获取视频流 |
| 取景器界面 | 全屏相机预览 |
| 拍照功能 | 单张拍照 |
| 连拍功能 | 长按连拍，支持 20+ 张 |
| 辅助线绘制 | 三分线、引导线叠加层 |
| 照片保存 | 保存到 IndexedDB |

### Phase 2: AI 实时指导

**目标**: 集成 AI 实现拍摄指导

| 任务 | 说明 |
|------|------|
| GLM API 集成 | 封装 API 调用模块 |
| 实时分析 | 每 2 秒采样分析取景画面 |
| 结果展示 | 显示 AI 文字建议 |
| 震动反馈 | 良好状态时震动提示 |
| 请求节流 | 防止 API 过度调用 |

### Phase 3: 智能选片

**目标**: 实现拍摄后的智能筛选

| 任务 | 说明 |
|------|------|
| 批量分析 | 并行分析多张照片 |
| 选片算法 | AI 选出最佳 1-3 张 |
| 结果展示 | 展示选中照片及理由 |
| 相册保存 | 保存到系统相册 |

### Phase 4: 风格系统

**目标**: 实现风格选择和学习

| 任务 | 说明 |
|------|------|
| 预设风格 | 内置 5+ 种风格模板 |
| 风格切换 | 拍照时切换风格 |
| 照片上传 | 支持上传学习样本 |
| 风格学习 | AI 分析提取风格特征 |
| 个性化指导 | 基于学习结果定制建议 |

### Phase 5: 完善与优化

**目标**: 完成剩余功能和优化

| 任务 | 说明 |
|------|------|
| 历史记录 | 会话历史浏览 |
| 用户反馈 | 点赞/踩功能 |
| 设置页面 | API Key、风格、模型配置 |
| 离线支持 | 离线提示和缓存 |
| 性能优化 | 电池、响应速度优化 |
| 测试 | 端到端测试 |

### Phase 6: 发布与开源

**目标**: 发布并开源项目

| 任务 | 说明 |
|------|------|
| 文档完善 | README、使用说明 |
| 开源准备 | License、贡献指南 |
| 部署 | 部署到 Vercel/Netlify |

---

## 10. 成功指标

### 10.1 功能完整性

| 指标 | 目标 | 验收方式 |
|------|------|----------|
| 核心功能覆盖率 | 100% | 所有 PRD 功能均已实现 |
| PWA 可安装性 | ✓ | iOS 和 Android 均可添加到主屏幕 |
| 离线可用性 | 部分 | 无网时可查看历史记录 |

### 10.2 性能指标

| 指标 | 目标 | 测量方式 |
|------|------|----------|
| 实时指导响应 | < 2 秒 | 从取景变化到建议显示 |
| 选片分析速度 | < 5 秒/张 | 单张照片分析时间 |
| APP 启动时间 | < 2 秒 | 从点击到进入相机 |
| 连拍容量 | 20+ 张 | 不卡顿 |

### 10.3 用户体验

| 指标 | 目标 | 测量方式 |
|------|------|----------|
| AI 选片满意度 | > 80% | 用户点赞率 |
| 拍照完成率 | > 90% | 从拍照到保存相册的完成率 |
| 错误处理友好性 | 5/5 | 错误提示清晰易懂 |

### 10.4 个人目标

| 指标 | 目标 |
|------|------|
| 女友满意度提升 | 她觉得你拍照变好了 |
| 旅游出片率 | 每次旅游都能拍到满意的照片 |
| 开源影响 | Star 数 > 100 (可选) |

---

*本文档通过 Claude 协作编写完成*
