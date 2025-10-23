# 🚀 快速开始使用 AI 分析

## 超简单配置（只需 30 秒）

### 方法 1：一键配置脚本 ⚡（推荐）

```bash
# 运行配置脚本
./scripts/setup-openai.sh
```

脚本会引导你：
1. 输入 API Key（会隐藏显示）
2. 选择模型（默认 gpt-4o-mini）
3. 自动创建 `.env.local` 文件
4. 完成！✅

### 方法 2：手动创建配置文件

```bash
# 创建 .env.local 文件
echo 'VITE_OPENAI_API_KEY=sk-你的key' > .env.local

# 重启开发服务器
npm run dev
```

### 方法 3：使用 UI 配置（无需重启）

1. 启动应用：`npm run dev`
2. 点击顶部菜单 **Settings**
3. 输入 API Key 并保存
4. 完成！✅

---

## 📍 配置存储位置

### 文件配置（`.env.local`）
```
位置: /Users/fengjunlin/projects/web-reel/.env.local
优点: 永久保存，自动加载
状态: ✅ 已在 .gitignore 中，安全
```

### 浏览器配置（localStorage）
```
位置: 浏览器 localStorage
Key:  web-reel-openai-config
优点: 无需重启，即时生效
查看: 
  1. 打开浏览器 Console (F12)
  2. 输入: localStorage.getItem('web-reel-openai-config')
  3. 或使用: JSON.parse(localStorage.getItem('web-reel-openai-config'))
```

---

## 🔍 查看当前配置

```bash
# 运行检查脚本
./scripts/check-openai.sh
```

这会显示：
- `.env.local` 文件是否存在
- 当前配置内容（API Key 会隐藏显示）
- 浏览器 localStorage 配置状态
- 开发服务器运行状态

---

## 🎯 快速测试

```bash
# 1. 配置 API Key
./scripts/setup-openai.sh

# 2. 启动开发服务器
npm run dev

# 3. 打开浏览器
# http://localhost:5173

# 4. 测试 AI 分析
# - 加载一个会话
# - 点击 "🤖 AI Analysis" 标签
# - 点击 "Start Analysis"
```

---

## 💾 配置持久性

| 配置方式 | 存储位置 | 持久性 | 优先级 |
|---------|---------|--------|--------|
| `.env.local` | 文件系统 | ✅ 永久（直到删除文件） | 低 |
| localStorage | 浏览器 | ✅ 永久（直到清除浏览器数据） | 高 |

**注意**：如果同时配置了两者，**localStorage 优先**！

---

## 🔄 修改配置

### 修改文件配置
```bash
# 方法 1: 重新运行配置脚本
./scripts/setup-openai.sh

# 方法 2: 直接编辑文件
nano .env.local

# 方法 3: 删除后重新配置
rm .env.local
./scripts/setup-openai.sh
```

### 修改浏览器配置
```bash
# 方法 1: 通过 UI 修改
# Settings -> 输入新的 API Key -> 保存

# 方法 2: 通过 Console 修改
localStorage.setItem('web-reel-openai-config', JSON.stringify({
  apiKey: 'sk-新的key',
  apiBase: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini'
}))

# 方法 3: 清除浏览器配置
localStorage.removeItem('web-reel-openai-config')
```

---

## 🗑️ 删除配置

### 删除文件配置
```bash
rm .env.local
```

### 删除浏览器配置
```javascript
// 在浏览器 Console 中运行
localStorage.removeItem('web-reel-openai-config')
```

### 或者通过 UI 删除
Settings -> Clear Configuration

---

## 🛠️ 故障排查

### 问题：配置后还是提示 "Not Configured"

**检查步骤**：
```bash
# 1. 检查配置文件
cat .env.local

# 2. 检查浏览器配置
# 浏览器 Console: 
localStorage.getItem('web-reel-openai-config')

# 3. 检查环境变量是否生效
# 重启开发服务器
npm run dev

# 4. 使用检查脚本
./scripts/check-openai.sh
```

### 问题：不知道配置存在哪里

```bash
# 运行检查脚本查看所有配置
./scripts/check-openai.sh
```

### 问题：想切换到另一个 API Key

```bash
# 最简单的方法：重新运行配置脚本
./scripts/setup-openai.sh
# 选择覆盖现有配置
```

---

## 📖 完整示例

### 场景：全新安装后首次配置

```bash
# 1. 进入项目目录
cd /Users/fengjunlin/projects/web-reel

# 2. 运行配置脚本
./scripts/setup-openai.sh
# 按提示输入 API Key

# 3. 启动开发服务器
npm run dev

# 4. 打开浏览器访问
open http://localhost:5173

# 5. 加载一个会话并测试 AI 分析
# 完成！✅
```

### 场景：更换 API Key

```bash
# 方法 1: 重新运行配置脚本（最简单）
./scripts/setup-openai.sh
# 选择覆盖

# 方法 2: 编辑配置文件
nano .env.local
# 修改 VITE_OPENAI_API_KEY=sk-新的key
# 保存并重启服务器

# 方法 3: 通过 UI 修改（无需重启）
# Settings -> 输入新 API Key -> 保存
```

### 场景：检查当前使用的配置

```bash
# 运行检查脚本
./scripts/check-openai.sh
```

或在浏览器 Console 中：
```javascript
// 查看配置来源
const envConfig = {
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  apiBase: import.meta.env.VITE_OPENAI_API_BASE,
  model: import.meta.env.VITE_OPENAI_MODEL
}

const localStorageConfig = JSON.parse(
  localStorage.getItem('web-reel-openai-config') || 'null'
)

console.log('环境变量配置:', envConfig)
console.log('localStorage 配置:', localStorageConfig)
console.log('最终使用:', localStorageConfig || envConfig)
```

---

## 🎉 总结

**最简单的方式**：
```bash
./scripts/setup-openai.sh
```

**配置存储位置**：
- 文件：`.env.local`（永久）
- 浏览器：`localStorage['web-reel-openai-config']`（永久）

**查看配置**：
```bash
./scripts/check-openai.sh
```

**就是这么简单！** 🚀

