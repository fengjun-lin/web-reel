# Vercel Deployment Guide

This document describes how to deploy the Web Reel project to Vercel.

## Prerequisites

1. A [Vercel](https://vercel.com) account
2. An [OpenAI API Key](https://platform.openai.com/api-keys) (if you need AI analysis features)
3. [Vercel CLI](https://vercel.com/docs/cli) installed (optional, for local testing)

## Quick Deployment Steps

### Method 1: Via Vercel Dashboard (Recommended)

1. **Login to Vercel**
   - Visit [vercel.com](https://vercel.com)
   - Sign in with your GitHub/GitLab/Bitbucket account

2. **Import Project**
   - Click "New Project"
   - Select your Git repository (you need to push code to GitHub/GitLab/Bitbucket first)
   - Or import this project directly

3. **Configure Project**
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (keep default)
   - **Build Command**: `cd packages/recorder && npm install && cd ../.. && npm run build:all`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **Configure Environment Variables**
   Click "Environment Variables" and add the following:

   | Variable Name          | Value                       | Description                    |
   | ---------------------- | --------------------------- | ------------------------------ |
   | `VITE_OPENAI_API_KEY`  | `sk-your-api-key`           | OpenAI API key (required)      |
   | `VITE_OPENAI_API_BASE` | `https://api.openai.com/v1` | OpenAI API base URL (optional) |
   | `VITE_OPENAI_MODEL`    | `gpt-4o-mini`               | OpenAI model name (optional)   |

5. **Deploy**
   - Click the "Deploy" button
   - Wait for build and deployment to complete (usually 2-5 minutes)
   - After successful deployment, you'll get a `.vercel.app` domain

### Method 2: Via Vercel CLI

1. **Install Vercel CLI**

   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**

   ```bash
   vercel login
   ```

3. **First Deployment**

   ```bash
   vercel
   ```

   Follow the prompts:
   - Select scope (personal or team)
   - Confirm project name
   - Confirm project path
   - No need to modify default settings

4. **Configure Environment Variables**

   ```bash
   # Production environment
   vercel env add VITE_OPENAI_API_KEY production
   vercel env add VITE_OPENAI_API_BASE production
   vercel env add VITE_OPENAI_MODEL production

   # Preview environment
   vercel env add VITE_OPENAI_API_KEY preview
   vercel env add VITE_OPENAI_API_BASE preview
   vercel env add VITE_OPENAI_MODEL preview
   ```

5. **Production Deployment**
   ```bash
   vercel --prod
   ```

## Environment Variables Explained

### VITE_OPENAI_API_KEY (Required)

- OpenAI API key
- How to get: Visit [OpenAI Platform](https://platform.openai.com/api-keys) to create a new API Key
- Format: `sk-xxxxxxxxxxxxxxxxxxxxxx`
- **Note**: Even without this environment variable, users can configure the API Key in the app's Settings page (stored in browser localStorage)

### VITE_OPENAI_API_BASE (Optional)

- OpenAI API base URL
- Default value: `https://api.openai.com/v1`
- Use case: If using a proxy or compatible API service, you can modify this value
- Example: `https://your-proxy.com/v1`

### VITE_OPENAI_MODEL (Optional)

- OpenAI model name
- Default value: `gpt-4o-mini`
- Available options: `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`, `gpt-3.5-turbo`, etc.
- **Recommendation**: `gpt-4o-mini` offers the best cost-performance ratio for most scenarios

## Custom Domain

1. Select your project in Vercel Dashboard
2. Go to "Settings" > "Domains"
3. Add your custom domain
4. Configure DNS records as instructed (A record or CNAME)
5. Wait for DNS propagation (usually a few minutes to hours)

## Continuous Deployment

Once configured, Vercel will automatically build and deploy every time you push to the main branch:

- **Production Deployment**: Push to `main` or `master` branch
- **Preview Deployment**: Push to other branches or create a Pull Request

## Test Vercel Build Locally

Before deploying, you can test the Vercel build locally:

```bash
# Install dependencies (root)
npm install

# Install recorder package dependencies
cd packages/recorder && npm install && cd ../..

# Build project (same command as Vercel uses)
npm run build:all

# Preview build output
npm run preview
```

Visit `http://localhost:4173` to see the build result.

## Troubleshooting

### 1. pnpm Network Errors (ERR_INVALID_THIS)

**Cause**: pnpm sometimes has connection issues with npm registry on Vercel's infrastructure

**Solution**: This project is configured to use `npm` instead of `pnpm` for Vercel deployments to avoid network issues. For local development, you can still use pnpm if you prefer.

### 2. Build Failed: Recorder package not found

**Cause**: Vercel didn't properly build the recorder package in the monorepo

**Solution**: Ensure `buildCommand` in `vercel.json` is set to `cd packages/recorder && npm install && cd ../.. && npm run build:all`

### 3. Environment Variables Not Found at Runtime

**Cause**: Vite environment variables need to be injected at build time

**Solution**:

- Ensure environment variable names start with `VITE_`
- Configure environment variables correctly in Vercel Dashboard
- Redeploy project (changes to environment variables require a rebuild)

### 4. Route 404 Errors

**Cause**: SPA routing requires rewrite rules

**Solution**: Rewrite rules are already configured in `vercel.json`, all routes will point to `index.html`

### 5. OpenAI API Call Failures

**Cause**: API Key misconfigured or insufficient balance

**Solution**:

- Check if API Key is correctly configured
- Visit [OpenAI Usage](https://platform.openai.com/usage) to check balance
- Test API connection in app Settings page

### 6. Blank Page After Successful Deployment

**Cause**: Possibly a path configuration issue

**Solution**:

- Check browser console for error messages
- Ensure there's no incorrect `base` configuration in `vite.config.ts`
- Check resource paths in `index.html`

## Performance Optimization Tips

1. **Enable Vercel Analytics**
   - Enable Analytics in Vercel Dashboard
   - Monitor page performance and user behavior

2. **Configure Caching Headers**
   - Vercel automatically configures caching for static assets
   - For API requests, configure headers in `vercel.json`

3. **Use Vercel Edge Functions** (Optional)
   - If server-side logic is needed, consider using Edge Functions
   - Suitable for handling API proxies, authentication, etc.

## Security Recommendations

1. **Never Hardcode API Keys in Code**
   - Always use environment variables
   - For user custom configurations, use localStorage

2. **Configure CORS** (if you have an API)
   - Configure CORS headers in `vercel.json`

3. **Enable HTTPS**
   - Vercel enables HTTPS by default for all deployments
   - Custom domains also get SSL certificates automatically

4. **Environment Variable Management**
   - Use different API Keys for production and preview environments
   - Rotate API Keys regularly

## Monitoring and Logs

1. **View Deployment Logs**

   ```bash
   vercel logs [deployment-url]
   ```

2. **Real-time Logs**

   ```bash
   vercel logs --follow
   ```

3. **Vercel Dashboard**
   - Visit project page to view deployment history
   - View real-time logs and error reports

## Rollback Deployment

If the new version has issues, you can quickly rollback:

1. Find the previous deployment in Vercel Dashboard
2. Click the "..." menu
3. Select "Promote to Production"

Or use CLI:

```bash
vercel rollback
```

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vite Deployment Documentation](https://vitejs.dev/guide/static-deploy.html#vercel)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Web Reel Project Documentation](./README.md)

## Support

If you encounter issues:

1. Check [Vercel Status](https://www.vercel-status.com/)
2. Visit [Vercel Community](https://github.com/vercel/vercel/discussions)
3. Submit an issue to the project repository
