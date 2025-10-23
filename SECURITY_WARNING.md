# ⚠️ 重要安全警告：API Key 安全

## 🚨 你的 API Key 已经泄露！

在我们的对话中，你直接发送了完整的 OpenAI API Key。这个 Key 现在已经不安全了。

## 立即采取行动

### 第一步：撤销泄露的 API Key

1. **立即访问** [OpenAI API Keys](https://platform.openai.com/api-keys)
2. **登录**你的账户
3. **找到**泄露的 Key（以 `sk-proj-ASWZ` 开头的那个）
4. **点击删除/撤销**按钮
5. **确认删除**

### 第二步：生成新的 API Key

1. 在同一个页面点击 **"Create new secret key"**
2. 给它一个名字（如 "web-reel-local"）
3. **立即复制**新生成的 Key（你只能看到一次）
4. **安全存储**这个 Key

### 第三步：配置新的 API Key

选择以下方法之一：

#### 方法 A: 使用环境变量（推荐）

```bash
# 在项目根目录创建 .env.local
echo "VITE_OPENAI_API_KEY=sk-你的新key" > .env.local

# 重启开发服务器
npm run dev
```

#### 方法 B: 使用 UI 配置

1. 打开应用
2. 点击 **Settings**
3. 输入新的 API Key
4. 点击保存

## 📋 安全检查清单

### ✅ 必须做的事情

- [ ] 撤销泄露的 API Key
- [ ] 生成新的 API Key
- [ ] 确认 `.env.local` 在 `.gitignore` 中（已配置 ✓）
- [ ] 永远不要在代码中硬编码 API Key
- [ ] 永远不要提交 API Key 到 git
- [ ] 设置 OpenAI 账户的月度预算限制

### ❌ 绝对不能做的事情

- [ ] ❌ 在聊天中分享 API Key
- [ ] ❌ 在截图中包含 API Key
- [ ] ❌ 提交 `.env.local` 到 git
- [ ] ❌ 在公开的 issue 或 PR 中提到 API Key
- [ ] ❌ 使用公司的主 API Key 进行测试

## 🛡️ 未来如何避免泄露

### 1. 使用占位符

当需要帮助时，使用占位符：
```
我的 API key 是: sk-xxx...xxx（已隐藏）
```

### 2. 环境变量检查

在提交前检查：
```bash
# 查找可能的 API Key
git grep -i "sk-proj" 
git grep -i "OPENAI_API_KEY.*sk-"
```

### 3. 预提交钩子

创建 `.git/hooks/pre-commit`:
```bash
#!/bin/bash
if git diff --cached | grep -i "sk-proj\|sk-[A-Za-z0-9]\{20,\}"; then
    echo "❌ 检测到可能的 API Key，提交已阻止！"
    exit 1
fi
```

### 4. 使用环境变量管理工具

- [direnv](https://direnv.net/) - 自动加载 .envrc
- [dotenv-vault](https://www.dotenv.org/) - 加密的环境变量
- [1Password CLI](https://developer.1password.com/docs/cli) - 密钥管理

## 🔐 API Key 最佳实践

### 开发环境

```env
# .env.local （不要提交！）
VITE_OPENAI_API_KEY=sk-你的开发key
```

### 生产环境

- 使用 UI 的运行时配置
- 或者使用环境变量管理服务（如 AWS Secrets Manager）
- 永远不要在前端代码中硬编码

### 测试环境

- 创建专门的测试 API Key
- 设置严格的速率限制
- 设置低的月度预算（如 $5）

## 📊 设置使用限制

为防止意外高额费用：

1. 访问 [OpenAI Billing Settings](https://platform.openai.com/account/billing/limits)
2. 设置 **Hard Limit**（硬限制）：如 $10/月
3. 设置 **Soft Limit**（软限制）：如 $5/月
4. 启用邮件通知：
   - [ ] 50% 用量提醒
   - [ ] 80% 用量提醒
   - [ ] 100% 用量提醒

## 🚨 如果发现 API Key 泄露

### 立即行动（5分钟内）

1. **撤销 Key**（见上方步骤）
2. **检查用量**：https://platform.openai.com/usage
3. **查看异常**：是否有未授权的请求

### 后续跟进（24小时内）

1. **生成新 Key**
2. **更新所有使用该 Key 的地方**
3. **审查代码**：确保没有其他 Key 泄露
4. **更新 `.gitignore`**
5. **设置预算限制**

### 预防措施（长期）

1. **定期轮换** API Key（每月）
2. **监控使用情况**（每周）
3. **审查代码提交**（每次）
4. **教育团队成员**（持续）

## 📞 需要帮助？

如果你发现了可疑活动或大额账单：

1. **OpenAI Support**: https://help.openai.com/
2. **账单争议**: https://platform.openai.com/account/billing
3. **紧急情况**: 立即联系 OpenAI 支持团队

## 🎓 安全资源

- [OpenAI API Keys Best Practices](https://platform.openai.com/docs/guides/safety-best-practices)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [OWASP API Security](https://owasp.org/www-project-api-security/)

---

## ✅ 完成检查

在继续使用之前，请确认：

- [ ] 我已经撤销了泄露的 API Key
- [ ] 我已经生成了新的 API Key
- [ ] 我已经配置了新的 Key（.env.local 或 UI）
- [ ] 我已经设置了使用限制
- [ ] 我理解了如何安全地管理 API Key
- [ ] 我知道未来如何避免泄露

---

**记住**：API Key 就像密码一样重要，永远不要分享！🔐

