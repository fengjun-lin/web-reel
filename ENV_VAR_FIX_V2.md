# 环境变量配置修复 v2.0 - 服务端API代理

## 问题描述

### 原始问题

在 Next.js 中，只有 `NEXT_PUBLIC_` 前缀的环境变量才会暴露给浏览器/客户端。`OPENAI_API_KEY` 出于安全考虑没有这个前缀，导致：

1. Settings 页面显示 "Not Configured"
2. AI Analysis 面板无法使用

### v1 修复的局限性

v1 修复了UI显示问题，但存在**严重的安全隐患**：

- 客户端代码直接调用 OpenAI API
- 即使能访问环境变量，也会将 API key 暴露到浏览器
- 这违反了安全最佳实践

## v2.0 解决方案：服务端API代理

### 架构改进

```
之前（不安全）:
Browser → OpenAI API (API key 在客户端)

现在（安全）:
Browser → Next.js API Route → OpenAI API (API key 只在服务端)
```

### 核心改进

#### 1. 创建服务端API代理

**新文件**: `app/api/openai/chat/route.ts`

- 提供 POST 端点 `/api/openai/chat`
- 在服务端安全地读取 `OPENAI_API_KEY`
- 代理请求到 OpenAI API
- 支持流式和非流式响应

#### 2. 更新客户端服务

**文件**: `src/services/openai.ts`

- `chatCompletion()` 现在调用我们的 API 代理而非直接调用 OpenAI
- 移除了客户端对 `getOpenAIConfig()` 的依赖
- API key 永远不会暴露到浏览器

#### 3. 配置状态检查（已在 v1 完成）

- `app/api/openai/config/route.ts` - 检查服务端配置状态
- `src/config/openai.ts` - 添加 `checkEnvConfig()` 函数
- 各组件使用异步API检查配置状态

## 配置步骤

### 1. 设置 OpenAI API Key

编辑 `.env.local` 文件（已在项目根目录）：

```bash
# 将占位符替换为你的真实 API key
OPENAI_API_KEY=sk-proj-your-actual-api-key-here

# 可选：自定义 API 端点和模型
NEXT_PUBLIC_OPENAI_API_BASE=https://api.openai.com/v1
NEXT_PUBLIC_OPENAI_MODEL=gpt-4o-mini
```

**如何获取 OpenAI API Key:**

1. 访问 https://platform.openai.com/api-keys
2. 点击 "Create new secret key"
3. 复制生成的 key（以 `sk-` 开头）

### 2. 重启开发服务器

**重要：** 环境变量更改需要重启服务器！

```bash
# 停止当前服务器 (Ctrl+C)
# 重新启动
npm run dev
```

### 3. 验证配置

#### 方法 1：通过 Settings 页面

1. 访问 http://localhost:3000/settings
2. 应该看到 "Configured" ✅
3. 点击 "Test Connection" 按钮测试

#### 方法 2：通过 AI Analysis

1. 上传 session 文件到 http://localhost:3000/replayer/0
2. 点击 "AI Analysis" 标签
3. 点击 "Start Analysis" 按钮
4. 应该能看到 AI 分析结果

## 安全性优势

### v2.0 安全改进

✅ **API Key 永远不离开服务器**

- 客户端代码完全不接触 API key
- 即使浏览器被攻击，API key 也不会泄露

✅ **符合安全最佳实践**

- 敏感凭证只在服务端处理
- 客户端只调用自己的 API

✅ **便于监控和控制**

- 所有 OpenAI 请求都经过我们的服务器
- 可以添加速率限制、日志、使用量跟踪等

### 其他安全措施

- `.env.local` 已在 `.gitignore` 中，不会提交到代码库
- 配置状态 API 只返回布尔值，不返回实际的 key
- 支持运行时配置（localStorage）用于开发测试

## API 端点

### POST /api/openai/chat

代理 OpenAI chat completion 请求

**请求体：**

```json
{
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." }
  ],
  "temperature": 0.7,
  "maxTokens": 2000,
  "stream": false
}
```

**响应：**

```json
{
  "success": true,
  "content": "AI response...",
  "usage": {
    "promptTokens": 100,
    "completionTokens": 200,
    "totalTokens": 300
  }
}
```

### GET /api/openai/config

检查 OpenAI 配置状态（不返回实际的 key）

**响应：**

```json
{
  "success": true,
  "config": {
    "hasApiKey": true,
    "apiBase": "https://api.openai.com/v1",
    "model": "gpt-4o-mini"
  }
}
```

## 配置优先级

1. **环境变量 `.env.local`** - 推荐用于生产
   - 服务端配置
   - 需要重启服务器生效
   - 最安全

2. **运行时配置 (localStorage)** - 可选，用于测试
   - 通过 Settings 页面配置
   - 立即生效
   - 存储在浏览器本地

## 故障排查

### 问题：Settings 页面显示 "Not Configured"

**解决：**

1. 检查 `.env.local` 文件是否存在且包含 `OPENAI_API_KEY`
2. 确认 API key 以 `sk-` 开头
3. **重启开发服务器**

### 问题：点击 "Test Connection" 失败

**解决：**

1. 检查 API key 是否有效（在 OpenAI 控制台验证）
2. 检查网络连接
3. 查看浏览器控制台和终端的错误信息

### 问题：AI Analysis 显示 "Not Configured"

**解决：**

1. 先在 Settings 页面验证配置
2. 确认已重启服务器
3. 刷新页面

## 测试文件

用户提供的测试文件位置：

```
/Users/nickqi/Desktop/record-1761195800843.json
```

测试步骤：

1. 启动服务器：`npm run dev`
2. 访问：http://localhost:3000/replayer/0
3. 点击 "Upload Session File" 上传测试文件
4. 切换到 "AI Analysis" 标签
5. 点击 "Start Analysis" 开始分析

## 相关文件

### 新增/修改的文件

- `app/api/openai/chat/route.ts` - **新增** OpenAI API 代理
- `app/api/openai/config/route.ts` - 配置状态检查 API
- `src/services/openai.ts` - **重大修改** 使用 API 代理
- `src/config/openai.ts` - 添加 `checkEnvConfig()` 函数
- `src/components/OpenAISettings/index.tsx` - UI 配置检查
- `src/components/ConfigViewer/index.tsx` - 配置查看器
- `src/components/AIAnalysisPanel/index.tsx` - AI 分析面板
- `.env.local` - **需要配置** 添加真实的 API key

### 修复的页面

- ✅ `/settings` - 设置页面
- ✅ `/replayer/[id]` - Replayer 页面的 AI Analysis 标签

## 成本估算

使用 `gpt-4o-mini` (推荐):

- 每次分析约 $0.01-0.05
- 适合日常使用

使用 `gpt-4`:

- 每次分析约 $0.10-0.30
- 更强大但更昂贵

实际成本取决于分析的数据量。我们限制了分析数据量以控制成本：

- 最多 1000 条日志
- 最多 500 个网络请求
