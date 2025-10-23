<div align="center">
  <img src="./public/icon-reel.png" alt="Web Reel Logo" width="120" height="120">
  
  # Web Reel
  
  A lightweight, browser-based session recording and replay tool built with React, TypeScript, and rrweb.
</div>

## Features

- **Session Recording**: Capture DOM mutations, user interactions, console logs, and network requests
- **Replay Player**: Built-in rrweb-player for session replay
- **Network Monitoring**: Intercept and log XHR/Fetch requests in HAR format
- **Console Logs**: Capture and display console output during replay
- **Export/Import**: Export sessions as JSON or ZIP files
- **IndexedDB Storage**: Local session storage with automatic cleanup
- **Upload Control**: Server-controlled upload flag management
- **Jira Integration**: Create bug tickets directly from replay sessions
- **AI Analysis**: OpenAI-powered session analysis for debugging (optional)

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite 7
- **UI Library**: Ant Design 5
- **Recording**: rrweb 1.1.3 (stable) + rrweb-player 0.7.14
- **Storage**: IndexedDB (idb 8.x)
- **Routing**: React Router 7 (HashRouter)
- **State Management**: React Hooks
- **Compression**: JSZip 3.x

## Getting Started

### Prerequisites

- Node.js >= 20.19+ (Vite requirement)
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Visit `http://localhost:5174/#/`

### Build

```bash
npm run build
```

### Lint & Type Check

```bash
npm run lint
npm run typecheck
```

## Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── ConsolePanel/     # Console logs viewer
│   ├── NetworkPanel/     # Network requests viewer
│   └── UploadFlagSwitch/ # Upload control toggle
├── constants/            # Application constants
│   ├── index.ts          # General constants
│   ├── db.ts             # IndexedDB constants
│   └── session.ts        # Session management constants
├── pages/                # Page components
│   ├── sessions/         # Session list & uploader
│   ├── replay/           # Session replay page
│   ├── report/           # Environment report
│   └── test/             # Recording SDK test page
├── recorder/             # Recording SDK
│   ├── core.ts           # Main recorder class
│   ├── interceptors.ts   # Network interceptors
│   ├── export.ts         # Export utilities
│   └── ui.ts             # Entry button component
├── services/             # API services
│   ├── api.ts            # API functions
│   └── http.ts           # HTTP utilities
├── types/                # TypeScript definitions
│   ├── index.ts          # General types
│   └── har.ts            # HAR format types
└── utils/                # Utility functions
    ├── db.ts             # IndexedDB wrapper
    ├── dbHelper.ts       # DB helper functions
    ├── browser.ts        # Browser compatibility
    └── session.ts        # Session utilities
```

## Usage

### Recording Sessions

#### Method 1: Use Test Page (Recommended for development)

1. Navigate to `http://localhost:5174/#/test`
2. Click "Start Recording"
3. Perform actions (clicks, typing, network requests)
4. Click "Export ZIP" to download the session

#### Method 2: Integrate into Your Project

##### Step 1: Copy SDK files to your project

```bash
# Copy the recorder SDK to your project
cp -r src/recorder /path/to/your-project/src/
cp -r src/utils/db.ts /path/to/your-project/src/utils/
cp -r src/utils/dbHelper.ts /path/to/your-project/src/utils/
cp -r src/utils/browser.ts /path/to/your-project/src/utils/
cp -r src/utils/session.ts /path/to/your-project/src/utils/
cp -r src/constants /path/to/your-project/src/
cp -r src/types /path/to/your-project/src/
cp -r src/services /path/to/your-project/src/
```

##### Step 2: Install dependencies

```bash
npm install rrweb@^1.1.3 idb@^8.0.3 jszip@^3.10.1
```

##### Step 3: Initialize in your app

