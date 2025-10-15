# Testing @web-reel/recorder Package Locally

在发布到 npm 之前，这里有几种方法可以在其他项目中测试你的包。

## 🎯 方法对比

| 方法 | 优点 | 缺点 | 适用场景 |
|-----|------|------|---------|
| npm link | 快速，实时更新 | 需要两步操作 | 开发调试 |
| file: 协议 | 简单，像真实安装 | 需要重新安装才能更新 | 集成测试 |
| npm pack | 最接近真实发布 | 每次都要重新打包 | 发布前验证 |
| 本地 demo | 最简单 | 只能在当前项目测试 | 快速验证 |

---

## 方法 1: npm link（推荐）

### 特点
- ✅ 实时更新：修改代码后重新构建，其他项目立即生效
- ✅ 不需要复制文件
- ⚠️ 需要在两个目录操作

### 步骤

#### 1. 在 recorder 包目录创建全局链接

```bash
cd /Users/fengjunlin/projects/web-reel/packages/recorder
npm link
```

你会看到类似输出：
```
added 1 package, and audited 1 package in 0.5s
```

#### 2. 在测试项目中使用链接

```bash
cd /path/to/your-test-project
npm link @web-reel/recorder
npm install rrweb@^1.1.3  # 安装 peer dependency
```

#### 3. 在测试项目中使用

```typescript
// src/main.ts or src/App.tsx
import { WebReelRecorder } from '@web-reel/recorder'

const recorder = new WebReelRecorder({
  env: 'test',
  appId: 1,
  projectName: 'test-project',
  deviceId: 'test-user',
})

console.log('✅ Recorder initialized:', recorder.getSessionId())
```

#### 4. 验证安装

```bash
# 检查链接是否成功
ls -la node_modules/@web-reel/recorder
# 应该显示这是一个符号链接 (symlink)
```

#### 5. 开发流程

```bash
# Terminal 1: 在 recorder 包目录，watch 模式
cd /Users/fengjunlin/projects/web-reel/packages/recorder
npm run dev  # 监听文件变化，自动重新构建

# Terminal 2: 在测试项目，运行开发服务器
cd /path/to/your-test-project
npm run dev
```

修改 recorder 代码 → 自动重新构建 → 刷新浏览器 → 看到更新 ✨

#### 6. 清理（测试完成后）

```bash
# 在测试项目中
cd /path/to/your-test-project
npm unlink @web-reel/recorder

# 在 recorder 包目录
cd /Users/fengjunlin/projects/web-reel/packages/recorder
npm unlink
```

---

## 方法 2: file: 协议（最简单）

### 特点
- ✅ 像真实 npm 安装一样
- ✅ 一行命令搞定
- ⚠️ 每次代码更新需要重新安装

### 步骤

#### 1. 构建 recorder 包

```bash
cd /Users/fengjunlin/projects/web-reel/packages/recorder
npm run build
```

#### 2. 在测试项目中安装

```bash
cd /path/to/your-test-project

# 绝对路径
npm install /Users/fengjunlin/projects/web-reel/packages/recorder rrweb@^1.1.3

# 或相对路径（如果测试项目在附近）
npm install ../web-reel/packages/recorder rrweb@^1.1.3
```

这会在 package.json 中添加：
```json
{
  "dependencies": {
    "@web-reel/recorder": "file:../web-reel/packages/recorder",
    "rrweb": "^1.1.3"
  }
}
```

#### 3. 使用

```typescript
import { WebReelRecorder } from '@web-reel/recorder'
// 正常使用
```

#### 4. 更新代码后

```bash
# 1. 重新构建 recorder
cd /Users/fengjunlin/projects/web-reel/packages/recorder
npm run build

# 2. 在测试项目中重新安装
cd /path/to/your-test-project
npm install
```

---

## 方法 3: npm pack（最接近发布）

### 特点
- ✅ 完全模拟 npm 发布
- ✅ 可以检查打包内容
- ⚠️ 每次测试都要重新打包

### 步骤

#### 1. 打包

```bash
cd /Users/fengjunlin/projects/web-reel/packages/recorder
npm run build
npm pack
```

