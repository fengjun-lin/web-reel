# @web-reel/recorder

Lightweight session recording SDK based on [rrweb](https://github.com/rrweb-io/rrweb).

## Features

- 📹 **Session Recording**: Capture DOM mutations, user interactions, and console logs
- 🌐 **Network Monitoring**: Intercept and log XHR/Fetch requests in HAR format
- 💾 **Local Storage**: IndexedDB-based storage with automatic cleanup
- 📦 **Export**: Export sessions as JSON or ZIP files
- 🎨 **UI Components**: Optional floating entry button
- 🔒 **Privacy**: Configurable data masking and filtering
- 📊 **Analytics**: Optional server-side statistics upload

## Installation

```bash
npm install @web-reel/recorder rrweb@^1.1.3
```

## Quick Start

```typescript
import { WebReelRecorder } from '@web-reel/recorder'

const recorder = new WebReelRecorder({
  env: 'test',                    // 'test' | 'online'
  appId: 1,                       // Your app ID
  projectName: 'my-app',          // Project identifier
  deviceId: 'user-123',           // User/device ID
})

// Recorder starts automatically!
// A floating entry button will appear on the page
```

## Configuration

### Required Options

```typescript
interface RecorderConfig {
  env: 'test' | 'online'          // Environment
  appId: number                   // Application ID
  projectName: string             // Project identifier (for IndexedDB namespace)
}
```

### Optional Options

```typescript
interface RecorderConfig {
  // ... required options

  deviceId?: string               // Device/User ID (default: 'unknown_device')
  recordInterval?: number         // Data retention in days (default: 2)
                                  // -1 = never delete, 0 = keep only current session
  disabledDownLoad?: boolean      // Hide download button (default: false)
  enableStats?: boolean           // Enable PV/ENV stats upload (default: false)
}
```

## API

### Main Methods

```typescript
// Stop recording
recorder.stop()

// Export logs
await recorder.exportLog()        // Export as JSON
await recorder.exportLog(true)    // Export as ZIP

// Get current session ID
const sessionId = recorder.getSessionId()

// Check initialization status
const isReady = recorder.isInitialized()

// Access database (advanced)
const db = recorder.getDB()
```

## Privacy & Security

### Mask Sensitive Data

Configure rrweb to mask sensitive inputs:

```typescript
// Note: You'll need to modify the source code or extend the class
// to add these rrweb recording options:

recordLog: true,
maskAllInputs: true,
maskInputOptions: {
  password: true,
  email: true,
  tel: true,
},
blockClass: 'no-record',
maskTextSelector: '.sensitive',
```

### Don't Record Sensitive Pages

```typescript
const sensitivePages = ['/payment', '/admin']
const shouldRecord = !sensitivePages.some(p => 
  window.location.pathname.startsWith(p)
)

if (shouldRecord) {
  new WebReelRecorder({ /* config */ })
}
```

## Advanced Usage

### Custom Network Filtering

Modify the `shouldIgnoreUrl` method to filter specific requests.

### Manual Export with Custom Naming

```typescript
import { exportToFile, exportToZip } from '@web-reel/recorder'

const eventDataMap = await recorder.getDB().getByIndexKey('renderEvent', 'sessionId')
const responseDataMap = await recorder.getDB().getByIndexKey('responseData', 'sessionId')

await exportToFile(eventDataMap, responseDataMap, 'custom-filename')
await exportToZip(eventDataMap, responseDataMap, 'session-123')
```

### Server-Side Upload

If `enableStats: true`, configure your backend API:

```typescript
// Required endpoints:
POST /api/upload-pv-stat    // Page view statistics
POST /api/upload-env-stat   // Environment info
GET  /api/get-upload-flag   // Check upload permission
POST /api/set-upload-flag   // Set upload permission
POST /api/upload-logs       // Upload session logs
```

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ⚠️ Partial support (IndexedDB limitations)

## Dependencies

- `rrweb@^1.1.3` - Session recording engine (peer dependency)
- `idb@^8.0.3` - IndexedDB wrapper
- `jszip@^3.10.1` - ZIP file generation

## TypeScript

This package includes TypeScript definitions out of the box.

```typescript
import type { RecorderConfig, WebReelRecorder } from '@web-reel/recorder'
```

## License

MIT

## Related Packages

- `@web-reel/player` - Session replay player UI (coming soon)

## Links

- [Documentation](https://github.com/your-org/web-reel)
- [Examples](https://github.com/your-org/web-reel/tree/main/apps/demo)
- [Issues](https://github.com/your-org/web-reel/issues)

