# OpenAI API Setup Guide

This guide will help you set up OpenAI API integration for AI-powered session analysis.

## ⚠️ Security First

**IMPORTANT**: Never commit your API key to git! Always store it in `.env.local` or configure it at runtime through the UI.

## Setup Options

You have two ways to configure your OpenAI API key:

### Option 1: Environment Variable (Recommended for Development)

1. **Create `.env.local` file** in the project root:

   ```bash
   touch .env.local
   ```

2. **Add your API key** to `.env.local`:

   ```env
   # Server-side only (more secure - not exposed to browser)
   OPENAI_API_KEY=sk-your-actual-key-here

   # Client-side (optional - defaults provided)
   # NEXT_PUBLIC_OPENAI_API_BASE=https://api.openai.com/v1
   # NEXT_PUBLIC_OPENAI_MODEL=gpt-4o-mini
   ```

3. **Restart the dev server** for changes to take effect:

   ```bash
   npm run dev
   ```

4. **Verify** that `.env.local` is in your `.gitignore` (it already is by default with `*.local`)

### Option 2: Runtime Configuration (Recommended for Production)

Configure the API key directly in the browser:

1. Open the web app
2. Go to a replay session
3. Click on the "🤖 AI Analysis" tab
4. Click "Configure OpenAI API"
5. Enter your API key and save

This stores the key in your browser's `localStorage` and never sends it to any server except OpenAI.

## Getting Your API Key

1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click "Create new secret key"
4. **Copy the key immediately** (you won't be able to see it again)
5. Store it securely

## Security Best Practices

### ✅ DO:

- Store API keys in `.env.local` (auto-ignored by git)
- Use runtime configuration for production deployments
- Set usage limits on your API key in OpenAI dashboard
- Create a separate API key for this project
- Revoke and regenerate keys if they're exposed

### ❌ DON'T:

- Never commit `.env.local` or any file with API keys
- Never hardcode API keys in source code
- Never share API keys in chat logs or screenshots
- Never commit to public repositories without checking for keys

## Testing Your Configuration

### Method 1: Use the UI Test Button

1. Configure your API key (either method above)
2. Go to Settings in the AI Analysis panel
3. Click "Test Connection"
4. You should see a success message if everything is configured correctly

### Method 2: Command Line Test

```bash
# Set your API key
export OPENAI_API_KEY="sk-your-key-here"

# Test the connection
curl https://api.openai.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Say hello"}],
    "max_tokens": 10
  }'
```

## Cost Management

The AI Analysis feature is designed to be cost-efficient:

### Token Limits

- **Analysis scope**: Last 1000 console logs + 500 network requests
- **Max response**: 2000 tokens (~$0.01 per analysis with gpt-4o-mini)
- **Optimizations**: Automatic truncation of long messages and stack traces

### Recommended Models

| Model         | Cost per Analysis | Speed   | Quality   |
| ------------- | ----------------- | ------- | --------- |
| gpt-4o-mini   | $0.01 - $0.05     | Fast    | Good ✅   |
| gpt-4         | $0.10 - $0.30     | Medium  | Excellent |
| gpt-3.5-turbo | $0.005 - $0.02    | Fastest | Basic     |

**Recommendation**: Use `gpt-4o-mini` (default) for best balance of cost and quality.

### Setting Usage Limits

Protect yourself from unexpected costs:

1. Go to [OpenAI Usage Settings](https://platform.openai.com/account/billing/limits)
2. Set a monthly budget limit (e.g., $10)
3. Enable email notifications for 50% and 80% usage
4. Monitor usage regularly

## Troubleshooting

### "API key not configured" error

**Solution**: Make sure you've either:

- Created `.env.local` with `OPENAI_API_KEY=sk-...` and restarted dev server
- Configured the API key through the UI Settings

### "Invalid API key" error

**Possible causes**:

- API key format is wrong (should start with `sk-`)
- Key was revoked in OpenAI dashboard
- Key expired or exceeded quota

**Solution**:

- Generate a new API key from OpenAI dashboard
- Update your configuration

### "Rate limit exceeded" error

**Cause**: You've exceeded OpenAI's rate limits

**Solution**:

- Wait a few minutes and try again
- Upgrade your OpenAI account tier
- Reduce analysis frequency

### "Network error" or "Connection refused"

**Possible causes**:

- No internet connection
- Firewall blocking OpenAI API
- Using wrong API base URL

**Solution**:

- Check your internet connection
- If using a proxy, configure `NEXT_PUBLIC_OPENAI_API_BASE`
- Check firewall settings

## Example Configuration Files

### `.env.local` (Development)

```env
# OpenAI Configuration
# Server-side only (more secure)
OPENAI_API_KEY=sk-proj-abc123...

# Client-side (optional)
# NEXT_PUBLIC_OPENAI_API_BASE=https://api.openai.com/v1
# NEXT_PUBLIC_OPENAI_MODEL=gpt-4o-mini

# Optional: Use Azure OpenAI instead
# NEXT_PUBLIC_OPENAI_API_BASE=https://your-resource.openai.azure.com/openai/deployments/your-deployment
# NEXT_PUBLIC_OPENAI_MODEL=gpt-4
```

### Runtime Config (Production)

The runtime configuration is stored in `localStorage` with this structure:

```json
{
  "apiKey": "sk-...",
  "apiBase": "https://api.openai.com/v1",
  "model": "gpt-4o-mini"
}
```

You can inspect it in browser DevTools:

```javascript
localStorage.getItem('web-reel-openai-config');
```

## Advanced: Using Proxy or Custom Endpoints

If you're using a proxy or Azure OpenAI:

```env
# Azure OpenAI
NEXT_PUBLIC_OPENAI_API_BASE=https://your-resource.openai.azure.com/openai/deployments/your-deployment
OPENAI_API_KEY=your-azure-key

# Custom Proxy
NEXT_PUBLIC_OPENAI_API_BASE=https://your-proxy.com/v1
OPENAI_API_KEY=your-key
```

## Need Help?

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [OpenAI API Status](https://status.openai.com/)
- [OpenAI Support](https://help.openai.com/)

---

**Remember**: Keep your API keys secure! 🔐