```typescript
import { WebReelRecorder } from './recorder'

// Initialize when your app starts (e.g., in main.ts or App.tsx)
const recorder = new WebReelRecorder({
  env: 'test', // 'test' | 'online'
  deviceId: 'user-device-id', // Unique user identifier
  appId: 1, // Your app ID
  projectName: 'my-app', // Unique project name (used for IndexedDB)
  recordInterval: 2, // Keep logs for N days (default: 2)
  disabledDownLoad: false, // Show download button (default: false)
  enableStats: false, // Enable statistics upload (default: false)
})

// Recorder starts automatically!
// A floating entry button will appear on the page
```

##### Step 4: Configuration Options

```typescript
interface RecorderConfig {
  // Required fields
  env: 'test' | 'online' // Environment
  appId: number // Application ID
  projectName: string // Project identifier (for IndexedDB namespace)

  // Optional fields
  deviceId?: string // Device/User ID (default: 'unknown_device')
  recordInterval?: number // Data retention in days (default: 2)
  // -1 = never delete, 0 = keep only current session
  disabledDownLoad?: boolean // Hide download button (default: false)
  enableStats?: boolean // Enable PV/ENV stats upload (default: false)
}
```

##### Step 5: API Methods

```typescript
// Stop recording
recorder.stop()

// Export logs to file
await recorder.exportLog() // Export as JSON
await recorder.exportLog(true) // Export as ZIP

// Get current session ID
const sessionId = recorder.getSessionId()

// Check initialization status
const isReady = recorder.isInitialized()

// Access database directly (advanced usage)
const db = recorder.getDB()
```

##### Example: React Integration

```tsx
// App.tsx
import { useEffect, useRef } from 'react'
import { WebReelRecorder } from './recorder'

function App() {
  const recorderRef = useRef<WebReelRecorder>()

  useEffect(() => {
    // Initialize recorder when app mounts
    recorderRef.current = new WebReelRecorder({
      env: import.meta.env.MODE === 'production' ? 'online' : 'test',
      deviceId: getUserId(), // Your user ID logic
      appId: 1,
      projectName: 'my-awesome-app',
      recordInterval: 7, // Keep 7 days
      disabledDownLoad: import.meta.env.MODE === 'production', // Hide in production
      enableStats: true,
    })

    // Cleanup on unmount
    return () => {
      recorderRef.current?.stop()
    }
  }, [])

  return <YourApp />
}
```

##### Example: Vue Integration

```typescript
// main.ts
import { createApp } from 'vue'
import { WebReelRecorder } from './recorder'
import App from './App.vue'

// Initialize recorder
const recorder = new WebReelRecorder({
  env: import.meta.env.MODE === 'production' ? 'online' : 'test',
  deviceId: getUserId(),
  appId: 1,
  projectName: 'my-vue-app',
  recordInterval: 7,
  disabledDownLoad: false,
  enableStats: true,
})

// Create Vue app
const app = createApp(App)

// Provide recorder to all components (optional)
app.provide('recorder', recorder)

app.mount('#app')
```

##### Example: Vanilla JS Integration

```html
<!-- index.html -->
<script type="module">
  import { WebReelRecorder } from './recorder/index.js'

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    window.recorder = new WebReelRecorder({
      env: 'test',
      deviceId: localStorage.getItem('userId') || 'guest',
      appId: 1,
      projectName: 'my-vanilla-app',
      recordInterval: 2,
      disabledDownLoad: false,
      enableStats: false,
    })
  })
</script>
```

### Replaying Sessions

1. Go to home page (`http://localhost:5174/#/`)
2. Upload a session file (JSON or ZIP)
3. Click "View Replay"
4. Use rrweb-player controls to play/pause/skip
5. Switch tabs to view Console Logs and Network requests

### Testing

Visit `http://localhost:5174/#/test` to access the built-in testing page with:

- Recording controls
- Real-time session statistics
- Test action buttons
- Export functionality

## Advanced Usage

### Custom Network Request Filtering

You can modify the network interceptor to filter specific requests:

```typescript
// src/recorder/core.ts - Modify shouldIgnoreUrl method
private shouldIgnoreUrl(url: string): boolean {
  const apiPrefix = getApiPrefix(this.config.env)

  // Ignore your API requests
  if (url.includes(apiPrefix)) return true

  // Ignore analytics
  if (url.includes('google-analytics.com')) return true
  if (url.includes('facebook.com/tr')) return true

  // Ignore large files
  if (url.match(/\.(mp4|mov|avi|pdf)$/)) return true

  return false
}
```

### Conditional Recording

Only record in specific conditions:

```typescript
// Only record for specific users
const shouldRecord = user.role === 'beta-tester' || user.hasIssue

if (shouldRecord) {
  const recorder = new WebReelRecorder({
    env: 'test',
    deviceId: user.id,
    appId: 1,
    projectName: 'my-app',
  })
}
```

### Manual Export with Custom Naming

```typescript
import { exportToFile, exportToZip } from './recorder/export'

// Get data from recorder
const eventDataMap = await recorder
  .getDB()
  .getByIndexKey('renderEvent', 'sessionId')
const responseDataMap = await recorder
  .getDB()
  .getByIndexKey('responseData', 'sessionId')

// Export with custom filename
await exportToFile(eventDataMap, responseDataMap, 'bug-report-issue-123')
await exportToZip(eventDataMap, responseDataMap, 'session-user-456')
```

### Server-Side Upload (with enableStats: true)

If you enable statistics upload, configure your backend API:

```typescript
// Backend API endpoints (see src/services/api.ts)
POST / api / upload - pv - stat // Page view statistics
POST / api / upload - env - stat // Environment info (UA, storage size)
GET / api / get - upload - flag // Check if should upload logs
POST / api / set - upload - flag // Set upload permission
POST / api / upload - logs // Upload session logs
```

Backend example (Express.js):

```typescript
// server.js
app.post('/api/upload-logs', async (req, res) => {
  const { appId, deviceId, sessionId, domData, networkData } = req.body

  // Save to database
  await db.sessions.create({
    appId,
    deviceId,
    sessionId,
    domData: JSON.parse(domData),
    networkData: JSON.parse(networkData),
    createdAt: new Date(),
  })

  res.json({ errNo: 0, data: { success: true } })
})
```

### Privacy & Security Best Practices

#### 1. Mask Sensitive Data

```typescript
// Configure rrweb to mask sensitive inputs
// Modify src/recorder/core.ts - initializeRecording()

this.stopRecordingFn = record({
  emit: async (event: eventWithTime) => {
    /* ... */
  },
  recordLog: true,

  // Add masking configuration
  maskAllInputs: true, // Mask all input values
  maskInputOptions: {
    password: true, // Mask password fields
    email: true, // Mask email fields
    tel: true, // Mask phone numbers
  },
  maskTextSelector: '.sensitive', // Mask elements with this class
  blockClass: 'no-record', // Don't record these elements
  ignoreClass: 'ignore-record', // Ignore mutations on these
} as any)
```

#### 2. Don't Record Sensitive Pages

```typescript
// main.ts
const sensitiveRoutes = ['/payment', '/settings/security', '/admin']
const currentPath = window.location.pathname

if (!sensitiveRoutes.some((route) => currentPath.startsWith(route))) {
  // Only initialize recorder on non-sensitive pages
  new WebReelRecorder({
    /* config */
  })
}
```

#### 3. Clear Data After Upload

```typescript
// After successful upload
await recorder.getDB().clear('renderEvent')
await recorder.getDB().clear('responseData')
```

## Environment Configuration

### Jira Integration

Web Reel supports creating Jira tickets directly from the Replayer page. To enable this feature, create a `.env.local` file in the project root with the following variables:

