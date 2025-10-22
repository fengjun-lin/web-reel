# How to Use @web-reel/recorder Package

## 📦 Package is Ready!

The `@web-reel/recorder` package has been successfully created and built.

## 🚀 Three Ways to Use It

### Option 1: Publish to npm (Recommended for Production)

#### Step 1: Update package info

Edit `packages/recorder/package.json`:
```json
{
  "name": "@web-reel/recorder",
  "repository": {
    "type": "git",
    "url": "https://github.com/YOUR_USERNAME/web-reel"
  },
  "author": "Your Name <your@email.com>"
}
```

#### Step 2: Publish

```bash
cd packages/recorder

# First time - login to npm
npm login

# Publish (public package)
npm publish --access public
```

#### Step 3: Install in any project

```bash
npm install @web-reel/recorder rrweb@^1.1.3 idb@^8.0.3
```

```typescript
import { WebReelRecorder } from '@web-reel/recorder'

const recorder = new WebReelRecorder({
  env: 'test',
  appId: 1,
  projectName: 'my-app',
  deviceId: 'user-123',
})
```

---

### Option 2: Local Package Link (For Testing)

#### Step 1: Create npm link

```bash
cd packages/recorder
npm link
```

#### Step 2: Use in your project

```bash
cd /path/to/your-project
npm link @web-reel/recorder --legacy-peer-deps
npm install rrweb@^1.1.3 idb@^8.0.3
```

#### Step 3: Import and use

```typescript
import { WebReelRecorder } from '@web-reel/recorder'
// ... use normally
```

---

### Option 3: Direct File Reference (Quick Testing)

#### Step 1: Install from file path

```bash
cd /path/to/your-project
npm install ../web-reel/packages/recorder rrweb@^1.1.3 idb@^8.0.3
```

This will add to your `package.json`:
```json
{
  "dependencies": {
    "@web-reel/recorder": "file:../web-reel/packages/recorder",
    "rrweb": "^1.1.3",
    "idb": "^8.0.3"
  }
}
```

#### Step 2: Use normally

```typescript
import { WebReelRecorder } from '@web-reel/recorder'
```

---

## 📚 Full API Documentation

### Basic Usage

```typescript
import { WebReelRecorder } from '@web-reel/recorder'

const recorder = new WebReelRecorder({
  // Required
  env: 'test' | 'online',
  appId: 1,
  projectName: 'my-app',
  
  // Optional
  deviceId: 'user-123',              // Default: 'unknown_device'
  recordInterval: 7,                 // Keep logs for 7 days
  disabledDownLoad: false,           // Show download button
  enableStats: false,                // Disable stats upload
})

// Recorder starts automatically!
```

### Methods

```typescript
// Stop recording
recorder.stop()

// Export logs as JSON file
await recorder.exportLog()

// Get session ID
const sessionId = recorder.getSessionId()

// Check if initialized
const ready = recorder.isInitialized()

// Access database (advanced)
const db = recorder.getDB()
```

### Advanced: Export Utilities

```typescript
import { exportToFile } from '@web-reel/recorder'

const eventDataMap = { /* ... */ }
const responseDataMap = { /* ... */ }

await exportToFile(eventDataMap, responseDataMap)
```

### Advanced: Network Interceptor

```typescript
import { NetworkInterceptor } from '@web-reel/recorder'

const interceptor = new NetworkInterceptor({
  onRequestStart: (url, timestamp) => {
    console.log('Request started:', url)
  },
  onRequestComplete: (harEntry) => {
    console.log('Request completed:', harEntry)
  },
  shouldIgnore: (url) => {
    return url.includes('analytics')
  },
})

interceptor.install()
// ... later
interceptor.uninstall()
```

### Advanced: Custom Entry Button

```typescript
import { EntryButton } from '@web-reel/recorder'

const button = new EntryButton({
  onClick: () => {
    console.log('Button clicked!')
  },
})

// Remove button
button.destroy()
```

---

## 🔧 Development Workflow

### Update the Recorder Package

```bash
# 1. Make changes to packages/recorder/src/
# 2. Rebuild
cd packages/recorder
npm run build

# 3. If using npm link, changes will be immediately available
# 4. If published to npm, bump version and republish
npm version patch  # 1.0.0 -> 1.0.1
npm publish
```

