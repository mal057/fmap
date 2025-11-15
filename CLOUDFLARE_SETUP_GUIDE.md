# Cloudflare R2 & Workers Setup Guide

Complete guide to set up file storage and deploy your API to Cloudflare.

---

## Prerequisites

- Cloudflare account (free tier works!)
- Wrangler CLI installed globally
- Your Supabase credentials ready

---

## Part 1: Install Wrangler CLI

```bash
npm install -g wrangler
```

Verify installation:
```bash
wrangler --version
```

---

## Part 2: Login to Cloudflare

```bash
wrangler login
```

This will open your browser to authenticate with Cloudflare.

---

## Part 3: Create R2 Bucket for File Storage

### Step 1: Create R2 Bucket via Dashboard

1. Go to https://dash.cloudflare.com
2. Click **R2** in the left sidebar
3. Click **Create bucket**
4. Name it: `fmap-waypoints`
5. Choose location: **Automatic** (recommended)
6. Click **Create bucket**

### Step 2: Create Preview Bucket (for development)

1. Click **Create bucket** again
2. Name it: `fmap-waypoints-preview`
3. Click **Create bucket**

✅ **Done!** Your R2 buckets are ready.

---

## Part 4: Create KV Namespace for Rate Limiting

### Create Production KV Namespace

```bash
cd apps/api
wrangler kv:namespace create "RATE_LIMIT_KV"
```

Copy the ID that's returned (looks like: `a1b2c3d4e5f6...`)

### Create Preview KV Namespace

```bash
wrangler kv:namespace create "RATE_LIMIT_KV" --preview
```

Copy the preview ID.

### Update wrangler.toml

Open `apps/api/wrangler.toml` and replace:

```toml
[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "YOUR_KV_NAMESPACE_ID"          # ← Paste production ID here
preview_id = "YOUR_PREVIEW_KV_NAMESPACE_ID"  # ← Paste preview ID here
```

---

## Part 5: Set Secrets for Production

Set your Supabase credentials as secrets (these are encrypted):

```bash
cd apps/api

# Supabase URL
wrangler secret put SUPABASE_URL
# When prompted, paste: https://vwlnnocosqsureltloqi.supabase.co

# Supabase Anon Key
wrangler secret put SUPABASE_ANON_KEY
# When prompted, paste your anon key from .env

# Supabase JWT Secret
wrangler secret put SUPABASE_JWT_SECRET
# When prompted, paste your JWT secret from .env

# Supabase Service Key (for admin operations)
wrangler secret put SUPABASE_SERVICE_KEY
# When prompted, paste your service role key from .env
```

**Note:** Get the Service Role Key from:
- Supabase Dashboard → Settings → API → `service_role` key (secret)

---

## Part 6: Update Production CORS Origins

Edit `apps/api/wrangler.toml`:

```toml
[env.production.vars]
ALLOWED_ORIGINS = "https://mal057.github.io"
```

This allows your GitHub Pages site to make API requests.

---

## Part 7: Deploy API to Cloudflare Workers

### Test Locally First

```bash
cd apps/api
wrangler dev
```

This starts a local server. Test it at http://localhost:8787

### Deploy to Production

```bash
wrangler deploy
```

✅ **Your API is now live!**

Cloudflare will give you a URL like:
`https://fmap-api.YOUR-SUBDOMAIN.workers.dev`

---

## Part 8: Update Web App with Production API URL

### For Local Development

Edit `apps/web/.env`:

```env
VITE_API_URL=https://fmap-api.YOUR-SUBDOMAIN.workers.dev
```

### For Production (GitHub Pages)

You need to set this as a GitHub secret:

1. Go to: https://github.com/mal057/fmap/settings/secrets/actions
2. Click **New repository secret**
3. Name: `VITE_API_URL`
4. Value: `https://fmap-api.YOUR-SUBDOMAIN.workers.dev`
5. Click **Add secret**

Then update `.github/workflows/deploy.yml` to use the secret:

```yaml
- name: Build web application
  run: pnpm build:web
  env:
    NODE_ENV: production
    VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
    VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
    VITE_API_URL: ${{ secrets.VITE_API_URL }}
```

**Add Supabase secrets to GitHub too:**

1. `VITE_SUPABASE_URL` = `https://vwlnnocosqsureltloqi.supabase.co`
2. `VITE_SUPABASE_ANON_KEY` = Your anon key from `.env`

---

## Part 9: Test File Upload

### Test Upload Flow

1. Go to your site: https://mal057.github.io/fmap/
2. Register/login
3. Go to upload page
4. Upload a fish finder file
5. Check:
   - ✅ File appears in Cloudflare R2 bucket
   - ✅ Metadata saved in Supabase database
   - ✅ Download works

### Check R2 Bucket

1. Go to https://dash.cloudflare.com
2. Click **R2**
3. Click **fmap-waypoints**
4. You should see your uploaded files in `uploads/USER_ID/` folders

### Check Supabase Database

1. Go to https://supabase.com/dashboard
2. Click your project
3. Click **Table Editor**
4. Click **files** table
5. You should see your uploaded file metadata

---

## Part 10: Enable Authentication on Upload Page

Edit `apps/web/src/App.tsx`:

```typescript
// Change this:
<Route
  path="/upload"
  element={<UploadPage />}
/>

// Back to this:
<Route
  path="/upload"
  element={
    <ProtectedRoute>
      <UploadPage />
    </ProtectedRoute>
  }
/>
```

Then commit and push to deploy.

---

## Costs & Free Tier Limits

### Cloudflare R2 (Free Tier)
- ✅ 10 GB storage/month
- ✅ 1 million Class A operations/month (writes)
- ✅ 10 million Class B operations/month (reads)
- ✅ No egress fees

### Cloudflare Workers (Free Tier)
- ✅ 100,000 requests/day
- ✅ 10 ms CPU time per request

### Supabase (Free Tier)
- ✅ 500 MB database
- ✅ 1 GB file storage
- ✅ 2 GB bandwidth/month

**You can run this entire platform for FREE!**

---

## Troubleshooting

### API Not Working

Check CORS settings:
```bash
wrangler tail
```

This shows live logs from your Worker.

### Files Not Uploading to R2

Check bucket permissions:
1. Dashboard → R2 → fmap-waypoints → Settings
2. Ensure bucket is not in read-only mode

### Database Errors

Check Supabase logs:
1. Dashboard → Logs → All Logs
2. Look for errors from your API

---

## Next Steps

1. ✅ Set up custom domain (optional)
2. ✅ Add email confirmation for registration
3. ✅ Enable malware scanning (VirusTotal API)
4. ✅ Add file preview/parsing
5. ✅ Implement file sharing features

---

## Quick Reference Commands

```bash
# Deploy API
cd apps/api && wrangler deploy

# View live logs
wrangler tail

# List secrets
wrangler secret list

# Delete a secret
wrangler secret delete SECRET_NAME

# Test locally
wrangler dev
```

---

You're all set! 🎉
