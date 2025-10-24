# Jira 环境变量配置修复

## 问题描述

与 OpenAI 配置相同的问题：`CreateJiraModal` 组件在客户端使用 `isJiraConfigured()` 函数，该函数尝试读取 `process.env.JIRA_API_KEY` 和 `process.env.JIRA_USER_EMAIL`，但这些在客户端始终是 `undefined`，导致显示警告："Jira is not configured."

## 修复方案

### 1. 创建服务端配置检查 API

**新文件**: `app/api/jira/config/route.ts`

- 提供 GET 端点 `/api/jira/config`
- 在服务端读取环境变量
- 返回配置状态（不暴露实际的 API key）

```typescript
export async function GET() {
  const config = {
    hasApiKey: !!process.env.JIRA_API_KEY,
    hasUserEmail: !!process.env.JIRA_USER_EMAIL,
    domain: process.env.NEXT_PUBLIC_JIRA_DOMAIN || 'web-reel.atlassian.net',
    projectKey: process.env.NEXT_PUBLIC_JIRA_PROJECT_KEY || 'WR',
  };
  return NextResponse.json({ success: true, config });
}
```

### 2. 更新配置工具函数

**文件**: `src/config/jira.ts`

- 修改 `getEnvConfig()` 函数，在客户端不尝试读取敏感环境变量
- 新增 `checkEnvConfig()` 异步函数，通过 API 从服务端获取配置状态

```typescript
export async function checkEnvConfig(): Promise<{
  hasApiKey: boolean;
  hasUserEmail: boolean;
  domain: string;
  projectKey: string;
}> {
  const response = await fetch('/api/jira/config');
  const data = await response.json();
  return data.config;
}
```

### 3. 更新客户端组件

**文件**: `src/components/CreateJiraModal/index.tsx`

- 添加 `configStatus` 状态来跟踪配置检查
- 使用 `useEffect` 在 modal 打开时检查配置
- 优先检查 localStorage 的 runtime config
- 如果没有，通过 API 检查服务端环境变量
- 添加加载状态显示

## 创建 Jira Ticket API

### 新增 Ticket 创建端点

**新文件**: `app/api/jira/tickets/route.ts`

- 提供 POST 端点 `/api/jira/tickets`
- 在服务端创建 Jira ticket
- 直接调用 Jira REST API v3
- API 凭证在服务端安全处理

### 更新客户端服务

**文件**: `src/services/jira.ts`

- 修改 `createJiraTicket()` 函数
- 现在调用 `/api/jira/tickets` 而非直接使用 jira.js 客户端
- 移除了对 `getJiraConfig()` 的客户端调用

## 已有的 Jira API 代理

- 文件：`app/api/jira/[...path]/route.ts`
- 用于其他 Jira API 调用（如获取项目信息）
- API key 在服务端安全处理

## 验证步骤

### 1. 确认 `.env.local` 配置

检查项目根目录的 `.env.local` 文件：

```bash
# Jira 配置应该包含：
JIRA_API_KEY=ATATT3xFfGF0i4...  # 你的实际 API key
JIRA_USER_EMAIL=your.email@example.com
NEXT_PUBLIC_JIRA_DOMAIN=your-domain.atlassian.net
NEXT_PUBLIC_JIRA_PROJECT_KEY=YOUR_PROJECT
```

### 2. 重启开发服务器

**重要：** 环境变量更改需要重启！

```bash
# 停止当前服务器 (Ctrl+C)
npm run dev
```

### 3. 手动测试流程

#### 步骤 1：启动服务器

```bash
cd /Users/nickqi/tubi/web-reel
npm run dev
```

#### 步骤 2：访问 Replayer 页面

```
打开浏览器访问：http://localhost:3000/replayer/0
```

#### 步骤 3：上传 Session 文件

1. 点击 "Upload Session File" 按钮
2. 选择文件：`/Users/nickqi/Desktop/record-1761195800843.json`
3. 等待文件上传并加载

#### 步骤 4：打开 Jira Modal

1. 点击页面右上角的 "Create Jira Ticket" 按钮
2. Modal 应该打开

#### 步骤 5：验证配置状态

**预期行为：**
✅ 短暂显示 "Checking Jira configuration..." 加载状态
✅ 然后应该显示表单，没有警告信息
✅ "Create Ticket" 按钮应该是可用的（不是灰色禁用状态）

**如果配置正确，你应该看到：**

- Summary 字段：预填充 "Bug Report: Session 0"
- Description 字段：预填充详细模板
- 表单是可编辑的
- 没有警告消息

