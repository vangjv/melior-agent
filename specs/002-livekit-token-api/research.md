# Research: LiveKit Token Generation API

**Feature**: 002-livekit-token-api  
**Date**: October 24, 2025  
**Status**: Phase 0 Complete

## Overview

This document consolidates research findings for implementing a LiveKit token generation API using Azure Functions TypeScript v4. The research addresses technical unknowns identified in the Technical Context section of plan.md and provides decision rationale for technology choices.

---

## Research Task 1: Mock Strategy for LiveKit SDK Testing

### Decision
Use dependency injection pattern with interface-based mocking for LiveKit SDK in unit tests. Integration tests will use actual LiveKit SDK with test credentials but will not connect to live servers.

### Rationale
- **Unit Tests**: Create `ILiveKitTokenGenerator` interface that the service depends on, allowing Jest mocks to replace the actual SDK
- **Integration Tests**: Use real SDK with valid test API keys to verify actual token generation and JWT structure validation
- **No Live Server Required**: LiveKit token generation is purely cryptographic (JWT signing) and doesn't require network calls to LiveKit servers
- Jest's `jest.mock()` can intercept the `@livekit/server-sdk` module import for fine-grained control

### Alternatives Considered
- **Mock entire SDK**: Too brittle, would not catch SDK API changes
- **Always use live SDK**: Rejected because it requires managing test credentials securely
- **Stub-based testing**: Less flexible than interface-based DI for complex scenarios

### Implementation Pattern
```typescript
// Service interface for DI
export interface ILiveKitTokenGenerator {
  generateToken(roomName: string, participantIdentity: string, options?: TokenOptions): Promise<string>;
}

// Unit test
const mockGenerator: ILiveKitTokenGenerator = {
  generateToken: jest.fn().mockResolvedValue('mock-jwt-token')
};

// Integration test
import { AccessToken } from '@livekit/server-sdk';
// Use real SDK with test credentials from environment
```

---

## Research Task 2: LiveKit SDK Initialization Overhead

### Decision
Initialize LiveKit SDK on first request with lazy initialization pattern. Cache the SDK configuration (API key/secret) but create new AccessToken instances per request.

### Rationale
- **Cold Start Mitigation**: Azure Functions cold starts are unavoidable, but we can minimize per-request overhead
- **Stateless Pattern**: Each token request creates a fresh `AccessToken` instance with specific room/identity
- **SDK Structure**: LiveKit's `AccessToken` class is lightweight and designed for per-request instantiation
- **Security**: Don't cache tokens themselves, only the SDK configuration

### Performance Characteristics
- First request (cold start): ~1-3 seconds (Azure Functions initialization)
- Subsequent requests: <50ms for token generation (JWT signing is fast)
- SDK initialization: ~10ms (reading config, no network calls)

### Alternatives Considered
- **Pre-warm instances**: Rejected as Azure Consumption plan doesn't support reserved instances
- **Token caching**: Rejected due to security concerns and requirement for unique participant identities
- **Singleton SDK**: Adopted - configuration cached, but token instances created per request

### Implementation Pattern
```typescript
let cachedApiKey: string | null = null;
let cachedApiSecret: string | null = null;

function getConfig(): { apiKey: string; apiSecret: string } {
  if (!cachedApiKey || !cachedApiSecret) {
    cachedApiKey = process.env.LIVEKIT_API_KEY!;
    cachedApiSecret = process.env.LIVEKIT_API_SECRET!;
  }
  return { apiKey: cachedApiKey, apiSecret: cachedApiSecret };
}
```

---

## Research Task 3: Azure Functions v4 Best Practices for TypeScript

### Decision
Use Azure Functions TypeScript v4 programming model with HTTP triggers, environment-based configuration, and structured logging.

### Rationale
- **V4 Programming Model**: Simpler decorator-based approach compared to v3, better TypeScript integration
- **Environment Variables**: Azure App Settings automatically map to `process.env` for configuration
- **Structured Logging**: Use `context.log` for Application Insights integration
- **Error Handling**: Return appropriate HTTP status codes with JSON error bodies

