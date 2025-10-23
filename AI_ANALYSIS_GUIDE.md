# AI 分析功能使用指南

## 功能简介

Web-Reel 现在集成了 AI 驱动的会话分析功能，可以自动分析录制的会话中的错误和问题，并提供修复建议。

## 核心特性

### 🎯 智能分析

- **自动识别错误**：检测 Console 中的 error 和 warning
- **网络问题诊断**：分析 4xx/5xx 错误请求
- **根因分析**：追溯问题的根本原因
- **关联分析**：发现错误之间的因果关系
- **修复建议**：提供具体的解决方案

### 🔒 安全优先

- API Key 本地存储（localStorage 或 .env.local）
- 不会上传到任何服务器（除了 OpenAI）
- 支持运行时配置，无需修改代码
- 完全透明的数据处理

### 💰 成本优化

- 只分析最近的 1000 条日志和 500 个请求
- 自动截断过长的内容
- 使用 gpt-4o-mini（成本约 $0.01-0.05/次）
- 可配置使用其他模型

## 快速开始

### 步骤 1: 配置 API Key

**⚠️ 重要安全提示**：

- 永远不要在代码中硬编码 API Key
- 永远不要提交 `.env.local` 到 git
- 如果 API Key 泄露，立即到 OpenAI 官网撤销

#### 方法 A: 环境变量（推荐用于开发）

1. 在项目根目录创建 `.env.local` 文件：

   ```bash
   touch .env.local
   ```

2. 添加你的 API Key：

   ```env
   VITE_OPENAI_API_KEY=sk-你的实际key
   ```

3. 重启开发服务器：
   ```bash
   npm run dev
   ```

#### 方法 B: 运行时配置（推荐用于生产）

1. 打开应用
2. 点击顶部菜单的 **Settings**
3. 输入你的 API Key 并保存
4. 点击 "Test Connection" 确认配置成功

### 步骤 2: 使用 AI 分析

1. 上传或加载一个会话录制
2. 点击右侧的 **🤖 AI Analysis** 标签
3. 点击 **Start Analysis** 按钮
4. 等待 10-30 秒，AI 将生成详细的分析报告

## 分析内容

AI 会分析以下数据：

### 1. Console 错误

- 错误信息
- 堆栈追踪
- 发生时间
- 上下文日志

### 2. Console 警告

- 警告信息
- 警告类型
- 出现频率

### 3. 网络错误

- 请求 URL
- HTTP 状态码
- 请求/响应内容
- 错误发生时间

### 4. 时间线

- 事件发生顺序
- 错误之间的时间关系
- 关键操作路径

## 分析报告内容

AI 生成的报告包含：

### 1. 根因分析 (Root Cause Analysis)

- 问题的主要原因
- 首次失败点
- 关键错误识别

### 2. 错误关联 (Error Correlation)

- 错误之间的关系
- 因果链条
- 级联失败分析

### 3. 影响评估 (Impact Assessment)

- 致命错误（阻塞用户流程）
- 一般错误（影响体验）
- 轻微警告（可忽略）

### 4. 修复建议 (Fix Suggestions)

- 代码修改建议
- 配置调整
- API 修复
- 具体的代码示例

### 5. 预防措施 (Prevention)

- 代码改进建议
- 错误处理优化
- 监控告警建议

## 成本估算

| 模型          | 单次分析成本   | 速度 | 质量 | 推荐     |
| ------------- | -------------- | ---- | ---- | -------- |
| gpt-4o-mini   | $0.01 - $0.05  | 快   | 好   | ✅ 推荐  |
| gpt-4         | $0.10 - $0.30  | 中   | 优秀 | 复杂问题 |
| gpt-3.5-turbo | $0.005 - $0.02 | 最快 | 基础 | 简单问题 |

### 成本控制建议

1. **设置月度预算**：
   - 访问 https://platform.openai.com/account/billing/limits
   - 设置每月限额（如 $10）
   - 启用 50% 和 80% 用量提醒

2. **选择合适的模型**：
   - 开发阶段：gpt-4o-mini（默认）
   - 复杂问题：gpt-4
   - 简单问题：gpt-3.5-turbo

