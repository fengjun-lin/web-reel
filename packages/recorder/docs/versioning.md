# Version Management Guide

Quick reference for version management and releases.

## 🚀 Release Workflow

### Option 1: Automated (Recommended)

```bash
cd packages/recorder

# For bug fixes
./release.sh patch

# For new features
./release.sh minor

# For breaking changes
./release.sh major
```

That's it! Everything is automated.

### Option 2: Step by Step

```bash
cd packages/recorder

# 1. Bump version (automatically commits and tags)
npm version patch  # or minor, or major

# 2. Build
npm run build

# 3. Publish
npm publish --access public

# 4. Push to GitHub
git push && git push --tags
```

## 📌 Version Numbers Explained

Following [Semantic Versioning](https://semver.org/):

```
MAJOR.MINOR.PATCH
  |     |     |
  |     |     └─ Bug fixes (0.1.0 → 0.1.1)
  |     └─────── New features (0.1.0 → 0.2.0)
  └───────────── Breaking changes (0.1.0 → 1.0.0)
```

### Examples

| Change          | Command             | Version       |
| --------------- | ------------------- | ------------- |
| Fix a bug       | `npm version patch` | 0.1.0 → 0.1.1 |
| Add feature     | `npm version minor` | 0.1.0 → 0.2.0 |
| Breaking change | `npm version major` | 0.1.0 → 1.0.0 |

## 🎯 When to Bump Which Version?

### Patch (0.1.x)

- Bug fixes
- Documentation updates
- Performance improvements
- No API changes

**Example:**

```bash
# Fixed: Recorder stops after 1 hour
./release.sh patch  # → v0.1.1
```

### Minor (0.x.0)

- New features
- New APIs (backwards compatible)
- Deprecations
- No breaking changes

**Example:**

```bash
# Added: New exportToCSV() method
./release.sh minor  # → v0.2.0
```

### Major (x.0.0)

- Breaking changes
- Removed APIs
- Changed behavior
- Incompatible updates

**Example:**

```bash
# Breaking: Changed WebReelRecorder constructor signature
./release.sh major  # → v1.0.0
```

## 🔄 Complete Release Example

```bash
# 1. Make your changes
git add .
git commit -m "feat: add new export format"

# 2. Run automated release
cd packages/recorder
./release.sh minor

# Output:
# ✓ Type check passed
# ✓ Build successful
# ✓ Version bumped to v0.2.0
# ✓ Published to npm

# 3. Push to GitHub
git push && git push --tags

# 4. Create GitHub release (optional)
# Visit: https://github.com/fengjun-lin/web-reel/releases/new
```

## 📝 Git Commit Messages

Good commit messages help understand what changed:

```bash
# Features
git commit -m "feat: add CSV export support"

# Bug fixes
git commit -m "fix: resolve memory leak in recorder"

# Documentation
git commit -m "docs: update installation guide"

# Performance
git commit -m "perf: optimize event processing"

# Refactoring
git commit -m "refactor: simplify session storage logic"

# Breaking changes
git commit -m "feat!: change recorder initialization API

BREAKING CHANGE: WebReelRecorder now requires projectName parameter"
```

## 🚫 What NOT to Do

```bash
# ❌ Don't manually edit version in package.json
# Use npm version instead

# ❌ Don't forget to push tags
git push --tags

# ❌ Don't skip the build step
npm run build

# ❌ Don't publish without testing
npm run typecheck
```

## 🔍 Check Current Version

```bash
# In package.json
cat package.json | grep version

# Published on npm
npm info @web-reel/recorder version

# All published versions
npm info @web-reel/recorder versions
```

## 🎯 Quick Commands

```bash
# Check what would be published
npm pack --dry-run

# View package info
npm info @web-reel/recorder

# Install specific version
npm install @web-reel/recorder@0.1.0

# Install latest
npm install @web-reel/recorder@latest
```

## 🐛 Rollback a Release

If you published a broken version:

```bash
# Option 1: Deprecate (recommended)
npm deprecate @web-reel/recorder@0.1.1 "Broken release, use 0.1.2 instead"

# Option 2: Publish a fix immediately
./release.sh patch

# Option 3: Unpublish (only within 72 hours, not recommended)
npm unpublish @web-reel/recorder@0.1.1
```

## 📊 Pre-release Versions

For beta/alpha releases:

```bash
# Beta release (0.1.0-beta.0)
npm version prerelease --preid=beta
npm publish --tag beta

# Install beta
npm install @web-reel/recorder@beta

# Alpha release
npm version prerelease --preid=alpha
npm publish --tag alpha
```

## 🎉 First Stable Release

When ready for 1.0.0:

```bash
# From 0.x.x to 1.0.0
./release.sh major

# Or manually
npm version major  # → 1.0.0
npm run build
npm publish --access public
git push && git push --tags
```

## 📚 Resources

- [Semantic Versioning](https://semver.org/)
- [npm version docs](https://docs.npmjs.com/cli/version)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

**Remember**: Always use the automated script `./release.sh` for the smoothest experience! 🚀