**如果配置错误，你会看到：**

- ⚠️ "Jira is not configured. Please set up your Jira credentials in .env.local file."
- 表单是禁用的（灰色）
- "Create Ticket" 按钮是禁用的

### 4. 测试创建 Ticket（可选）

如果配置正确：

1. 修改 Summary 和 Description
2. 点击 "Create Ticket"
3. 应该成功创建 Jira ticket
4. 显示成功消息和 ticket 链接

## API 端点

### GET /api/jira/config

检查 Jira 配置状态

**响应：**

```json
{
  "success": true,
  "config": {
    "hasApiKey": true,
    "hasUserEmail": true,
    "domain": "your-domain.atlassian.net",
    "projectKey": "WR"
  }
}
```

### POST /api/jira/tickets

创建 Jira ticket

**请求：**

```json
{
  "summary": "Bug Report: Issue title",
  "description": "Detailed description...",
  "issueType": "Bug"
}
```

**响应：**

```json
{
  "success": true,
  "issueKey": "WR-3",
  "issueUrl": "https://your-domain.atlassian.net/browse/WR-3"
}
```

**测试示例：**

```bash
curl -X POST http://localhost:3000/api/jira/tickets \
  -H "Content-Type: application/json" \
  -d '{"summary":"Test ticket","description":"This is a test"}'
```

### POST /api/jira/[...path]

代理其他 Jira API 请求（已存在）

- 在服务端处理认证
- 转发请求到 Jira Cloud API
- 用于其他功能（如获取项目信息、issue types 等）

## 配置优先级

1. **运行时配置 (localStorage)** - 最高优先级
   - 通过 UI 配置（如果将来添加设置页面）
   - 立即生效

2. **环境变量 `.env.local`** - 标准方式
   - 服务端配置
   - 需要重启服务器生效
   - 推荐用于生产

## 安全性

✅ **API Key 永远不离开服务器**

- 客户端代码完全不接触 API key
- 配置检查 API 只返回布尔值

✅ **所有 Jira 请求通过服务端代理**

- API 认证在服务端处理
- 客户端只调用 `/api/jira/*` 端点

✅ **符合安全最佳实践**

- 敏感凭证只在服务端处理
- `.env.local` 已在 `.gitignore` 中

## 故障排查

### 问题：Modal 显示 "Jira is not configured"

**解决方案：**

1. 检查 `.env.local` 文件是否包含所有必需的变量
2. 确认 API key 是有效的 Jira API token
3. **重启开发服务器**
4. 打开浏览器控制台查看是否有错误
5. 检查 API 端点：`http://localhost:3000/api/jira/config`

### 问题：Modal 一直显示 "Checking configuration..."

**解决方案：**

1. 打开浏览器开发者工具
2. 查看 Network 标签
3. 检查 `/api/jira/config` 请求是否失败
4. 查看 Console 标签的错误信息

### 问题：配置显示正确但创建 Ticket 失败

**解决方案：**

1. 验证 Jira API key 是否有效
2. 确认用户有创建 ticket 的权限
3. 检查项目 key 是否正确
4. 查看终端和浏览器控制台的错误信息

## 文件清单

### 新增文件

- `app/api/jira/config/route.ts` - Jira 配置检查 API
- `app/api/jira/tickets/route.ts` - **新增** Jira ticket 创建 API

### 修改的文件

- `src/config/jira.ts` - 添加 `checkEnvConfig()` 函数
- `src/components/CreateJiraModal/index.tsx` - 使用异步配置检查
- `src/services/jira.ts` - **重大修改** 使用 API 端点而非直接调用

### 已存在（保留）

- `app/api/jira/[...path]/route.ts` - Jira API 代理（用于其他 API）

## 总结

Jira 配置修复遵循与 OpenAI 相同的模式：

1. ✅ 服务端 API 检查配置状态
2. ✅ 客户端异步获取配置
3. ✅ 服务端 API 创建 Jira tickets
4. ✅ API key 永远不暴露到客户端

## 测试验证

✅ **API 端点测试成功**

```bash
$ curl -X POST http://localhost:3000/api/jira/tickets \
  -H "Content-Type: application/json" \
  -d '{"summary":"Test ticket","description":"This is a test"}'

# 响应：
{
  "success": true,
  "issueKey": "WR-3",
  "issueUrl": "https://sedna-tech.atlassian.net/browse/WR-3"
}
```

✅ Jira ticket **WR-3** 已成功创建！

现在你可以安全地使用 Jira 集成功能了！
