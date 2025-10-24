# 环境变量配置修复说明

## 问题描述

在 Next.js 中，只有 `NEXT_PUBLIC_` 前缀的环境变量才会暴露给浏览器/客户端。没有该前缀的环境变量（如 `OPENAI_API_KEY`）只能在服务端访问。

之前的实现在客户端组件中直接读取 `process.env.OPENAI_API_KEY`，导致该值在客户端始终为 `undefined`，从而显示 "Not Configured" 状态。

## 修复方案

### 1. 创建服务端 API 端点

**文件**: `app/api/openai/config/route.ts`

- 提供一个 GET 端点 `/api/openai/config`
- 在服务端读取环境变量
- 返回配置状态（不暴露实际的 API key）

### 2. 更新配置工具函数

**文件**: `src/config/openai.ts`

- 修改 `getEnvConfig()` 函数，在客户端不尝试读取 `OPENAI_API_KEY`
- 新增 `checkEnvConfig()` 异步函数，通过 API 从服务端获取配置状态

### 3. 更新客户端组件

**文件**: `src/components/OpenAISettings/index.tsx`

- 使用 `useEffect` 在组件挂载时调用 `checkEnvConfig()`
- 添加加载状态显示
- 在保存/清除配置后刷新状态

**文件**: `src/components/ConfigViewer/index.tsx`

- 同样使用 `useEffect` 获取服务端配置状态
- 显示加载状态和正确的配置信息

**文件**: `src/components/AIAnalysisPanel/index.tsx`

- 在组件挂载时检查配置状态（优先检查 localStorage，然后检查环境变量）
- 添加加载状态，避免显示错误的 "Not Configured" 状态
- 只有在配置确认后才显示分析按钮

## 验证方法

1. **确保 `.env.local` 文件存在并配置了 API key**:

   ```bash
   # 在项目根目录创建 .env.local 文件
   OPENAI_API_KEY=sk-your-actual-api-key-here
   NEXT_PUBLIC_OPENAI_API_BASE=https://api.openai.com/v1
   NEXT_PUBLIC_OPENAI_MODEL=gpt-4o-mini
   ```

2. **重启开发服务器**（环境变量更改需要重启）:

   ```bash
   npm run dev
   ```

3. **访问 Settings 页面**:

   ```
   http://localhost:3000/settings
   ```

4. **检查配置状态**:
   - Configuration Status 应该显示 "Configured" ✅
   - 如果配置了 `.env.local`，应该显示 "Using API key from environment variables (.env.local)"
   - 在 "Status View" 标签页中，环境变量部分应该显示 "Set"

5. **测试连接**:
   - 点击 "Test Connection" 按钮
   - 应该成功连接到 OpenAI API

## 配置优先级

1. **浏览器 localStorage** (最高优先级)
   - 通过 Settings 页面配置的运行时配置
   - 立即生效，无需重启

2. **环境变量 `.env.local`** (备用)
   - 服务端配置
   - 需要重启服务器生效

如果两者都配置了，localStorage 的配置会覆盖环境变量。

## 安全性说明

- ✅ API key 不会暴露到客户端代码中
- ✅ API 端点只返回配置状态（布尔值），不返回实际的 API key
- ✅ `.env.local` 文件已在 `.gitignore` 中，不会提交到代码库

## 相关文件

- `app/api/openai/config/route.ts` - 服务端配置 API
- `src/config/openai.ts` - 配置管理工具函数
- `src/components/OpenAISettings/index.tsx` - 设置页面组件
- `src/components/ConfigViewer/index.tsx` - 配置查看组件
- `src/components/AIAnalysisPanel/index.tsx` - AI 分析面板组件

## 已修复的页面

- ✅ `/settings` - 设置页面配置状态显示
- ✅ `/replayer/[id]` - Replayer 页面的 AI Analysis 标签页
