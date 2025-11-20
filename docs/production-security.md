# Production Security Configuration Guide

This document provides recommended security configurations for deploying the Melior Agent application to production.

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [Security Headers](#security-headers)
3. [Content Security Policy (CSP)](#content-security-policy-csp)
4. [CORS Configuration](#cors-configuration)
5. [Azure Static Web Apps Configuration](#azure-static-web-apps-configuration)
6. [Azure Functions Configuration](#azure-functions-configuration)
7. [Deployment Checklist](#deployment-checklist)

## Environment Variables

### Frontend (Angular)

Set these environment variables in your hosting platform (Azure Static Web Apps, Netlify, Vercel, etc.):

```bash
# Required
ENTRA_CLIENT_ID=your-client-id-from-azure
ENTRA_TENANT_ID=your-tenant-id-from-azure
ENTRA_AUTHORITY=https://login.microsoftonline.com/your-tenant-id
TOKEN_API_URL=https://your-api.azurewebsites.net/api
LIVEKIT_URL=wss://your-project.livekit.cloud

# Production URLs
REDIRECT_URI=https://your-production-domain.com
POST_LOGOUT_REDIRECT_URI=https://your-production-domain.com
```

### Backend (Azure Functions)

Configure in Azure Portal → Function App → Configuration → Application Settings:

```bash
# Required
LIVEKIT_API_KEY=your-livekit-api-key
LIVEKIT_API_SECRET=your-livekit-api-secret
ENTRA_CLIENT_ID=your-client-id-from-azure
ENTRA_TENANT_ID=your-tenant-id-from-azure
ENTRA_AUTHORITY=https://login.microsoftonline.com/your-tenant-id

# Azure Functions Runtime
FUNCTIONS_WORKER_RUNTIME=node
```

## Security Headers

### Recommended HTTP Headers

Configure these headers in your hosting platform:

```
# Prevent clickjacking attacks
X-Frame-Options: DENY

# Prevent MIME type sniffing
X-Content-Type-Options: nosniff

# Enable browser XSS protection (legacy browsers)
X-XSS-Protection: 1; mode=block

# Control referrer information
Referrer-Policy: strict-origin-when-cross-origin

# Enforce HTTPS (HSTS)
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

# Permissions Policy (limit browser features)
Permissions-Policy: geolocation=(), camera=(), microphone=(self), payment=(), usb=()
```

## Content Security Policy (CSP)

### Basic CSP for Angular Application

```
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https:;
  connect-src 'self' 
    https://your-api.azurewebsites.net 
    wss://your-project.livekit.cloud 
    https://login.microsoftonline.com 
    https://graph.microsoft.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

### Strict CSP (Production Recommended)

For enhanced security, remove `unsafe-inline` and `unsafe-eval` by:
1. Using Angular's native CSP support
2. Hashing inline scripts and styles
3. Moving all JavaScript to external files

```
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'sha256-{hash-of-inline-scripts}';
  style-src 'self' 'sha256-{hash-of-inline-styles}' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https:;
  connect-src 'self' 
    https://your-api.azurewebsites.net 
    wss://your-project.livekit.cloud 
    https://login.microsoftonline.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
```

### CSP Reporting

Add reporting to monitor CSP violations:

```
Content-Security-Policy-Report-Only: 
  default-src 'self'; 
  report-uri https://your-domain.com/csp-report;
```

## CORS Configuration

### Azure Functions CORS

#### Development (local.settings.json)
```json
{
  "Host": {
    "CORS": "http://localhost:4200",
    "CORSCredentials": false
  }
}
```

#### Production (Azure Portal Configuration)

1. Go to Azure Portal → Function App → CORS
2. Add your production domain(s):
   - `https://your-production-domain.com`
   - Do NOT use wildcard (`*`) in production
3. Enable "Support Credentials" if needed (for authentication)
4. Remove all development URLs (`http://localhost:*`)

#### CORS via host.json
```json
{
  "version": "2.0",
  "extensions": {
    "http": {
      "customHeaders": {
        "Access-Control-Allow-Origin": "https://your-production-domain.com",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400"
      }
    }
  }
}
```

## Azure Static Web Apps Configuration

### staticwebapp.config.json

Create this file in the root of your project:

```json
{
  "globalHeaders": {
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), camera=(), microphone=(self)"
  },
  "routes": [
    {
      "route": "/*",
      "headers": {
        "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; connect-src 'self' https://your-api.azurewebsites.net wss://your-project.livekit.cloud https://login.microsoftonline.com"
      }
    }
  ],
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/images/*.{png,jpg,gif,ico}", "/css/*", "/*.{js,json,map}"]
  },
  "mimeTypes": {
    ".json": "application/json",
    ".js": "application/javascript",
    ".wasm": "application/wasm"
  }
}
```

## Azure Functions Configuration

### Function-level Security

#### function.json (for each function)
```json
{
  "bindings": [
    {
      "authLevel": "anonymous",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["post"],
      "route": "token"
    }
  ]
}
```

**Note:** Set `authLevel` to `"anonymous"` because we handle authentication via JWT validation middleware, not Azure Functions built-in auth.

### Application Settings Security

Enable these features in Azure Portal:

1. **HTTPS Only**: Function App → Configuration → General settings → HTTPS Only: On
2. **Minimum TLS Version**: Set to 1.2
3. **FTP State**: Disabled (unless required)
4. **Remote Debugging**: Disabled in production
5. **Managed Identity**: Enable system-assigned identity for Azure resource access

## Deployment Checklist

Before deploying to production, verify:

### Frontend
- [ ] All secrets removed from environment files
- [ ] Environment variables configured in hosting platform
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] CSP implemented and tested
- [ ] CORS properly restricted
- [ ] Debug logging disabled (`production: true`)
- [ ] Source maps disabled or restricted
- [ ] Bundle size within limits
- [ ] Dependencies audited (`npm audit`)

### Backend
- [ ] API keys stored in Azure Key Vault or App Settings
- [ ] CORS restricted to production domain(s)
- [ ] HTTPS Only enabled
- [ ] TLS 1.2 minimum enforced
- [ ] Remote debugging disabled
- [ ] Application Insights enabled for monitoring
- [ ] Rate limiting implemented (via API Management or custom)
- [ ] JWT token validation working correctly
- [ ] Error messages sanitized (no stack traces to client)

### Authentication
- [ ] Microsoft Entra app registration configured for production
- [ ] Redirect URIs updated with production URLs
- [ ] Logout URIs configured correctly
- [ ] Token lifetimes appropriate for security requirements
- [ ] Conditional Access policies reviewed (if applicable)
- [ ] MFA enforced for admin accounts

### LiveKit
- [ ] LiveKit Cloud account in production tier
- [ ] API keys rotated from development values
- [ ] Room permissions properly configured
- [ ] Token expiration times appropriate
- [ ] Recording/transcription features configured as needed

### Monitoring
- [ ] Application Insights or equivalent monitoring enabled
- [ ] Error alerting configured
- [ ] Performance monitoring active
- [ ] Security alerts enabled
- [ ] Audit logging enabled for sensitive operations

### Compliance
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Cookie consent implemented (if required)
- [ ] GDPR/data protection compliance verified
- [ ] Data retention policies defined and implemented

## Testing Production Configuration

### Security Headers Testing

Use these tools to verify headers:
- [Security Headers](https://securityheaders.com/)
- [Mozilla Observatory](https://observatory.mozilla.org/)
- Browser DevTools → Network tab → Headers

### CSP Testing

1. Start with `Content-Security-Policy-Report-Only`
2. Monitor CSP reports for violations
3. Adjust policy as needed
4. Switch to enforcing mode: `Content-Security-Policy`

### Authentication Testing

Verify:
1. Sign-in flow completes successfully
2. Redirect URIs work correctly
3. Token refresh works without errors
4. Sign-out clears session properly
5. Protected routes require authentication
6. Invalid tokens are rejected

### CORS Testing

Test from your production domain:
```javascript
// Browser console on your production site
fetch('https://your-api.azurewebsites.net/api/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-token'
  },
  body: JSON.stringify({
    roomName: 'test',
    participantIdentity: 'test-user'
  })
})
.then(response => response.json())
.then(data => console.log('CORS working:', data))
.catch(error => console.error('CORS error:', error));
```

## Additional Resources

- [Azure Security Best Practices](https://learn.microsoft.com/en-us/azure/security/fundamentals/best-practices-and-patterns)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Angular Security Guide](https://angular.dev/best-practices/security)
- [Microsoft Entra Security](https://learn.microsoft.com/en-us/entra/identity-platform/security-best-practices)
- [LiveKit Security Guide](https://docs.livekit.io/guides/deploy/security/)

## Support

For security questions or concerns, see [SECURITY.md](./SECURITY.md).