### Key Best Practices
1. **Input Validation**: Validate request body before processing
2. **CORS Configuration**: Set in `host.json` for all origins during development, restrict in production
3. **Secrets Management**: Use Azure Key Vault references in App Settings for production
4. **Monitoring**: Enable Application Insights for request tracing and performance metrics

### Implementation Pattern
```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export async function generateToken(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    context.log('Token generation request received');
    // Validation, token generation, response
    return { status: 200, jsonBody: { token, expiresAt } };
  } catch (error) {
    context.log.error('Token generation failed', error);
    return { status: 500, jsonBody: { error: 'Internal server error' } };
  }
}

app.http('generateToken', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: generateToken
});
```

---

## Research Task 4: LiveKit Token Security and Best Practices

### Decision
Generate tokens with limited scope (room-specific), 1-hour default expiration, and audio-only permissions. Store API credentials in Azure App Settings with Key Vault references.

### Rationale
- **Principle of Least Privilege**: Tokens grant only audio publish/subscribe permissions
- **Short-lived Tokens**: 1-hour expiration balances usability with security
- **Room Scoping**: Tokens are valid only for the specified room name
- **No Client Secrets**: API credentials never exposed to frontend

### Security Measures
1. **Credential Storage**: Use Azure Key Vault for LIVEKIT_API_KEY and LIVEKIT_API_SECRET
2. **Token Permissions**: Grant only `canPublish` and `canSubscribe` for audio tracks
3. **Expiration**: Default 1 hour, configurable via request parameter (max 24 hours)
4. **Input Sanitization**: Validate room names match pattern `^[a-zA-Z0-9_-]+$`
5. **Rate Limiting**: Will be added in future iteration with Azure API Management

### LiveKit Token Claims
```typescript
const token = new AccessToken(apiKey, apiSecret, {
  identity: participantIdentity, // Unique per user
  ttl: 3600, // 1 hour in seconds
});
token.addGrant({
  roomJoin: true,
  room: roomName,
  canPublish: true,
  canSubscribe: true,
});
```

---

## Research Task 5: CORS Configuration for Azure Functions

### Decision
Configure CORS in `host.json` for development and production environments. Use wildcard for local development, restrict to specific origins in production.

### Rationale
- **Development Flexibility**: Allow `http://localhost:4200` (Angular dev server) during local development
- **Production Security**: Whitelist only production frontend domain(s)
- **Preflight Support**: Azure Functions automatically handles OPTIONS requests when CORS is configured

### Configuration
```json
// host.json
{
  "version": "2.0",
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle",
    "version": "[4.*, 5.0.0)"
  },
  "cors": {
    "allowedOrigins": ["http://localhost:4200"],
    "supportCredentials": false
  }
}
```

### Alternatives Considered
- **Manual CORS Headers**: Rejected in favor of built-in Azure Functions CORS support
- **API Gateway CORS**: Deferred to future iteration when adding Azure API Management
- **Wildcard Origins**: Only for local development, never in production

---

## Technology Stack Summary

| Component | Technology | Version | Rationale |
|-----------|-----------|---------|-----------|
| Runtime | Node.js | 18 LTS | Required by Azure Functions v4 |
| Language | TypeScript | 5.x | Type safety, better DX |
| Framework | Azure Functions | v4 | Latest programming model |
| SDK | @livekit/server-sdk | Latest 2.x | Official LiveKit SDK |
| Testing | Jest | 29.x | Standard for TypeScript projects |
| Validation | Zod | 3.x | Runtime type validation |
| Logging | Azure App Insights | Built-in | Integrated monitoring |

---

## Open Questions Resolved

1. ✅ **Mock strategy**: Interface-based DI with Jest mocks
2. ✅ **SDK initialization**: Lazy initialization with cached config
3. ✅ **Testing approach**: Unit tests with mocks, integration tests with real SDK
4. ✅ **CORS setup**: Built-in Azure Functions CORS in host.json
5. ✅ **Security**: Key Vault for secrets, limited token permissions, short expiration

---

## Next Steps

Proceed to Phase 1:
- Generate `data-model.md` with TypeScript interfaces
- Create OpenAPI contract for `/api/token` endpoint
- Write `quickstart.md` for local development setup
- Update Copilot agent context with Azure Functions and LiveKit SDK
