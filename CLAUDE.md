# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**男友相机 (Boyfriend Camera)** is a Progressive Web App (PWA) that provides AI-powered real-time camera guidance. The app uses computer vision (GLM-4V via Zhipu AI) to analyze camera frames and provide composition, lighting, and pose suggestions to help users take better photos.

## Development Commands

```bash
npm run dev          # Start development server (http://localhost:5173)
npm run build        # Build for production
npm run preview      # Preview production build
npm run check        # Run type checking with svelte-check
npm run check:watch  # Run type checking in watch mode
```

**Important**: Camera access requires HTTPS. Use `https://localhost:5173` or set up a tunnel with ngrok/Localtunnel for mobile testing.

## Architecture

### Tech Stack
- **Framework**: SvelteKit 2.20.0 with static adapter (SSG)
- **Language**: TypeScript
- **Styling**: TailwindCSS 4.1.18
- **State**: Svelte stores (native)
- **Storage**: IndexedDB via Dexie.js
- **AI**: Zhipu AI GLM-4V/GLM-4V-Flash
- **PWA**: @vite-pwa/sveltekit for offline support

### Key Directories

```
src/
├── lib/
│   ├── services/
│   │   ├── glm.ts          # GLM AI API client with retry logic and error handling
│   │   └── db.ts           # IndexedDB operations (session/photo CRUD)
│   ├── stores/
│   │   ├── camera.ts       # Camera state, session management
│   │   ├── settings.ts     # User preferences, API keys
│   │   └── adaptiveLearning.ts  # AI model personalization
│   ├── utils/
│   │   ├── performanceOptimizer.ts  # Request queuing, caching, EMA smoothing
│   │   ├── poseMatching.ts          # Pose comparison algorithms
│   │   ├── poseSmoothing.ts         # Kalman filter for pose stability
│   │   └── errorHandling.ts         # Error classification, recovery
│   ├── data/
│   │   └── poseTemplates.ts         # Predefined pose templates
│   ├── components/
│   │   ├── PoseSkeleton.svelte              # Pose overlay visualization
│   │   ├── PoseDifferenceVisualizer.svelte  # Shows pose deviations
│   │   ├── PoseConfidenceIndicator.svelte   # AI confidence display
│   │   └── PerformanceMetrics.svelte        # App performance monitoring
│   └── types/                  # TypeScript definitions
├── routes/
│   ├── +page.svelte           # Main camera interface (iOS-style)
│   ├── history/+page.svelte   # Photo session history
│   └── settings/+page.svelte  # Settings and API configuration
```

### Core Architecture Patterns

**1. Three-Tier State Management**
- **Stores** (`src/lib/stores/`): Svelte stores holding reactive state
- **Services** (`src/lib/services/`): Business logic and external API calls
- **Components**: Consume stores, delegate actions to services

**2. AI Request Flow**
```
Camera frame capture
    ↓
optimizeImageForAnalysis() (resize/compress)
    ↓
requestQueue.enqueue() (throttle to max 1 req/2.5s)
    ↓
GLMService.analyzeFrame() → AI response
    ↓
analysisCache.set() + EMA smoothing
    ↓
Store update → Component reactivity
```

**3. Pose System**
- 17-keypoint pose tracking via GLM-4V
- Templates defined in `POSE_TEMPLATES` (poseTemplates.ts)
- Kalman filter smoothing (poseSmoothing.ts) for stability
- Real-time difference visualization (PoseDifferenceVisualizer.svelte)

**4. Error Handling Strategy**
All errors are classified via `classifyError()` (errorHandling.ts):
- **Network errors**: Retry with exponential backoff
- **API errors**: Use fallback suggestions
- **Parse errors**: Cache hit + graceful degradation

**5. Performance Optimizations**
- Request queuing prevents API spam
- Analysis caching with EMA (exponential moving average) smoothing
- Image optimization (resize to max 1280px, quality 0.8)
- Performance monitoring via `performanceMonitor` utility

### Camera Interface

The main camera (`src/routes/+page.svelte`) is designed to match iOS native camera:
- Full-screen video element with no chrome
- Large circular shutter button at bottom
- AI suggestions displayed as non-intrusive overlays
- Real-time pose skeleton overlay when pose mode is active
- Haptic feedback when composition is optimal

### AI Integration

**GLM Service** (`src/lib/services/glm.ts`):
- Supports multiple models: `glm-4v`, `glm-4.6v`, `glm-4.6v-flash` (default)
- Base URL: `https://open.bigmodel.cn/api/paas/v4/chat/completions`
- Requires user-provided API key (stored in settings store)
- Images sent as base64 data URLs

**Two AI Modes**:
1. **Composition guidance**: Basic framing, lighting, angle suggestions
2. **Pose coaching**: Advanced pose matching with skeleton overlays

### Storage

**IndexedDB** (via Dexie.js in `src/lib/services/db.ts`):
- `sessions` table: Photo sessions with metadata
- `photos` table: Individual photos as blobs
- All data stored locally; Supabase integration is optional

## Key Implementation Details

### Frame Analysis Throttling
AI analysis is throttled to prevent API exhaustion:
- Max 1 request per 2.5 seconds
- Request queue drops intermediate frames if analysis is pending
- Results cached with EMA smoothing for consistent feedback

### Pose Matching Algorithm
Pose comparison uses:
- **Keypoint distance**: Euclidean distance between corresponding points
- **Symmetry scoring**: Left/right balance evaluation
- **Issue detection**: Identifies specific problems (e.g., "arms too close")
- **Difficulty rating**: Easy/medium/hard based on complexity

### Style System
Styles are defined as `StyleProfile` objects containing:
- Composition preferences (rule of thirds, center framing)
- Tone/color hints
- Angle preferences
- Pose templates

Custom styles can be learned from uploaded photos via `analyzeStyleForLearning()`.

### PWA Configuration

Service worker configured in `vite.config.ts`:
- Static asset caching
- Offline camera access
- Install prompt for iOS/Android
- Manifest in `static/manifest.json`

## Type Definitions

Key types in `src/lib/types/`:
- `AISuggestion`: AI feedback with confidence, suggestions, guidelines
- `Pose`: 17 keypoints (nose, eyes, ears, shoulders, elbows, wrists, hips, knees, ankles)
- `Session`: Photo session with style, photos, AI selection
- `StyleProfile`: Style configuration with composition/pose preferences

## API Key Configuration

Users must provide their own GLM API key from https://open.bigmodel.cn/
- Key is stored in browser localStorage (via settings store)
- No backend proxy; direct API calls from client
- App warns user if key is missing
