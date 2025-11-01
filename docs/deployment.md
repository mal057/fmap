# Deployment Guide

This document provides comprehensive instructions for deploying the FishMap application to GitHub Pages using GitHub Actions.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [GitHub Pages Setup](#github-pages-setup)
- [Environment Variables](#environment-variables)
- [Deployment Process](#deployment-process)
- [Manual Deployment](#manual-deployment)
- [Troubleshooting](#troubleshooting)
- [Custom Domain Setup](#custom-domain-setup-optional)

## Overview

FishMap uses GitHub Actions for continuous deployment to GitHub Pages. The deployment workflow automatically:

1. Triggers on every push to the `main` branch
2. Runs TypeScript type checking and linting
3. Builds the React web application
4. Deploys to GitHub Pages

**Live Demo**: https://mal057.github.io/fmap/

## Prerequisites

Before deploying, ensure you have:

- Push access to the GitHub repository
- GitHub Pages enabled in repository settings
- Required environment variables configured (see below)

## GitHub Pages Setup

Follow these steps to configure GitHub Pages for your repository:

### Step 1: Enable GitHub Pages

1. Go to your repository on GitHub: https://github.com/mal057/fmap
2. Navigate to **Settings** > **Pages**
3. Under **Source**, select **GitHub Actions**
4. Click **Save**

### Step 2: Configure Repository Permissions

The deployment workflow requires proper permissions:

1. Go to **Settings** > **Actions** > **General**
2. Scroll to **Workflow permissions**
3. Select **Read and write permissions**
4. Check **Allow GitHub Actions to create and approve pull requests**
5. Click **Save**

### Step 3: Add Environment Variables (if needed)

If your application requires environment variables:

1. Go to **Settings** > **Secrets and variables** > **Actions**
2. Click **New repository secret**
3. Add the following secrets:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key

**Note**: Environment variables prefixed with `VITE_` are automatically included in the build.

## Environment Variables

### Production Environment Variables

The following environment variables are required for production:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Setting Environment Variables in GitHub Actions

Add secrets in **Settings** > **Secrets and variables** > **Actions**:

1. Click **New repository secret**
2. Name: `VITE_SUPABASE_URL`
3. Value: Your Supabase URL
4. Click **Add secret**
5. Repeat for other secrets

### Using Environment Variables in Workflow

Update `.github/workflows/deploy.yml` to include secrets:

```yaml
- name: Build web application
  run: pnpm build:web
  env:
    NODE_ENV: production
    VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
    VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
```

## Deployment Process

### Automatic Deployment

Deployment happens automatically when you push to `main`:

```bash
git add .
git commit -m "Your commit message"
git push origin main
```

The GitHub Actions workflow will:

1. Checkout the code
2. Set up Node.js 20.x and pnpm
3. Install dependencies with caching
4. Run type checking (`pnpm type-check`)
5. Run linting (`pnpm lint`)
6. Build the web app (`pnpm build:web`)
7. Deploy to GitHub Pages

### Monitoring Deployment

View deployment status:

1. Go to **Actions** tab in your repository
2. Click on the latest **Deploy to GitHub Pages** workflow
3. Monitor the progress in real-time
4. Check for any errors in the logs

### Deployment URL

After successful deployment, your app will be available at:

```
https://mal057.github.io/fmap/
```

## Manual Deployment

You can also deploy manually using the workflow dispatch:

1. Go to **Actions** tab
2. Select **Deploy to GitHub Pages** workflow
3. Click **Run workflow**
4. Select `main` branch
5. Click **Run workflow**

### Local Build and Deploy

To build and preview locally:

```bash
# Build the web app
pnpm build:web

# Preview the production build
cd apps/web
pnpm preview
```

To deploy manually (not recommended):

```bash
# Deploy using gh-pages package
pnpm deploy:web
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Build Fails with TypeScript Errors

**Error**: Type checking fails during deployment

**Solution**:
```bash
# Run type checking locally
pnpm type-check

# Fix all type errors before pushing
```

#### 2. Linting Errors

**Error**: ESLint fails during deployment

**Solution**:
```bash
# Run linting locally
pnpm lint

# Fix linting errors
pnpm lint --fix
```

#### 3. 404 Error After Deployment

**Error**: Application loads but shows 404 on refresh

**Solution**: GitHub Pages serves from the repository name path. Ensure `vite.config.ts` has correct base:

```typescript
base: process.env.NODE_ENV === 'production' ? '/fmap/' : '/',
```

#### 4. Assets Not Loading

**Error**: Images, CSS, or JS files return 404

**Solution**:
- Check that `base` path in `vite.config.ts` matches your repository name
- Ensure all asset imports use relative paths or the `@` alias
- Verify the build output in `apps/web/dist`

#### 5. Environment Variables Not Working

**Error**: API calls fail in production

**Solution**:
- Add secrets in GitHub repository settings
- Prefix environment variables with `VITE_`
- Update workflow to include environment variables in build step

#### 6. Workflow Permission Errors

**Error**: `Resource not accessible by integration`

**Solution**:
1. Go to **Settings** > **Actions** > **General**
2. Set **Workflow permissions** to **Read and write permissions**
3. Enable **Allow GitHub Actions to create and approve pull requests**

#### 7. Pages Build Failed

**Error**: GitHub Pages build fails

**Solution**:
1. Check that the `dist` directory is being uploaded correctly
2. Verify the upload path in workflow: `./apps/web/dist`
3. Ensure the build step completes successfully

### Debugging Workflow

To debug workflow issues:

1. Check workflow logs in **Actions** tab
2. Look for red X marks indicating failed steps
3. Click on failed step to view detailed logs
4. Common issues:
   - Missing dependencies
   - Type errors
   - Build configuration issues
   - Permission problems

### Rollback Deployment

To rollback to a previous version:

1. Go to **Actions** tab
2. Find the last successful deployment
3. Click **Re-run all jobs**

Or manually:

```bash
# Checkout previous commit
git checkout <previous-commit-hash>

# Force push to main (use with caution)
git push origin main --force
```

## Custom Domain Setup (Optional)

To use a custom domain with GitHub Pages:

### Step 1: Configure DNS

Add DNS records with your domain provider:

**For apex domain (example.com):**
```
A     @     185.199.108.153
A     @     185.199.109.153
A     @     185.199.110.153
A     @     185.199.111.153
```

**For subdomain (www.example.com):**
```
CNAME www   mal057.github.io
```

### Step 2: Add CNAME File

Create `apps/web/public/CNAME`:

```
your-domain.com
```

### Step 3: Configure in GitHub

1. Go to **Settings** > **Pages**
2. Enter your custom domain
3. Check **Enforce HTTPS**
4. Wait for DNS verification

### Step 4: Update Vite Config

Update `apps/web/vite.config.ts`:

```typescript
base: process.env.NODE_ENV === 'production'
  ? process.env.VITE_USE_CUSTOM_DOMAIN === 'true' ? '/' : '/fmap/'
  : '/',
```

Add to GitHub secrets:
```
VITE_USE_CUSTOM_DOMAIN=true
```

## Continuous Integration

The repository also includes a CI workflow that runs on all pushes and pull requests:

### CI Workflow Features

- **Type Checking**: Ensures all TypeScript code is valid
- **Linting**: Enforces code style and best practices
- **Build Verification**: Confirms all apps build successfully
- **Test Execution**: Runs all tests (when available)

### CI Status Checks

Pull requests must pass CI checks before merging:

1. Lint and Type Check
2. Build All Apps
3. Run Tests

View CI status in the pull request or **Actions** tab.

## Best Practices

### Before Pushing

Always run these commands locally before pushing:

```bash
# Type check
pnpm type-check

# Lint
pnpm lint

# Build
pnpm build:web

# Test (when tests are added)
pnpm test
```

### Commit Messages

Use clear, descriptive commit messages:

```bash
git commit -m "feat: add waypoint filtering feature"
git commit -m "fix: resolve map marker positioning issue"
git commit -m "docs: update deployment guide"
```

### Branch Protection

Consider enabling branch protection on `main`:

1. Go to **Settings** > **Branches**
2. Click **Add rule**
3. Pattern: `main`
4. Enable:
   - Require status checks to pass before merging
   - Require branches to be up to date
   - Include administrators

## Additional Resources

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vite Build Configuration](https://vitejs.dev/config/build-options.html)
- [React Production Build](https://react.dev/learn/start-a-new-react-project#deploying-to-production)

## Support

If you encounter issues not covered in this guide:

1. Check GitHub Actions logs
2. Review Vite build output
3. Open an issue on GitHub
4. Check Vite and React documentation

---

Last updated: 2025-10-31
