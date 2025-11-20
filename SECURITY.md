# Security Policy

## Reporting Security Vulnerabilities

If you discover a security vulnerability in this project, please report it responsibly:

1. **DO NOT** create a public GitHub issue for security vulnerabilities
2. Email the maintainers directly with details about the vulnerability
3. Allow reasonable time for the issue to be addressed before public disclosure
4. Include steps to reproduce the vulnerability if possible

We take security seriously and will respond promptly to legitimate security concerns.

## Security Best Practices for Contributors

### Credentials and Secrets Management

**NEVER commit the following to version control:**
- API keys, tokens, or passwords
- Authentication credentials
- Private keys, certificates, or PEM files
- Real tenant IDs, client IDs, or application secrets
- LiveKit API keys or secrets
- Database connection strings
- Personal or production URLs

**Protected files:**
- `src/environments/*.local.ts` - Git-ignored for local development
- `api/local.settings.json` - Git-ignored for API secrets
- `.env` files - Always git-ignored
- Any file containing real credentials

**Safe practices:**
- Use `.example` files with placeholder values
- Store secrets in environment variables or secure vaults (e.g., Azure Key Vault)
- Use different credentials for development, staging, and production
- Rotate credentials immediately if accidentally exposed
- Use the provided `.local.ts` pattern for local development

### Dependency Security

**Regular maintenance:**
```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities automatically where possible
npm audit fix

# For breaking changes, review and update manually
npm audit fix --force  # Use with caution
```

**Best practices:**
- Keep dependencies updated regularly
- Review security advisories for critical dependencies
- Use `npm audit` in CI/CD pipelines
- Pin versions in production for stability
- Test thoroughly after dependency updates

### Authentication Security

This application uses **Microsoft Entra External ID** for authentication:

**Security features:**
- PKCE (Proof Key for Code Exchange) flow for SPAs
- JWT token validation on backend
- Token expiration with clock skew tolerance
- Audience and issuer validation
- Secure token storage in sessionStorage

**Configuration security:**
- Never expose client secrets in frontend code
- Use appropriate scopes (principle of least privilege)
- Configure CORS properly for your domains only
- Use HTTPS in production (required for MSAL)
- Set appropriate token expiration times

### Logging Security

**Production logging rules:**
- NEVER log authentication tokens or API keys
- NEVER log passwords or sensitive user data
- Sanitize user input before logging
- Use appropriate log levels (error, warn, info, debug)
- Disable debug logging in production

**Use the Logger utility:**
```typescript
import { Logger } from './utils/logger.util';

// Automatically sanitizes sensitive data
Logger.debug('User action', { userId, token }); // token will be [REDACTED]
Logger.error('API error', error);
```

### Content Security

**Input validation:**
- Validate all user inputs on both frontend and backend
- Use Angular's built-in sanitization (enabled by default)
- Validate data types, lengths, and formats
- Reject malformed or suspicious input

**XSS Prevention:**
- Angular templates auto-escape by default (keep this enabled)
- Use `DomSanitizer` only when absolutely necessary
- Never use `innerHTML` with unsanitized content
- Validate and sanitize data from external sources

### API Security

**Backend protection:**
- All API endpoints require authentication (via MsalInterceptor)
- JWT tokens validated on every request
- CORS configured for specific domains only
- Rate limiting recommended for production
- Input validation using Zod schemas

**Request security:**
- Use HTTPS in production
- Include authentication tokens in headers only (not in URLs)
- Validate request origin
- Implement CSRF protection where needed

### Data Storage Security

**Browser storage:**
- Use `sessionStorage` for temporary data (cleared on tab close)
- Avoid `localStorage` for sensitive data (persists indefinitely)
- Never store tokens, passwords, or secrets in storage
- Encrypt sensitive data before storing locally

**Backend storage:**
- Never log sensitive data to Azure Functions logs
- Use secure environment variables for secrets
- Implement proper access controls
- Encrypt data at rest and in transit

## Security Headers (Recommended for Production)

Configure these security headers in your hosting environment:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(self), camera=()
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

## CORS Configuration

**Development:**
```json
{
  "Host": {
    "CORS": "http://localhost:4200",
    "CORSCredentials": false
  }
}
```

**Production:**
```json
{
  "Host": {
    "CORS": "https://your-production-domain.com",
    "CORSCredentials": true
  }
}
```

Always restrict CORS to specific, trusted domains.

## Deployment Security Checklist

Before deploying to production:

- [ ] All secrets removed from source code
- [ ] Environment variables configured in hosting platform
- [ ] HTTPS enabled and enforced
- [ ] CORS restricted to production domains
- [ ] Security headers configured
- [ ] Debug logging disabled
- [ ] `piiLoggingEnabled: false` in MSAL config
- [ ] Dependencies updated and audited
- [ ] Authentication tested thoroughly
- [ ] CSP headers configured appropriately
- [ ] Rate limiting implemented (if applicable)
- [ ] Monitoring and alerting configured

## Incident Response

If credentials are accidentally committed:

1. **Immediately revoke** the exposed credentials
2. Generate new credentials
3. Update deployed applications with new credentials
4. Remove the commit from Git history (use `git filter-branch` or BFG Repo-Cleaner)
5. Force push to remote repository (coordinate with team)
6. Review access logs for unauthorized usage
7. Document the incident and improve processes

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Angular Security Guide](https://angular.dev/best-practices/security)
- [Microsoft Entra Security Best Practices](https://learn.microsoft.com/en-us/entra/identity-platform/security-best-practices)
- [Azure Functions Security](https://learn.microsoft.com/en-us/azure/azure-functions/security-concepts)
- [LiveKit Security](https://docs.livekit.io/guides/deploy/security/)

## Security Updates

This security policy is regularly reviewed and updated. Last updated: 2025-11-20

For questions about security practices, please contact the maintainers.
