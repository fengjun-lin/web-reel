# @web-reel/recorder

Lightweight session recording SDK based on rrweb

## 📦 Installation

```bash
npm install @web-reel/recorder
```

That's it! `rrweb` and `idb` will be automatically installed as dependencies.

## 🚀 Quick Start

### Download Mode (Default)

```typescript
import { WebReelRecorder } from '@web-reel/recorder';

const recorder = new WebReelRecorder({
  env: 'test',
  appId: 1,
  projectName: 'my-app',
  deviceId: 'user-123',
});

// Export session data as ZIP file (default, smaller size)
await recorder.exportLog();

// Or export as JSON
await recorder.exportLog(true, 'json');
```

### Upload Mode (New!)

```typescript
import { WebReelRecorder } from '@web-reel/recorder';

const recorder = new WebReelRecorder({
  env: 'test',
  appId: 1,
  projectName: 'my-app',
  deviceId: 'user-123',
  // Upload configuration
  uploadEndpoint: '/api/sessions',
  platform: 'web',
  jiraId: 'ISSUE-123',
});

// Upload session directly to server
await recorder.uploadLog();
```

When `uploadEndpoint` is configured, the floating button will automatically switch to upload mode with an upload icon.

### Import Session Data

```typescript
// Import session data from file
const fileInput = document.querySelector('input[type="file"]');
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  await recorder.importLog(file);
});
```

## 📖 Full Documentation

See [docs/usage.md](./docs/usage.md) for complete documentation.

## 🔧 Features

- ✅ DOM events recording via rrweb
- ✅ Network request capture (fetch & XHR)
- ✅ Console logs recording
- ✅ IndexedDB storage
- ✅ **ZIP export (60-80% compression)**
- ✅ **Direct upload to server API**
- ✅ **Import/Export sessions**
- ✅ **Automatic mode switching (download/upload)**
- ✅ JSON export (legacy support)
- ✅ SSR compatible (Next.js, Nuxt, etc.)
- ✅ TypeScript support
- ✅ Webpack 5 compatible
- ✅ Zero polyfills required

## 📝 Configuration Options

| Option             | Type                     | Required | Description                                             |
| ------------------ | ------------------------ | -------- | ------------------------------------------------------- |
| `env`              | `'test' \| 'online'`     | Yes      | Environment identifier                                  |
| `appId`            | `number`                 | Yes      | Application ID                                          |
| `projectName`      | `string`                 | Yes      | Unique project identifier                               |
| `deviceId`         | `string`                 | No       | Device identifier                                       |
| `disabledDownLoad` | `boolean`                | No       | Hide the floating button (default: false)               |
| `recordInterval`   | `number`                 | No       | Log retention in days (default: 2)                      |
| `enableStats`      | `boolean`                | No       | Enable statistics upload (default: false)               |
| `uploadEndpoint`   | `string`                 | No       | API endpoint for upload (e.g. '/api/sessions')          |
| `uploadHeaders`    | `Record<string, string>` | No       | Custom headers for upload requests                      |
| `platform`         | `string`                 | No       | Platform identifier for metadata (e.g. 'web', 'mobile') |
| `jiraId`           | `string`                 | No       | Jira ticket ID for metadata                             |

## 🌐 Server API Integration

The recorder can upload sessions directly to your server. Your server should implement the following endpoint:

**POST** `/api/sessions`

Request format: `multipart/form-data`

| Field       | Type   | Required | Description                      |
| ----------- | ------ | -------- | -------------------------------- |
| `file`      | File   | Yes      | ZIP file containing session data |
| `platform`  | String | No       | Platform identifier              |
| `device_id` | String | No       | Device identifier                |
| `jira_id`   | String | No       | Jira ticket ID                   |

Response format:

```json
{
  "success": true,
  "session": {
    "id": 123,
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

See the [main project documentation](../../docs/session-api.md) for complete API specification.

## 📄 License

MIT
