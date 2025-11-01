# Security Features Setup Guide

This guide will walk you through setting up all the security features for the FishMap API.

## Prerequisites

- Cloudflare Workers account
- Wrangler CLI installed (`npm install -g wrangler`)
- Supabase project created
- (Optional) VirusTotal API key

## Step 1: Create KV Namespace for Rate Limiting

Create a KV namespace for rate limiting:

```bash
# For development
wrangler kv:namespace create "RATE_LIMIT_KV"

# For preview/staging
wrangler kv:namespace create "RATE_LIMIT_KV" --preview
```

This will output namespace IDs. Update `apps/api/wrangler.toml` with these IDs:

```toml
[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "your-namespace-id-here"
preview_id = "your-preview-namespace-id-here"
```

## Step 2: Configure Supabase

### Get JWT Secret

1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy the `JWT Secret` (not the anon key)

### Set Secrets in Cloudflare Workers

```bash
# Navigate to API directory
cd apps/api

# Set Supabase JWT Secret
wrangler secret put SUPABASE_JWT_SECRET
# Paste your JWT secret when prompted

# Set Supabase URL
wrangler secret put SUPABASE_URL
# Enter: https://your-project.supabase.co

# Set Supabase Anon Key
wrangler secret put SUPABASE_ANON_KEY
# Paste your anon key when prompted
```

## Step 3: Configure VirusTotal (Optional)

If you want malware scanning:

1. Get a free API key from [VirusTotal](https://www.virustotal.com/)
2. Set the secret:

```bash
wrangler secret put VIRUSTOTAL_API_KEY
# Paste your VirusTotal API key when prompted
```

3. Enable malware scanning in `wrangler.toml`:

```toml
[vars]
MALWARE_SCAN_ENABLED = "true"
```

## Step 4: Configure CORS for Production

Update `wrangler.toml` with your production domain(s):

```toml
[env.production.vars]
ALLOWED_ORIGINS = "https://yourdomain.com,https://app.yourdomain.com"
```

## Step 5: Verify Configuration

Check that all configurations are set:

```bash
# List all secrets (won't show values)
wrangler secret list

# Test locally
wrangler dev
```

## Step 6: Deploy

Deploy to production:

```bash
# Deploy to production
wrangler deploy --env production
```

## Step 7: Test Security Features

### Test Rate Limiting

```bash
# Make multiple requests to test rate limiting
for i in {1..15}; do
  curl -X POST https://your-api.workers.dev/api/waypoints/upload \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -F "file=@test.gpx"
done
```

You should get a 429 response after the 10th request.

### Test Authentication

```bash
# Without token (should fail in production)
curl -X POST https://your-api.workers.dev/api/waypoints/upload \
  -F "file=@test.gpx"

# With token (should succeed)
curl -X POST https://your-api.workers.dev/api/waypoints/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test.gpx"
```

### Test File Validation

```bash
# Try uploading invalid file type
curl -X POST https://your-api.workers.dev/api/waypoints/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test.exe"
```

Should return 400 with "File extension not allowed" error.

### Test Security Headers

```bash
# Check security headers
curl -I https://your-api.workers.dev/
```

Should see headers like:
- `Content-Security-Policy`
- `X-Frame-Options`
- `X-Content-Type-Options`
- `Strict-Transport-Security`

## Monitoring

### View Logs

```bash
# Tail logs
wrangler tail

# Tail production logs
wrangler tail --env production
```

### Monitor Rate Limit Usage

Add this endpoint to check your rate limit status:

```bash
curl https://your-api.workers.dev/api/rate-limit-status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

### KV Namespace Not Found

If you see errors about KV namespace:

1. Verify namespace is created: `wrangler kv:namespace list`
2. Check `wrangler.toml` has correct namespace IDs
3. Redeploy: `wrangler deploy`

### JWT Verification Failing

1. Verify JWT secret is correct in Supabase dashboard
2. Check secret is set: `wrangler secret list`
3. Ensure token format is `Bearer <token>` in Authorization header

### CORS Issues

1. Check `ALLOWED_ORIGINS` in `wrangler.toml`
2. Ensure your frontend domain is in the list
3. Redeploy after changes

### Rate Limiting Not Working

1. Verify KV namespace is bound correctly
2. Check logs for KV-related errors
3. Ensure `RATE_LIMIT_KV` binding is in `wrangler.toml`

## Security Checklist

Before going to production:

- [ ] KV namespace created and configured
- [ ] JWT secret set via `wrangler secret put`
- [ ] CORS configured with specific origins (no wildcard)
- [ ] Rate limits configured appropriately
- [ ] Malware scanning enabled (if using VirusTotal)
- [ ] HTTPS enforced (Cloudflare does this by default)
- [ ] Secrets never committed to git
- [ ] Monitoring and logging set up
- [ ] Test all security features
- [ ] Review `docs/security.md` documentation

## Environment Variables Reference

### Required
- `SUPABASE_JWT_SECRET` - For JWT verification
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key

### Optional
- `VIRUSTOTAL_API_KEY` - For malware scanning
- `MALWARE_SCAN_ENABLED` - Enable/disable scanning (true/false)
- `RATE_LIMIT_UPLOADS_PER_HOUR` - Upload rate limit (default: 10)
- `RATE_LIMIT_DOWNLOADS_PER_HOUR` - Download rate limit (default: 100)
- `RATE_LIMIT_API_REQUESTS_PER_HOUR` - API rate limit (default: 1000)
- `ALLOWED_ORIGINS` - CORS allowed origins (comma-separated)

## Additional Resources

- [Full Security Documentation](./security.md)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review logs with `wrangler tail`
3. Consult the [security documentation](./security.md)
4. Open an issue in the repository

---

**Last Updated**: 2024-01-01
