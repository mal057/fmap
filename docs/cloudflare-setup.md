# Cloudflare R2 and Workers Setup Guide

This guide will help you set up Cloudflare R2 for object storage and Cloudflare Workers for the FishMap API.

## Prerequisites

- Cloudflare account (sign up at https://dash.cloudflare.com/sign-up)
- Wrangler CLI installed (`npm install -g wrangler`)
- Supabase project set up (see separate guide)

## Step 1: Login to Wrangler

```bash
wrangler login
```

This will open a browser window for authentication.

## Step 2: Create R2 Bucket

### Option A: Via Cloudflare Dashboard

1. Go to https://dash.cloudflare.com
2. Navigate to R2 in the left sidebar
3. Click "Create bucket"
4. Enter bucket name: `fmap-waypoints`
5. Choose your region (closest to your users)
6. Click "Create bucket"

### Option B: Via Wrangler CLI

```bash
wrangler r2 bucket create fmap-waypoints
wrangler r2 bucket create fmap-waypoints-preview
```

## Step 3: Configure wrangler.toml

1. Copy the example configuration:
   ```bash
   cd apps/api
   cp wrangler.example.toml wrangler.toml
   ```

2. Update `wrangler.toml` with your values:
   ```toml
   name = "fmap-api"
   main = "src/index.ts"
   compatibility_date = "2023-12-18"

   [[r2_buckets]]
   binding = "WAYPOINTS_BUCKET"
   bucket_name = "fmap-waypoints"
   preview_bucket_name = "fmap-waypoints-preview"

   [vars]
   ENVIRONMENT = "development"
   SUPABASE_URL = "https://your-project.supabase.co"
   SUPABASE_ANON_KEY = "your-anon-key"
   ```

## Step 4: Set Secrets

Sensitive values like the Supabase service key should be stored as secrets, not in wrangler.toml:

```bash
cd apps/api

# Set Supabase service key (get this from Supabase Dashboard > Settings > API)
wrangler secret put SUPABASE_SERVICE_KEY
# Paste your service key when prompted
```

## Step 5: Install Dependencies

```bash
cd apps/api
pnpm install
```

The API requires these dependencies:
- `@supabase/supabase-js` - Supabase client library

Make sure `apps/api/package.json` includes:

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.38.5"
  }
}
```

If not, install it:

```bash
pnpm add @supabase/supabase-js
```

## Step 6: Test Locally

```bash
cd apps/api
pnpm dev
```

The API will be available at `http://localhost:8787`

Test the health endpoint:
```bash
curl http://localhost:8787/
```

You should see:
```json
{
  "name": "FishMap API",
  "version": "2.0.0",
  "status": "running",
  "environment": "development"
}
```

## Step 7: Deploy to Production

```bash
cd apps/api
pnpm deploy
```

Or using wrangler directly:
```bash
wrangler publish
```

After deployment, note your Worker URL (e.g., `https://fmap-api.your-subdomain.workers.dev`)

## Step 8: Update Web App Configuration

1. Copy the environment example:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your values:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_API_URL=https://fmap-api.your-subdomain.workers.dev
   ```

## API Endpoints

Once deployed, your API will have these endpoints:

- `GET /` - Health check
- `POST /api/upload` - Upload file (requires authentication)
- `GET /api/files` - List files (supports pagination, search, brand filter)
- `GET /api/files/:id` - Get single file metadata
- `GET /api/download/:id` - Download file
- `DELETE /api/files/:id` - Delete file (owner only, requires authentication)

## Security Configuration

### CORS

CORS is configured in `wrangler.toml`:

```toml
[cors]
origins = ["*"]
methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
allow_headers = ["Content-Type", "Authorization"]
```

For production, restrict origins to your domain:

```toml
[cors]
origins = ["https://your-domain.com"]
```

### Rate Limiting

The API includes built-in rate limiting:
- 10 uploads per hour per authenticated user
- Tracked in Supabase `upload_rate_limits` table
- Automatically cleans up records older than 1 hour

### File Validation

- Allowed extensions: `.slg`, `.sl2`, `.sl3`, `.gpx`, `.adm`, `.dat`, `.son`, `.fsh`
- Maximum file size: 500MB
- MIME type validation
- Secure filename generation with UUID

## Monitoring and Logs

### View Live Logs

```bash
wrangler tail
```

### View Deployment History

```bash
wrangler deployments list
```

### Analytics

View analytics in Cloudflare Dashboard:
1. Go to Workers & Pages
2. Select your `fmap-api` worker
3. Click "Analytics" tab

## Troubleshooting

### Issue: "Bucket not found"

**Solution:** Ensure R2 bucket is created and name matches `wrangler.toml`:
```bash
wrangler r2 bucket list
```

### Issue: "Unauthorized" errors

**Solution:** Check that Supabase URL and keys are correct:
```bash
wrangler secret list
```

Recreate secrets if needed:
```bash
wrangler secret put SUPABASE_SERVICE_KEY
```

### Issue: CORS errors in browser

**Solution:**
1. Check CORS configuration in `wrangler.toml`
2. Ensure worker handles OPTIONS preflight requests
3. Verify origin in CORS config matches your web app URL

### Issue: File uploads fail

**Solution:**
1. Check file size (must be ≤ 500MB)
2. Verify file extension is allowed
3. Ensure user is authenticated
4. Check rate limit (max 10 uploads/hour)
5. Review worker logs: `wrangler tail`

### Issue: Database errors

**Solution:**
1. Verify Supabase connection strings
2. Check that database schema is applied
3. Ensure RLS policies are configured correctly
4. Verify service key has proper permissions

## Cost Considerations

### Cloudflare R2

- Storage: $0.015/GB/month
- Class A operations (writes): $4.50 per million
- Class B operations (reads): $0.36 per million
- No egress fees!

### Cloudflare Workers

- Free tier: 100,000 requests/day
- Paid: $5/10 million requests

### Example Monthly Cost (1000 active users)

- Storage (10GB): $0.15
- Uploads (10,000): ~$0.05
- Downloads (50,000): ~$0.02
- Workers (500,000 requests): FREE
- **Total: ~$0.22/month**

## Production Checklist

Before going to production:

- [ ] R2 bucket created
- [ ] Secrets configured (`SUPABASE_SERVICE_KEY`)
- [ ] CORS origins restricted to your domain
- [ ] Database schema applied
- [ ] RLS policies enabled
- [ ] Worker deployed
- [ ] Web app `.env` configured with production URLs
- [ ] Test file upload/download flow
- [ ] Monitor logs for errors
- [ ] Set up alerts (optional)

## Additional Resources

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [Supabase Documentation](https://supabase.com/docs)

## Support

For issues or questions:
1. Check logs: `wrangler tail`
2. Review Cloudflare Workers analytics
3. Check Supabase dashboard for database issues
4. Open an issue on GitHub
