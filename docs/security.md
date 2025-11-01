# FishMap Security Documentation

## Overview

This document outlines the security features implemented in the FishMap application, best practices for deployment, and procedures for handling security incidents.

## Table of Contents

1. [Security Features](#security-features)
2. [Configuration](#configuration)
3. [Authentication & Authorization](#authentication--authorization)
4. [Rate Limiting](#rate-limiting)
5. [File Upload Security](#file-upload-security)
6. [Malware Scanning](#malware-scanning)
7. [Input Sanitization](#input-sanitization)
8. [Security Headers](#security-headers)
9. [Error Handling](#error-handling)
10. [Deployment Best Practices](#deployment-best-practices)
11. [Monitoring & Logging](#monitoring--logging)
12. [Incident Response](#incident-response)
13. [Vulnerability Reporting](#vulnerability-reporting)

---

## Security Features

FishMap implements comprehensive security measures at multiple layers:

### 1. File Validation Middleware
- **Extension validation**: Only allows approved fish finder file formats (.slg, .sl2, .sl3, .gpx, .adm, .dat, .son, .fsh)
- **MIME type checking**: Validates that file MIME types match expected formats
- **Size limits**: Enforces 500MB maximum file size
- **Magic number validation**: Checks file signatures to prevent extension spoofing
- **Filename sanitization**: Removes dangerous characters and prevents path traversal attacks

### 2. Rate Limiting
- **Granular limits**: Different limits for uploads, downloads, and API requests
- **Per-user tracking**: Authenticated users get individual rate limits
- **IP-based fallback**: Unauthenticated requests are limited by IP address
- **Sliding window algorithm**: Accurate rate limiting without burst allowances
- **Cloudflare Workers KV storage**: Distributed rate limiting across edge locations

Default limits:
- 10 uploads per hour per user
- 100 downloads per hour per user
- 1000 API requests per hour per IP

### 3. Input Sanitization
- **XSS prevention**: All user inputs are escaped to prevent cross-site scripting
- **SQL injection protection**: Input validation prevents SQL injection attacks
- **URL validation**: Checks URLs and query parameters for malicious patterns
- **Metadata sanitization**: Cleanses all metadata fields before storage

### 4. Security Headers
- **Content-Security-Policy (CSP)**: Restricts resource loading to prevent XSS
- **X-Frame-Options**: Prevents clickjacking attacks
- **X-Content-Type-Options**: Prevents MIME-type sniffing
- **Strict-Transport-Security (HSTS)**: Enforces HTTPS connections
- **X-XSS-Protection**: Legacy XSS protection for older browsers
- **Referrer-Policy**: Controls referrer information leakage
- **Permissions-Policy**: Restricts access to browser features

### 5. Authentication & Authorization
- **Supabase JWT verification**: Validates JWT tokens using HMAC-SHA256
- **Token expiration checking**: Rejects expired tokens
- **User extraction**: Extracts user information from verified tokens
- **Role-based access control**: Supports role-based permissions
- **Protected endpoints**: Critical operations require authentication

### 6. Malware Scanning
- **VirusTotal integration**: Optional malware scanning via VirusTotal API
- **Hash-based detection**: Checks files against known malware hashes
- **Heuristic analysis**: Detects suspicious file patterns
- **File quarantine**: Automatically quarantines detected threats
- **ClamAV support**: Optional ClamAV integration for self-hosted deployments

### 7. Error Handling
- **Centralized error management**: Consistent error responses across the API
- **Secure error messages**: Production mode hides sensitive error details
- **Comprehensive logging**: All errors are logged with context
- **Request tracking**: Unique request IDs for debugging
- **Proper HTTP status codes**: RESTful error responses

---

## Configuration

### Environment Variables

Create a `.env` file or configure environment variables in your Cloudflare Workers dashboard:

```bash
# Environment
ENVIRONMENT=production  # or 'development'

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_JWT_SECRET=your-jwt-secret

# VirusTotal API (optional)
VIRUSTOTAL_API_KEY=your-virustotal-api-key

# Security Configuration
MALWARE_SCAN_ENABLED=true
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Rate Limiting
RATE_LIMIT_UPLOADS_PER_HOUR=10
RATE_LIMIT_DOWNLOADS_PER_HOUR=100
RATE_LIMIT_API_REQUESTS_PER_HOUR=1000
```

### Wrangler Configuration

Update `wrangler.toml` to include the KV namespace binding:

```toml
[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "your-kv-namespace-id"
preview_id = "your-preview-kv-namespace-id"
```

Create KV namespaces:
```bash
wrangler kv:namespace create "RATE_LIMIT_KV"
wrangler kv:namespace create "RATE_LIMIT_KV" --preview
```

---

## Authentication & Authorization

### JWT Token Format

FishMap uses Supabase JWT tokens with the following structure:

```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "role": "authenticated",
  "aud": "authenticated",
  "exp": 1234567890,
  "iat": 1234567890
}
```

### Protected Endpoints

The following endpoints require authentication:

- `POST /api/waypoints/upload` (production only)
- `DELETE /api/waypoints/delete/:key`
- `GET /api/rate-limit-status`

### Authorization Header

Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### File Access Control

- Uploaded files are stored with user ID prefix: `uploads/{userId}/{filename}`
- Users can only download/delete their own files
- Unauthenticated users in development mode can upload to `uploads/anonymous/`

---

## Rate Limiting

### How It Works

1. Rate limits are tracked using Cloudflare Workers KV
2. Sliding window algorithm prevents burst abuse
3. Limits are applied per user (authenticated) or per IP (unauthenticated)
4. Different limits for different operation types

### Rate Limit Headers

API responses include rate limit information:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1234567890
```

### Rate Limit Exceeded Response

When rate limit is exceeded, you'll receive:

```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "type": "upload",
  "limit": 10,
  "retryAfter": 3600,
  "resetTime": "2024-01-01T12:00:00Z"
}
```

HTTP Status: `429 Too Many Requests`

### Checking Rate Limit Status

```bash
GET /api/rate-limit-status
Authorization: Bearer <token>
```

Response:
```json
{
  "upload": {
    "limit": 10,
    "remaining": 8,
    "resetTime": 1234567890
  },
  "download": {
    "limit": 100,
    "remaining": 95,
    "resetTime": 1234567890
  },
  "api": {
    "limit": 1000,
    "remaining": 950,
    "resetTime": 1234567890
  }
}
```

---

## File Upload Security

### Allowed File Types

Only the following file extensions are permitted:

- `.slg` - Lowrance sonar files
- `.sl2` - Lowrance sonar files
- `.sl3` - Lowrance sonar files
- `.gpx` - GPS Exchange Format
- `.adm` - AutoChart files
- `.dat` - Humminbird data files
- `.son` - Sonar data files
- `.fsh` - Fish finder files

### File Size Limits

Maximum file size: **500MB**

### Validation Process

1. **Extension check**: Verifies file has an allowed extension
2. **MIME type check**: Validates MIME type matches extension
3. **Size check**: Ensures file doesn't exceed size limit
4. **Magic number check**: Reads file header to verify format
5. **Filename sanitization**: Removes dangerous characters

### Upload Example

```bash
curl -X POST https://api.fishmap.com/api/waypoints/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@waypoints.gpx"
```

---

## Malware Scanning

### VirusTotal Integration

When enabled, all uploaded files are scanned using VirusTotal API:

1. **Hash calculation**: SHA-256 hash is computed
2. **Known hash check**: Checks against known malware database
3. **VirusTotal query**: Queries VirusTotal for existing scan results
4. **Heuristic analysis**: Performs pattern-based detection

### Configuration

Enable malware scanning:

```bash
MALWARE_SCAN_ENABLED=true
VIRUSTOTAL_API_KEY=your-api-key
```

### Scan Results

If malware is detected:

```json
{
  "error": "File rejected by security scan",
  "reason": "VirusTotal detected threats: 5/70 scanners flagged this file",
  "code": "MALWARE_DETECTED"
}
```

HTTP Status: `403 Forbidden`

### ClamAV Integration (Self-Hosted)

For self-hosted deployments, you can integrate ClamAV:

```typescript
import { scanWithClamAV } from './services/malwareScan';

const result = await scanWithClamAV(file, 'http://clamav-service:8080');
```

---

## Input Sanitization

### XSS Prevention

All user inputs are sanitized to prevent XSS attacks:

- HTML entities are escaped
- Script tags are removed
- Event handlers are stripped

### SQL Injection Prevention

For Supabase queries:

- Use parameterized queries (Supabase client handles this)
- Input validation removes SQL keywords
- Special characters are escaped

### Metadata Sanitization

All metadata fields are automatically sanitized:

```typescript
{
  "name": "My Waypoint <script>alert(1)</script>",
  // becomes
  "name": "My Waypoint &lt;script&gt;alert(1)&lt;/script&gt;"
}
```

---

## Security Headers

### Content Security Policy

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self';
  font-src 'self' data:;
  object-src 'none';
  media-src 'self';
  frame-src 'none'
```

### HSTS

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

### Other Headers

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

---

## Error Handling

### Error Response Format

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "statusCode": 400,
  "timestamp": "2024-01-01T12:00:00Z",
  "requestId": "req_1234567890_abc123",
  "path": "/api/waypoints/upload"
}
```

### Error Codes

Common error codes:

- `BAD_REQUEST`: Invalid request format or parameters
- `UNAUTHORIZED`: Authentication required or invalid
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `RATE_LIMIT_EXCEEDED`: Rate limit exceeded
- `INVALID_FILE`: File validation failed
- `MALWARE_DETECTED`: File failed security scan
- `INTERNAL_SERVER_ERROR`: Unexpected server error

### Development vs Production

**Development Mode:**
- Detailed error messages
- Stack traces included
- Full error context

**Production Mode:**
- Generic error messages
- No stack traces
- Minimal information exposure

---

## Deployment Best Practices

### 1. Use Production Environment

Always set `ENVIRONMENT=production` in production:

```bash
wrangler secret put ENVIRONMENT
# Enter: production
```

### 2. Secure Secrets

Use Wrangler secrets for sensitive values:

```bash
wrangler secret put SUPABASE_JWT_SECRET
wrangler secret put VIRUSTOTAL_API_KEY
```

Never commit secrets to version control.

### 3. Configure CORS Properly

In production, never use wildcard CORS:

```bash
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

### 4. Enable All Security Features

```bash
MALWARE_SCAN_ENABLED=true
RATE_LIMIT_KV=<kv-namespace-id>
SUPABASE_JWT_SECRET=<your-secret>
```

### 5. Use Custom Domain with HTTPS

- Configure a custom domain in Cloudflare
- Ensure HTTPS is enforced
- Consider using Cloudflare Access for additional protection

### 6. Regular Security Updates

- Keep dependencies updated
- Monitor security advisories
- Review and update rate limits based on usage patterns

### 7. Implement Monitoring

- Set up error tracking (e.g., Sentry)
- Monitor rate limit violations
- Track malware detection events
- Alert on unusual patterns

---

## Monitoring & Logging

### What to Monitor

1. **Rate Limit Violations**
   - Track which users/IPs are hitting limits
   - Adjust limits if needed

2. **Malware Detections**
   - Log all malware detection events
   - Quarantine suspicious files
   - Alert security team

3. **Authentication Failures**
   - Monitor failed auth attempts
   - Detect brute force attacks
   - Block suspicious IPs

4. **Error Rates**
   - Track 4xx and 5xx error rates
   - Investigate sudden spikes
   - Alert on critical errors

### Logging Best Practices

- Log security events with full context
- Include request IDs for tracing
- Sanitize logs to prevent sensitive data exposure
- Use structured logging (JSON format)
- Send logs to centralized logging service

### Example Log Entry

```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "level": "warn",
  "requestId": "req_1234567890_abc123",
  "userId": "user-123",
  "ip": "1.2.3.4",
  "event": "rate_limit_exceeded",
  "endpoint": "/api/waypoints/upload",
  "limit": 10,
  "attempts": 11
}
```

---

## Incident Response

### Response Procedure

1. **Detection**
   - Monitor alerts and logs
   - Identify security incident

2. **Containment**
   - Block malicious IPs via Cloudflare
   - Disable compromised accounts
   - Quarantine affected files

3. **Investigation**
   - Review logs and traces
   - Identify attack vector
   - Assess impact

4. **Remediation**
   - Patch vulnerabilities
   - Update security rules
   - Restore from backups if needed

5. **Recovery**
   - Verify systems are secure
   - Restore normal operations
   - Monitor for recurring issues

6. **Post-Incident**
   - Document incident
   - Update security procedures
   - Communicate with stakeholders

### Emergency Contacts

- Security Team: security@yourcompany.com
- DevOps Team: devops@yourcompany.com
- Cloudflare Support: [support.cloudflare.com](https://support.cloudflare.com)

### Incident Severity Levels

**Critical:** Production down or data breach
- Response time: Immediate
- Escalation: Notify all teams

**High:** Security vulnerability exploited
- Response time: Within 1 hour
- Escalation: Notify security team

**Medium:** Attempted attack detected
- Response time: Within 4 hours
- Escalation: Log and monitor

**Low:** Suspicious activity detected
- Response time: Within 24 hours
- Escalation: Log for analysis

---

## Vulnerability Reporting

### How to Report

If you discover a security vulnerability, please report it responsibly:

1. **Email**: security@yourcompany.com
2. **Subject**: Include "[SECURITY]" in subject line
3. **Details**: Provide detailed description and reproduction steps

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)
- Your contact information (optional for anonymity)

### Response Timeline

- **Acknowledgment**: Within 24 hours
- **Initial assessment**: Within 3 days
- **Fix implementation**: Based on severity
- **Disclosure**: Coordinated disclosure after fix

### Bug Bounty (Optional)

Consider implementing a bug bounty program:

- Set bounty amounts based on severity
- Define scope and rules
- Use platforms like HackerOne or Bugcrowd

---

## Security Checklist

Use this checklist for production deployments:

- [ ] `ENVIRONMENT` set to `production`
- [ ] All secrets configured via Wrangler secrets
- [ ] CORS configured with specific origins (no wildcards)
- [ ] Rate limiting enabled with KV namespace
- [ ] Malware scanning enabled
- [ ] JWT secret configured
- [ ] Custom domain with HTTPS
- [ ] Security headers enabled
- [ ] Error logging configured
- [ ] Monitoring and alerts set up
- [ ] Incident response plan documented
- [ ] Regular security audits scheduled
- [ ] Dependencies updated and vulnerability-free
- [ ] Backup and recovery procedures tested

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Cloudflare Workers Security](https://developers.cloudflare.com/workers/platform/security/)
- [Supabase Security](https://supabase.com/docs/guides/auth)
- [VirusTotal API](https://developers.virustotal.com/reference)
- [Web Security Academy](https://portswigger.net/web-security)

---

## Compliance

### Data Protection

FishMap handles user data in compliance with:

- GDPR (General Data Protection Regulation)
- CCPA (California Consumer Privacy Act)
- Other applicable data protection laws

### Data Retention

- Uploaded files: Retained until user deletion
- Logs: Retained for 90 days
- Quarantined files: Retained for 30 days, then deleted

### User Rights

Users have the right to:

- Access their data
- Delete their data
- Export their data
- Opt out of data collection

---

## Updates and Maintenance

This security documentation should be reviewed and updated:

- Quarterly for routine updates
- Immediately after security incidents
- When new features are added
- When security best practices change

**Last Updated**: 2024-01-01
**Version**: 1.0.0
