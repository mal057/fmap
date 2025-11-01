# GitHub Pages Deployment Checklist

Quick reference for setting up GitHub Pages deployment.

## Initial Setup (Do Once)

### 1. Enable GitHub Pages
- [ ] Go to repository **Settings** > **Pages**
- [ ] Under **Source**, select **GitHub Actions**
- [ ] Click **Save**

### 2. Configure Workflow Permissions
- [ ] Go to **Settings** > **Actions** > **General**
- [ ] Under **Workflow permissions**, select **Read and write permissions**
- [ ] Check **Allow GitHub Actions to create and approve pull requests**
- [ ] Click **Save**

### 3. Add Environment Secrets (if needed)
- [ ] Go to **Settings** > **Secrets and variables** > **Actions**
- [ ] Add `VITE_SUPABASE_URL` (your Supabase project URL)
- [ ] Add `VITE_SUPABASE_ANON_KEY` (your Supabase anonymous key)

### 4. Push to Main Branch
```bash
git add .
git commit -m "Add GitHub Actions CI/CD pipeline"
git push origin main
```

### 5. Monitor First Deployment
- [ ] Go to **Actions** tab
- [ ] Watch **Deploy to GitHub Pages** workflow
- [ ] Verify successful deployment
- [ ] Visit https://mal057.github.io/fmap/

## Verification

After first deployment, verify:
- [ ] Site loads at https://mal057.github.io/fmap/
- [ ] All assets load correctly (no 404s)
- [ ] Environment variables work (if applicable)
- [ ] Navigation works on all routes
- [ ] Build badges appear in README

## Common Commands

```bash
# Check type errors locally
pnpm type-check

# Check linting locally
pnpm lint

# Build locally
pnpm build:web

# Preview build locally
cd apps/web && pnpm preview

# Run tests (when available)
pnpm test
```

## Workflow Files Created

- `.github/workflows/deploy.yml` - Automatic deployment on push to main
- `.github/workflows/ci.yml` - Continuous integration for all branches/PRs

## Documentation

For detailed information, see:
- [docs/deployment.md](../docs/deployment.md) - Complete deployment guide
- [README.md](../README.md) - Updated with badges and deployment info

## Troubleshooting

If deployment fails:
1. Check workflow logs in **Actions** tab
2. Run `pnpm type-check` and `pnpm lint` locally
3. Verify build succeeds locally with `pnpm build:web`
4. See [docs/deployment.md#troubleshooting](../docs/deployment.md#troubleshooting)

## Next Steps

- [ ] Enable branch protection on `main`
- [ ] Require CI checks to pass before merge
- [ ] Set up custom domain (optional)
- [ ] Configure production environment variables
