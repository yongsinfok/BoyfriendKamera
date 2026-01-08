# 男友相机 (Boyfriend Camera)

> AI 帮你拍出好看的照片

一个 PWA Web 应用，通过 AI 实时分析拍摄场景，给出构图、光线、角度建议，并在拍摄后智能筛选最佳照片。

## 功能

- 📷 **实时 AI 指导** - 拍照时 AI 告诉你怎么调整构图和角度
- 🎨 **风格系统** - 内置多种预设风格，支持学习女友的审美偏好
- 📸 **智能选片** - 拍完自动挑出最好看的 1-3 张
- 📱 **PWA 支持** - iOS 和 Android 均可安装到主屏幕

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 GLM API Key

在应用中点击设置按钮，输入你的 [智谱 AI GLM API Key](https://open.bigmodel.cn/)。

### 3. 启动开发服务器

```bash
npm run dev
```

打开 http://localhost:5173/

### 4. 构建 PWA

```bash
npm run build
```

## 技术栈

- **前端框架**: SvelteKit
- **样式**: TailwindCSS
- **本地存储**: IndexedDB (Dexie.js)
- **后端**: Supabase (可选)
- **AI 服务**: GLM-4V / GLM-4V-Flash

## 项目结构

```
src/
├── lib/
│   ├── services/     # API 和存储服务
│   │   ├── db.ts      # IndexedDB 数据库
│   │   └── glm.ts     # GLM AI 服务
│   ├── stores/        # Svelte stores
│   │   ├── camera.ts  # 相机和会话状态
│   │   └── settings.ts # 应用设置
│   └── types/         # TypeScript 类型定义
├── routes/            # 页面路由
└── app.html           # HTML 模板
```

## 使用说明

1. 首次使用需要在设置中配置 GLM API Key
2. 选择一种拍照风格（可选）
3. 对准拍摄对象，AI 会给出实时建议
4. 点击快门拍照，可以连拍多张
5. 拍完后 AI 自动筛选最佳照片

## 隐私

- 用户使用自己的 API Key，数据走用户自己的账户
- 照片主要存储在本地 IndexedDB
- 支持随时删除所有数据

## 开发路线图

详见 [docs/PRD.md](docs/PRD.md)

## License

MIT