这会创建一个 `.tgz` 文件，例如：
```
web-reel-recorder-1.0.0.tgz
```

#### 2. 检查打包内容（可选）

```bash
tar -tzf web-reel-recorder-1.0.0.tgz
```

你应该看到：
```
package/package.json
package/README.md
package/dist/index.js
package/dist/index.cjs
package/dist/index.d.ts
...
```

#### 3. 在测试项目中安装

```bash
cd /path/to/your-test-project
npm install /Users/fengjunlin/projects/web-reel/packages/recorder/web-reel-recorder-1.0.0.tgz rrweb@^1.1.3
```

#### 4. 使用

```typescript
import { WebReelRecorder } from '@web-reel/recorder'
// 正常使用
```

---

## 方法 4: 在当前 Demo 中测试（最快验证）

### 特点
- ✅ 不需要额外项目
- ✅ 可以快速验证功能
- ⚠️ 无法测试真实集成场景

### 步骤

#### 1. 更新当前项目使用 recorder 包

```bash
cd /Users/fengjunlin/projects/web-reel
npm install ./packages/recorder
```

#### 2. 修改导入路径

```typescript
// src/pages/test/index.tsx
// 之前
import { WebReelRecorder } from '../../recorder'

// 改为
import { WebReelRecorder } from '@web-reel/recorder'
```

#### 3. 测试

```bash
npm run dev
# 访问 http://localhost:5174/#/test
```

---

## 🧪 完整测试清单

创建一个测试项目来验证所有功能：

### 1. 创建测试项目

```bash
mkdir ~/test-web-reel-recorder
cd ~/test-web-reel-recorder

# React 项目
npm create vite@latest . -- --template react-ts

# 或 Vue 项目
npm create vite@latest . -- --template vue-ts
```

### 2. 安装依赖

```bash
npm install
npm link @web-reel/recorder  # 或使用其他方法
npm install rrweb@^1.1.3
```

### 3. 创建测试文件

```typescript
// src/test-recorder.ts
import { WebReelRecorder } from '@web-reel/recorder'

console.group('🧪 Testing @web-reel/recorder')

// Test 1: 基本初始化
console.log('Test 1: Basic initialization')
try {
  const recorder = new WebReelRecorder({
    env: 'test',
    appId: 1,
    projectName: 'test-project',
    deviceId: 'test-user-123',
  })
  
  console.log('✅ Recorder initialized')
  console.log('Session ID:', recorder.getSessionId())
  console.log('Is ready:', recorder.isInitialized())
} catch (error) {
  console.error('❌ Initialization failed:', error)
}

// Test 2: 导出功能
console.log('\nTest 2: Export functions')
import { exportToFile, exportToZip } from '@web-reel/recorder'
console.log('✅ exportToFile:', typeof exportToFile === 'function')
console.log('✅ exportToZip:', typeof exportToZip === 'function')

// Test 3: 类型检查
console.log('\nTest 3: TypeScript types')
import type { RecorderConfig, HarEntry } from '@web-reel/recorder'
const config: RecorderConfig = {
  env: 'test',
  appId: 1,
  projectName: 'test',
}
console.log('✅ TypeScript types work')

console.groupEnd()
```

### 4. 在 main.ts 中导入

```typescript
// src/main.ts (React) or src/main.ts (Vue)
import './test-recorder'
// ... rest of your code
```

### 5. 运行并检查控制台

```bash
npm run dev
```

在浏览器控制台应该看到：
```
🧪 Testing @web-reel/recorder
Test 1: Basic initialization
✅ Recorder initialized
Session ID: 1728912345678
Is ready: true

Test 2: Export functions
✅ exportToFile: true
✅ exportToZip: true

Test 3: TypeScript types
✅ TypeScript types work
```

---

## 📋 测试检查清单

验证以下功能都正常工作：

### 基础功能
- [ ] 包能正常安装/链接
- [ ] 可以导入 `WebReelRecorder` 类
- [ ] 可以创建 recorder 实例
- [ ] 可以获取 session ID
- [ ] 浮动按钮出现在页面上