```bash
# Jira Configuration
VITE_JIRA_API_KEY=your_jira_api_token_here
VITE_JIRA_DOMAIN=your-domain.atlassian.net
VITE_JIRA_USER_EMAIL=your.email@example.com
VITE_JIRA_PROJECT_KEY=PROJ

# OpenAI Configuration (Optional - for AI-powered session analysis)
VITE_OPENAI_API_KEY=sk-your-openai-api-key
VITE_OPENAI_API_BASE=https://api.openai.com/v1
VITE_OPENAI_MODEL=gpt-4o-mini
```

**How to get Jira API Token:**

1. Log in to your Atlassian account
2. Go to [Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
3. Click "Create API token"
4. Give it a name (e.g., "Web Reel Integration")
5. Copy the token and add it to `.env.local`

**Security Note:** Never commit `.env.local` to version control. It's already included in `.gitignore`.

### API Configuration

By default, the API endpoints are set to `http://localhost:3000/api`.

To change the API prefix, edit `src/services/http.ts`:

```typescript
export const API_PREFIX_TEST = 'http://your-api-domain.com/api'
export const API_PREFIX_ONLINE = 'http://your-api-domain.com/api'
```

## Data Format

### Exported Session Structure

```json
{
  "timestamp": {
    "eventData": [
      // rrweb events
    ],
    "responseData": [
      // HAR format network logs
    ]
  }
}
```

### IndexedDB Schema

- **Database**: `WebReelDB`
- **Tables**:
  - `renderEvent`: DOM snapshot events (key: sessionId)
  - `responseData`: Network request logs (key: sessionId)

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ⚠️ Partial support (IndexedDB limitations)

## Known Limitations

- Large sessions (>100MB) may experience performance issues
- Network request bodies >1MB are truncated
- Console logs from cross-origin iframes may be limited
- Video/audio recording not supported (DOM only)

## Important Notes

### Why rrweb 1.x instead of 2.x?

This project uses **rrweb 1.1.3** (stable) instead of the latest 2.x alpha version because:

✅ **Production Ready**: 1.x is battle-tested in production environments  
✅ **Stable API**: No breaking changes expected  
✅ **Better Documentation**: More community examples and solutions  
✅ **Console Recording**: Built-in `recordLog: true` option (no separate plugin needed)  
✅ **Smaller Bundle**: ~17% smaller than 2.x alpha  
⚠️ **2.x Status**: Currently in alpha with potential API changes

### rrweb 1.x Console Recording

In rrweb 1.x, console recording is enabled via configuration:

```typescript
// rrweb 1.x - Simple configuration
record({
  emit: (event) => {
    /* ... */
  },
  recordLog: true, // Built-in console recording
})
```

**Not needed in 1.x:**

- ❌ Separate `@rrweb/rrweb-plugin-console-record` package
- ❌ Plugin import and configuration
- ❌ Additional setup code

### Upgrading to rrweb 2.x (Future)

When 2.x becomes stable, migration will require:

1. Update dependencies:

```bash
npm install rrweb@^2.0.0 @rrweb/rrweb-plugin-console-record
```

2. Change console recording:

```typescript
// rrweb 2.x - Requires plugin
import { getRecordConsolePlugin } from '@rrweb/rrweb-plugin-console-record'

record({
  emit: (event) => {
    /* ... */
  },
  plugins: [getRecordConsolePlugin()],
})
```

3. Update player configuration:

```typescript
// 1.x uses 'replayOptions'
// 2.x uses 'replayerConfig'
```

## Development

### Code Quality

All code follows:

- ESLint rules (see `eslint.config.js`)
- TypeScript strict mode
- Prettier formatting (see `prettier.config.cjs`)

### Commit Guidelines

```bash
# Format: <type>(<scope>): <subject>

feat(recorder): add network interceptor
fix(replay): resolve player initialization issue
docs(readme): update installation instructions
```

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run lint && npm run typecheck && npm run build`
5. Submit a pull request

## Acknowledgments

- [rrweb](https://github.com/rrweb-io/rrweb) - Session recording and replay
- [Ant Design](https://ant.design/) - UI components
- [Vite](https://vitejs.dev/) - Build tool