3. **控制分析频率**：
   - 只在必要时使用（如生产环境问题）
   - 不要对每个会话都进行分析
   - 优先分析有明显错误的会话

## 安全最佳实践

### ✅ 应该做的：

1. **使用 `.env.local` 存储 API Key**（开发环境）
2. **使用运行时配置**（生产环境）
3. **为此项目创建专用 API Key**
4. **设置使用限额**
5. **定期检查用量**
6. **如果 Key 泄露，立即撤销并重新生成**

### ❌ 不应该做的：

1. **不要硬编码 API Key 到代码中**
2. **不要提交 `.env.local` 到 git**
3. **不要在聊天记录或截图中分享 API Key**
4. **不要将 API Key 提交到公开仓库**
5. **不要使用公司的主 API Key**

## 故障排查

### 问题: "API key not configured"

**原因**：未配置 API Key

**解决方案**：

- 检查 `.env.local` 是否存在并包含正确的 Key
- 重启开发服务器
- 或者通过 UI 配置运行时 Key

### 问题: "Invalid API key"

**原因**：API Key 格式错误或已撤销

**解决方案**：

- 确认 Key 以 `sk-` 开头
- 检查是否在 OpenAI 官网撤销了这个 Key
- 生成新的 API Key

### 问题: "Rate limit exceeded"

**原因**：超过了 OpenAI 的速率限制

**解决方案**：

- 等待几分钟后重试
- 升级 OpenAI 账户层级
- 减少分析频率

### 问题: 分析结果不准确

**可能原因**：

- 数据不足（日志太少）
- 错误信息不够详细
- 使用了成本较低的模型

**解决方案**：

- 确保会话包含完整的错误信息
- 尝试使用 gpt-4 模型
- 手动补充更多上下文信息

## 技术架构

### 组件结构

```
src/
├── config/
│   └── openai.ts              # OpenAI 配置管理
├── services/
│   └── openai.ts              # OpenAI API 服务
├── utils/
│   └── analysisHelper.ts      # 数据准备工具
├── components/
│   ├── AIAnalysisPanel/       # AI 分析面板
│   └── OpenAISettings/        # 设置界面
└── pages/
    ├── replay/                # 会话回放页面
    └── settings/              # 设置页面
```

### 数据流

1. **数据收集**：从 rrweb 录制中提取 console 和 network 数据
2. **数据过滤**：只保留最近的 N 条数据和所有错误
3. **数据格式化**：转换为 AI 友好的格式
4. **提示词构建**：生成结构化的分析请求
5. **API 调用**：发送到 OpenAI
6. **结果渲染**：以 Markdown 格式展示

### 安全措施

- API Key 存储在 `localStorage`（运行时）或 `.env.local`（开发）
- 通过 `.gitignore` 阻止 `.env.local` 提交
- 客户端直接调用 OpenAI API（不经过后端）
- 支持自定义 API Base URL（可使用代理）

## 高级配置

### 使用代理或 Azure OpenAI

如果需要使用代理或 Azure OpenAI：

```env
# 使用代理
VITE_OPENAI_API_BASE=https://your-proxy.com/v1
VITE_OPENAI_API_KEY=your-key

# 使用 Azure OpenAI
VITE_OPENAI_API_BASE=https://your-resource.openai.azure.com/openai/deployments/your-deployment
VITE_OPENAI_API_KEY=your-azure-key
```

### 自定义分析参数

编辑 `src/components/AIAnalysisPanel/index.tsx`:

```typescript
const data = prepareAnalysisData(logs, requests, {
  logLimit: 1000, // 调整日志数量
  requestLimit: 500, // 调整请求数量
  includeStackTrace: true, // 是否包含堆栈
});
```

编辑 `src/services/openai.ts`:

```typescript
const result = await chatCompletion({
  temperature: 0.3, // 调整创造性（0-2）
  maxTokens: 2000, // 调整响应长度
});
```

## 实际使用案例

### 案例 1: 前端错误追踪

**场景**：用户报告页面崩溃

**操作**：