### 录制功能
- [ ] 可以录制 DOM 操作
- [ ] 可以录制 console 日志
- [ ] 可以录制网络请求
- [ ] 数据保存到 IndexedDB

### 导出功能
- [ ] 点击浮动按钮可以导出
- [ ] 可以导出 JSON 文件
- [ ] 可以导出 ZIP 文件
- [ ] 导出的文件可以在 replay 页面播放

### TypeScript 支持
- [ ] IDE 有代码补全
- [ ] 类型检查无错误
- [ ] 导入所有导出的类型

### API 方法
- [ ] `recorder.stop()` 正常工作
- [ ] `recorder.getSessionId()` 返回正确值
- [ ] `recorder.isInitialized()` 返回 true
- [ ] `recorder.exportLog()` 可以导出

---

## 🐛 常见问题

### 问题 1: npm link 后找不到模块

```bash
# 解决方法：检查链接
ls -la node_modules/@web-reel

# 如果没有，重新链接
cd /Users/fengjunlin/projects/web-reel/packages/recorder
npm link

cd /path/to/test-project
npm link @web-reel/recorder
```

### 问题 2: TypeScript 找不到类型

```bash
# 确保构建时生成了类型文件
cd /Users/fengjunlin/projects/web-reel/packages/recorder
npm run build

# 检查 dist 目录
ls -la dist/
# 应该有 index.d.ts 和 index.d.mts
```

### 问题 3: 修改代码后没有更新

```bash
# 使用 watch 模式
cd /Users/fengjunlin/projects/web-reel/packages/recorder
npm run dev  # 自动监听并重新构建

# 或手动重新构建
npm run build
```

### 问题 4: Peer dependency 警告

```bash
# 安装 rrweb 作为项目依赖
npm install rrweb@^1.1.3
```

---

## 🎯 推荐测试流程

### 第一次测试（完整验证）

```bash
# 1. 使用 npm pack 方法（最接近真实场景）
cd /Users/fengjunlin/projects/web-reel/packages/recorder
npm run build
npm pack

# 2. 在测试项目中安装
cd ~/test-project
npm install /Users/fengjunlin/projects/web-reel/packages/recorder/web-reel-recorder-1.0.0.tgz rrweb@^1.1.3

# 3. 运行所有测试检查清单
npm run dev
```

### 开发过程（快速迭代）

```bash
# 1. 使用 npm link
cd /Users/fengjunlin/projects/web-reel/packages/recorder
npm link
npm run dev  # watch 模式

# 2. 在测试项目
cd ~/test-project  
npm link @web-reel/recorder
npm run dev

# 3. 修改代码 → 自动重新构建 → 刷新浏览器
```

### 发布前（最终验证）

```bash
# 1. 清理并重新构建
cd /Users/fengjunlin/projects/web-reel/packages/recorder
npm run clean
npm install
npm run build

# 2. 运行类型检查
npm run typecheck

# 3. 使用 npm pack 测试
npm pack
# 在新的测试项目中安装并验证所有功能
```

---

## 💡 提示

1. **使用 npm link 进行开发**
   - 适合频繁修改代码
   - 实时看到效果

2. **使用 npm pack 进行发布前测试**
   - 最接近真实 npm 安装
   - 可以发现打包问题

3. **创建专门的测试项目**
   - 保持测试环境干净
   - 可以测试不同框架（React、Vue、Next.js）

4. **自动化测试脚本**
   ```bash
   # 创建 test.sh
   #!/bin/bash
   cd packages/recorder
   npm run build
   npm pack
   cd ../../test-project
   npm install ../web-reel/packages/recorder/*.tgz
   npm run dev
   ```

---

## ✅ 准备发布检查

测试通过后，发布前检查：

- [ ] 所有测试用例通过
- [ ] 在至少 2 个不同项目中测试
- [ ] TypeScript 类型完整
- [ ] README 文档完整
- [ ] package.json 信息正确
- [ ] 版本号合理
- [ ] LICENSE 文件存在
- [ ] .npmignore 或 package.json files 配置正确

准备好后就可以发布了！🚀