### Test Changes Locally

```bash
# Build recorder
npm run build:recorder

# Or watch mode (auto-rebuild on changes)
npm run dev:recorder

# In another terminal, run your demo app
npm run dev
```

---

## 📋 TypeScript Support

The package includes full TypeScript definitions:

```typescript
import type {
  RecorderConfig,
  RecorderOption,
  SessionLogPayload,
  UserInfo,
  EnvStat,
  HarEntry,
  NetworkInterceptorConfig,
} from '@web-reel/recorder'

const config: RecorderConfig = {
  env: 'test',
  appId: 1,
  projectName: 'my-app',
}
```

---

## 🌐 Framework Examples

### React

```tsx
import { useEffect, useRef } from 'react'
import { WebReelRecorder } from '@web-reel/recorder'

function App() {
  const recorderRef = useRef<WebReelRecorder>()
  
  useEffect(() => {
    recorderRef.current = new WebReelRecorder({
      env: 'test',
      appId: 1,
      projectName: 'my-react-app',
      deviceId: 'user-123',
    })
    
    return () => recorderRef.current?.stop()
  }, [])
  
  return <YourApp />
}
```

### Vue 3

```typescript
import { onMounted, onUnmounted } from 'vue'
import { WebReelRecorder } from '@web-reel/recorder'

export default {
  setup() {
    let recorder: WebReelRecorder
    
    onMounted(() => {
      recorder = new WebReelRecorder({
        env: 'test',
        appId: 1,
        projectName: 'my-vue-app',
        deviceId: 'user-123',
      })
    })
    
    onUnmounted(() => {
      recorder?.stop()
    })
  }
}
```

### Next.js

```tsx
'use client'
import { useEffect } from 'react'
import { WebReelRecorder } from '@web-reel/recorder'

export default function RootLayout({ children }) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      new WebReelRecorder({
        env: 'test',
        appId: 1,
        projectName: 'my-nextjs-app',
        deviceId: 'user-123',
      })
    }
  }, [])
  
  return children
}
```

---

## 🎯 Best Practices

### 1. Environment-based Configuration

```typescript
const recorder = new WebReelRecorder({
  env: process.env.NODE_ENV === 'production' ? 'online' : 'test',
  appId: parseInt(process.env.VITE_APP_ID || '1'),
  projectName: process.env.VITE_PROJECT_NAME || 'my-app',
  deviceId: getUserId(),
  disabledDownLoad: process.env.NODE_ENV === 'production',
})
```

### 2. Conditional Recording

```typescript
const shouldRecord = 
  user.role === 'beta-tester' || 
  window.location.search.includes('debug=true')

if (shouldRecord) {
  new WebReelRecorder({ /* config */ })
}
```

### 3. Error Handling

```typescript
try {
  const recorder = new WebReelRecorder({
    env: 'test',
    appId: 1,
    projectName: 'my-app',
  })
  
  if (recorder.isInitialized()) {
    console.log('✅ Recorder initialized successfully')
  }
} catch (error) {
  console.error('❌ Failed to initialize recorder:', error)
}
```

---

## 📦 Package Size

- **ESM**: 41.15 KB
- **CommonJS**: 41.86 KB
- **Types**: 11.65 KB
- **Total**: ~42KB (recorder only)

### Required Dependencies
- `rrweb`: ~100KB (screen recording engine)
- `idb`: ~8KB (IndexedDB wrapper)

---

## 🔗 Links

- [Package README](./packages/recorder/README.md)
- [Migration Complete](./MONOREPO_MIGRATION_COMPLETE.md)
- [Monorepo Plan](./MONOREPO_PLAN.md)
- [Main README](./README.md)

---

## ✅ Quick Checklist

Before publishing:
- [ ] Update package.json (author, repository, etc.)
- [ ] Test the package locally
- [ ] Write/update README
- [ ] Add CHANGELOG.md
- [ ] Run `npm run build` successfully
- [ ] Test in a separate project
- [ ] Login to npm: `npm login`
- [ ] Publish: `npm publish --access public`

---

**Status**: ✅ Package is ready to use!  
**Created**: 2025-10-14

