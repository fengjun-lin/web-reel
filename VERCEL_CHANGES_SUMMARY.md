# Vercel Deployment Configuration Summary

This document summarizes all changes made to enable Vercel deployment.

## Files Created

### 1. `vercel.json`
Main Vercel configuration file:
- **Install Command**: `npm install` (installs root dependencies)
- **Build Command**: `cd packages/recorder && npm install && cd ../.. && npm run build:all`
  - First installs recorder package dependencies (tsup, etc.)
  - Then builds recorder package
  - Finally builds main application
- **Output Directory**: `dist`
- **Rewrites**: Configured for SPA routing (all routes → index.html)

### 2. `.vercelignore`
Specifies files to exclude from deployment:
- node_modules
- Build artifacts
- Development files (.env.local, .DS_Store)
- IDE files
- Logs
- Legacy files

### 3. `VERCEL_DEPLOYMENT.md`
Comprehensive deployment guide including:
- Two deployment methods (Dashboard and CLI)
- Environment variable configuration
- Troubleshooting guide
- Performance and security tips

### 4. `test-vercel-build.sh`
Local testing script to simulate Vercel build process:
```bash
./test-vercel-build.sh
```

## Files Modified

### 1. `package.json`
Updated build scripts to work with npm instead of pnpm:
- **Before**: `pnpm --filter @web-reel/recorder build`
- **After**: `cd packages/recorder && npm run build`

Reason: pnpm has network connectivity issues on Vercel infrastructure

### 2. `README.md`
Added deployment section with:
- Link to detailed deployment guide
- Quick deploy button
- Environment variable requirements
- Updated build commands for both pnpm (local) and npm (Vercel)

## Why Use npm Instead of pnpm?

During testing, pnpm encountered network errors on Vercel:
```
WARN GET https://registry.npmjs.org/@eslint%2Fjs error (ERR_INVALID_THIS)
```

**Solution**: Use npm for Vercel deployments while keeping pnpm available for local development.

## Environment Variables (Optional)

These can be configured in Vercel Dashboard or at runtime in the app:

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_OPENAI_API_KEY` | - | OpenAI API key for AI analysis |
| `VITE_OPENAI_API_BASE` | `https://api.openai.com/v1` | OpenAI API base URL |
| `VITE_OPENAI_MODEL` | `gpt-4o-mini` | OpenAI model name |

**Note**: Users can configure these at runtime via the Settings page (stored in localStorage), so environment variables are optional.

## Deployment Steps

### Quick Deploy (Recommended)

1. Push code to GitHub/GitLab/Bitbucket:
   ```bash
   git add .
   git commit -m "Add Vercel deployment configuration"
   git push
   ```

2. Go to [vercel.com](https://vercel.com) and click "New Project"

3. Import your repository

4. Vercel will auto-detect the configuration from `vercel.json`

5. Click "Deploy"

### Test Locally First

```bash
# Run the test script
./test-vercel-build.sh

# Or manually:
npm install
cd packages/recorder && npm install && cd ../..
npm run build:all
npm run preview
```

Visit http://localhost:4173 to verify the build.

## Monorepo Structure

This project uses a monorepo with:
- **Root**: Main application (React + Vite)
- **packages/recorder**: Recording SDK package

The build process must:
1. Install root dependencies (React, Vite, etc.)
2. Install recorder dependencies (tsup for building)
3. Build recorder package first
4. Build main application (which imports the built recorder package)

This is why the build command is:
```bash
cd packages/recorder && npm install && cd ../.. && npm run build:all
```

## Continuous Deployment

Once configured:
- **Push to main/master**: Auto-deploys to production
- **Push to other branches**: Creates preview deployments
- **Pull Requests**: Automatic preview deployments with unique URLs

## Troubleshooting

See `VERCEL_DEPLOYMENT.md` for detailed troubleshooting, including:
- pnpm network errors
- Monorepo build issues
- Environment variable problems
- Routing issues
- API configuration

## Next Steps

1. ✅ Configuration files created
2. ✅ Build scripts updated
3. ✅ Documentation written
4. ⏭️ Test locally: `./test-vercel-build.sh`
5. ⏭️ Push to Git
6. ⏭️ Deploy to Vercel
7. ⏭️ Configure environment variables (optional)
8. ⏭️ Test production deployment

## Support

For issues or questions:
- Check `VERCEL_DEPLOYMENT.md` troubleshooting section
- Visit [Vercel Documentation](https://vercel.com/docs)
- Check [Vercel Community](https://github.com/vercel/vercel/discussions)

