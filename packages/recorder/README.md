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

// Export session data as JSON file
await recorder.exportLog();
```

## 📖 Full Documentation

See [docs/usage.md](./docs/usage.md) for complete documentation.

## 🔧 Features

- ✅ DOM events recording via rrweb
- ✅ Network request capture (fetch & XHR)
- ✅ Console logs recording
- ✅ IndexedDB storage
- ✅ JSON export
- ✅ SSR compatible (Next.js, Nuxt, etc.)
- ✅ TypeScript support
- ✅ Webpack 5 compatible
- ✅ Zero polyfills required

## 📄 License

MIT
