# @web-reel/recorder

Lightweight session recording SDK based on rrweb

## 📦 Installation

```bash
npm install @web-reel/recorder
```

That's it! `rrweb` and `idb` will be automatically installed as dependencies.

## 🚀 Quick Start

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
- ✅ **Import/Export sessions**
- ✅ JSON export (legacy support)
- ✅ SSR compatible (Next.js, Nuxt, etc.)
- ✅ TypeScript support
- ✅ Webpack 5 compatible
- ✅ Zero polyfills required

## 📄 License

MIT
