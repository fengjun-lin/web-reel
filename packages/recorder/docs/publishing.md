# Publishing @web-reel/recorder to npm

Quick guide for publishing the package to npm.

## Prerequisites

1. **npm account**: https://www.npmjs.com/signup
2. **Email verified** on npm
3. **Logged in**: `npm login`
4. **npm organization created**: `npm org create web-reel`

## Quick Release (Recommended)

Use the automated release script:

```bash
cd packages/recorder

# Patch release (0.1.0 → 0.1.1) - bug fixes
./release.sh patch

# Minor release (0.1.0 → 0.2.0) - new features
./release.sh minor

# Major release (0.1.0 → 1.0.0) - breaking changes
./release.sh major
```

The script will automatically:

- ✅ Run type check
- ✅ Build the package
- ✅ Bump version in package.json
- ✅ Create git commit and tag
- ✅ Publish to npm
- ✅ Show next steps

## Manual Publish (Alternative)

If you prefer manual control:

## Manual Publish

```bash
cd packages/recorder

# Install & build
npm install
npm run clean && npm run build

# Verify
npm publish --dry-run --access public

# Publish
npm publish --access public
```

## Important Notes

### Scoped Package

Package name is `@web-reel/recorder` (scoped), you **must** use:

```bash
npm publish --access public
```

### Version Management

**Automatic (npm version command):**

```bash
# This updates package.json AND creates git commit + tag
npm version patch   # 0.1.0 → 0.1.1
npm version minor   # 0.1.0 → 0.2.0
npm version major   # 0.1.0 → 1.0.0
```

**Manual (not recommended):**

```bash
# Edit package.json manually, then:
git add package.json
git commit -m "chore(release): v0.1.1"
git tag v0.1.1
```

### After Publishing

```bash
# Push changes and tags to GitHub
git push && git push --tags

# Verify publication
npm info @web-reel/recorder

# Create GitHub release (optional but recommended)
# Visit: https://github.com/fengjun-lin/web-reel/releases/new
```

## Common Issues

### "402 Payment Required"

**Fix**: Add `--access public` flag

### "You must verify your email"

**Fix**: Check email for verification link

### "Version already exists"

**Fix**: Update version with `npm version patch`

## Useful Commands

```bash
# Check login status
npm whoami

# View package info
npm info @web-reel/recorder

# Test locally
npm pack
```

## Resources

- Package: https://www.npmjs.com/package/@web-reel/recorder
- Repository: https://github.com/fengjun-lin/web-reel
- npm docs: https://docs.npmjs.com/