1. 加载用户的会话录制
2. 查看有 12 个 console errors
3. 点击 AI Analysis
4. AI 识别出：
   - 根因：未处理的 Promise rejection
   - 影响：导致 React 组件崩溃
   - 修复：添加 try-catch 和 error boundary

**结果**：10 秒内获得可执行的修复方案

### 案例 2: API 错误诊断

**场景**：用户无法登录

**操作**：

1. 加载用户的会话录制
2. 查看有 3 个 401 network errors
3. 点击 AI Analysis
4. AI 识别出：
   - 根因：Token 过期
   - 关联：连续 3 次调用都失败
   - 修复：实现 token 刷新机制

**结果**：快速定位到认证流程问题

### 案例 3: 性能问题分析

**场景**：页面加载缓慢

**操作**：

1. 加载会话录制
2. 查看有多个 warning 和慢请求
3. 点击 AI Analysis
4. AI 识别出：
   - 根因：大量同步请求
   - 影响：阻塞主线程
   - 建议：使用并行请求和 lazy loading

**结果**：获得优化建议和实现方案

## 开发者 API

### 编程式调用 AI 分析

```typescript
import { chatCompletion } from '@/services/openai';
import { prepareAnalysisData, buildAnalysisPrompt } from '@/utils/analysisHelper';

// 准备数据
const data = prepareAnalysisData(logs, requests);

// 构建提示词
const prompt = buildAnalysisPrompt(data);

// 调用 OpenAI
const result = await chatCompletion({
  messages: [
    { role: 'system', content: 'You are a debugging expert.' },
    { role: 'user', content: prompt },
  ],
  temperature: 0.3,
  maxTokens: 2000,
});

console.log(result.content); // AI 分析结果
```

### 自定义分析逻辑

```typescript
// 只分析 errors，不分析 warnings
const data = prepareAnalysisData(logs, requests, {
  logLimit: 1000,
  requestLimit: 500,
  includeStackTrace: true,
});

// 过滤掉 warnings
data.warnings = [];

// 自定义提示词
const customPrompt = `
分析以下错误：
${JSON.stringify(data.errors, null, 2)}

只关注：
1. 致命错误
2. 用户无法继续操作的问题
`;

const result = await chatCompletion({
  messages: [{ role: 'user', content: customPrompt }],
});
```

## 常见问题 (FAQ)

**Q: AI 分析安全吗？会泄露数据吗？**

A: 数据只发送到 OpenAI API，不经过我们的服务器。但请注意，OpenAI 会暂时处理你的数据。如果处理敏感信息，请在使用前脱敏。

**Q: 每次分析要多少钱？**

A: 使用 gpt-4o-mini 约 $0.01-0.05/次，具体取决于数据量。建议设置月度预算防止意外开支。

**Q: 可以离线使用吗？**

A: 不可以，必须连接到 OpenAI API。未来可能支持本地 LLM。

**Q: 支持其他语言的错误分析吗？**

A: 是的，OpenAI 支持多语言。你可以在提示词中指定语言。

**Q: 分析不准确怎么办？**

A: 尝试：

1. 使用更好的模型（gpt-4）
2. 提供更多上下文
3. 手动补充问题描述

**Q: 可以批量分析多个会话吗？**

A: 目前不支持，但你可以通过 API 自己实现批量分析。

## 未来计划

- [ ] 支持本地 LLM（Ollama）
- [ ] 批量分析多个会话
- [ ] 历史分析记录保存
- [ ] 分析报告导出（PDF/Markdown）
- [ ] 自定义分析模板
- [ ] 团队协作分析
- [ ] AI 辅助的问题复现建议

## 参考资源

- [OpenAI API 文档](https://platform.openai.com/docs)
- [OpenAI 定价](https://openai.com/pricing)
- [API Key 管理](https://platform.openai.com/api-keys)
- [使用限制](https://platform.openai.com/account/limits)

## 支持

如有问题或建议，请：

1. 查看本文档的故障排查部分
2. 查看 `OPENAI_SETUP.md` 获取配置帮助
3. 提交 Issue 到项目仓库

---

**记住**：保护好你的 API Key！🔐
