# Data Model: Microsoft Entra External ID Authentication

**Feature**: 004-entra-external-id-auth  
**Date**: 2025-10-25  
**Reference**: [spec.md](./spec.md)

## Overview

This document defines the data models and state structures for authentication in both the Angular frontend and Azure Functions backend. All models use TypeScript interfaces with strict typing.

---

## Frontend Models (Angular)

### AuthenticationState

Represents the current authentication status of the application.

```typescript
interface AuthenticationState {
  readonly status: 'unauthenticated' | 'authenticating' | 'authenticated' | 'error';
  readonly user: UserProfile | null;
  readonly error: AuthError | null;
  readonly isLoading: boolean;
}
```

**Fields**:
- `status`: Current authentication status (discriminated union key)
- `user`: User profile information when authenticated, null otherwise
- `error`: Error details when status is 'error', null otherwise
- `isLoading`: Boolean flag for UI loading states during authentication operations

**State Transitions**:
- `unauthenticated` → `authenticating`: User clicks "Sign In"
- `authenticating` → `authenticated`: Successful token acquisition
- `authenticating` → `error`: Authentication fails
- `authenticated` → `unauthenticated`: User signs out or token invalidated
- `error` → `authenticating`: User retries authentication

**Validation Rules**:
- When `status` is `authenticated`, `user` MUST NOT be null
- When `status` is `error`, `error` MUST NOT be null
- `isLoading` is true only when `status` is `authenticating`

---

### UserProfile

Represents an authenticated user's identity information from Microsoft Entra.

```typescript
interface UserProfile {
  readonly userId: string;           // Unique identifier (oid claim)
  readonly email: string;            // User's email address
  readonly displayName: string;      // User's full name
  readonly givenName?: string;       // First name (optional)
  readonly surname?: string;         // Last name (optional)
  readonly username: string;         // Username/UPN
  readonly tenantId: string;         // Tenant ID from token
}
```

**Fields**:
- `userId`: Microsoft Entra object ID (OID claim), immutable unique identifier
- `email`: User's primary email address from token claims
- `displayName`: User's display name for UI presentation
- `givenName`: First name (optional, may not be in all tokens)
- `surname`: Last name (optional, may not be in all tokens)
- `username`: User principal name (UPN) or username
- `tenantId`: Tenant ID the user belongs to

**Validation Rules**:
- `userId` MUST match regex: `^[a-f0-9-]{36}$` (UUID format)
- `email` MUST be valid email format
- `displayName` MUST NOT be empty string
- All fields derived from validated Microsoft Entra token claims

**Source**: Extracted from MSAL `AccountInfo` object after successful authentication

---

### AuthConfig

MSAL Browser configuration for Microsoft Entra External ID.

```typescript
interface AuthConfig {
  readonly auth: {
    readonly clientId: string;
    readonly authority: string;
    readonly redirectUri: string;
    readonly postLogoutRedirectUri: string;
  };
  readonly cache: {
    readonly cacheLocation: 'sessionStorage' | 'localStorage';
    readonly storeAuthStateInCookie: boolean;
  };
  readonly system: {
    readonly loggerOptions: {
      readonly logLevel: 'Error' | 'Warning' | 'Info' | 'Verbose';
      readonly piiLoggingEnabled: boolean;
    };
  };
}
```

**Fields**:
- `auth.clientId`: Application (client) ID from Azure portal
- `auth.authority`: Microsoft Entra authority URL with tenant ID
- `auth.redirectUri`: OAuth callback URL for redirect flow
- `auth.postLogoutRedirectUri`: Where to redirect after sign-out
- `cache.cacheLocation`: Browser storage for token cache
- `cache.storeAuthStateInCookie`: IE11 compatibility (false for modern browsers)
- `system.loggerOptions.logLevel`: MSAL logging level
- `system.loggerOptions.piiLoggingEnabled`: Never enable in production (false)

**Validation Rules**:
- `clientId` MUST be valid GUID format
- `authority` MUST be HTTPS URL
- `redirectUri` MUST match registered redirect URI in Azure portal
- `logLevel` MUST be 'Error' in production
- `piiLoggingEnabled` MUST be false in production

**Source**: Loaded from Angular environment configuration

---

### AuthError

Discriminated union for authentication errors.

```typescript
type AuthErrorCode = 
  | 'user_cancelled'
  | 'network_error'
  | 'invalid_credentials'
  | 'token_expired'
  | 'token_refresh_failed'
  | 'configuration_error'
  | 'unknown_error';

interface AuthError {
  readonly code: AuthErrorCode;
  readonly message: string;
  readonly userMessage: string;      // User-friendly message for UI
  readonly timestamp: Date;
  readonly retryable: boolean;       // Can user retry the operation?
}
```

**Fields**:
- `code`: Error type identifier for programmatic handling
- `message`: Technical error message for logging
- `userMessage`: User-friendly message to display in UI
- `timestamp`: When the error occurred
- `retryable`: Whether user should be offered a retry option

**Error Code Mapping**:
- `user_cancelled`: User closed sign-in popup/redirect → retryable: true
- `network_error`: Network connectivity issue → retryable: true
- `invalid_credentials`: Bad username/password → retryable: true
- `token_expired`: Token expired during operation → retryable: true (auto-refresh)
- `token_refresh_failed`: Silent token refresh failed → retryable: true (redirect to sign-in)
- `configuration_error`: MSAL config invalid → retryable: false (admin must fix)
- `unknown_error`: Unexpected error → retryable: true

**Validation Rules**:
- `userMessage` MUST be non-technical language
- `userMessage` MUST NOT expose sensitive details (tokens, internal errors)
- `retryable` true requires clear retry action in UI

---

### RouteGuardContext

Context passed through route guard for authentication checks.

```typescript
interface RouteGuardContext {
  readonly requestedUrl: string;     // Full URL path user attempted to access
  readonly isAuthenticated: boolean; // Current auth status
  readonly requiresAuth: boolean;    // Does route require authentication?
}
```

**Fields**:
- `requestedUrl`: The route URL the user tried to navigate to
- `isAuthenticated`: Whether user is currently authenticated
- `requiresAuth`: Whether the target route requires authentication

**Usage**:
- Stored in sessionStorage when unauthenticated user accesses protected route
- Retrieved after successful authentication to redirect to originally requested URL
- Cleared after successful redirect or on sign-out

**Validation Rules**:
- `requestedUrl` MUST be valid relative or absolute URL path
- When `!isAuthenticated && requiresAuth`, trigger sign-in flow
- After auth, redirect to `requestedUrl` if not root

---

### TokenRequest

Parameters for MSAL token acquisition requests.

```typescript
interface TokenRequest {
  readonly scopes: string[];         // OAuth scopes to request
  readonly account?: AccountInfo;    // User account hint for silent requests
  readonly forceRefresh?: boolean;   // Force token refresh (bypass cache)
}
```

**Fields**:
- `scopes`: Array of OAuth scopes (e.g., ['openid', 'profile', 'email'])
- `account`: Optional account hint for silent token acquisition
- `forceRefresh`: If true, bypass token cache and acquire new token

**Default Scopes**:
- Minimum: `['openid', 'profile', 'email']`
- Additional: `['User.Read']` for Microsoft Graph access (if needed)

**Validation Rules**:
- `scopes` MUST NOT be empty array
- `scopes` MUST contain at least 'openid'
- When using `acquireTokenSilent`, `account` SHOULD be provided

---

## Backend Models (Azure Functions)

### UserIdentity

User identity information extracted from validated JWT token.

```typescript
interface UserIdentity {
  readonly userId: string;           // Object ID from token (oid claim)
  readonly email: string;            // Email from token claims
  readonly displayName: string;      // Display name from token
  readonly tenantId: string;         // Tenant ID from token
  readonly roles?: string[];         // Optional: User roles (if using app roles)
}
```

**Fields**:
- `userId`: User's unique identifier (oid claim from token)
- `email`: User's email address (email or preferred_username claim)
- `displayName`: User's display name (name claim)
- `tenantId`: Tenant the user belongs to (tid claim)
- `roles`: Optional array of role claims (for future RBAC)

**Validation Rules**:
- All fields extracted from validated token claims only
- `userId` MUST match the oid claim from token
- `tenantId` MUST match expected tenant ID in configuration
- If `roles` present, MUST be non-empty array

**Source**: Extracted from JWT claims after successful token validation

---

### TokenValidationResult

Result of JWT token validation in Azure Functions middleware.

```typescript
interface TokenValidationResult {
  readonly isValid: boolean;
  readonly userIdentity?: UserIdentity;
  readonly error?: AuthErrorResponse;
}
```

**Fields**:
- `isValid`: Whether token passed validation
- `userIdentity`: User details if validation succeeded
- `error`: Error details if validation failed

**State Transitions**:
- Valid token → `isValid: true`, `userIdentity` populated, `error` undefined
- Invalid token → `isValid: false`, `userIdentity` undefined, `error` populated

**Validation Rules**:
- When `isValid` is true, `userIdentity` MUST be present
- When `isValid` is false, `error` MUST be present
- `isValid` and `error` are mutually exclusive

---

### AuthErrorResponse

Structured error response for authentication failures in API.

```typescript
interface AuthErrorResponse {
  readonly error: {
    readonly code: string;           // Error code (e.g., 'invalid_token')
    readonly message: string;        // Error description
    readonly statusCode: number;     // HTTP status code (401, 403)
  };
  readonly timestamp: string;        // ISO 8601 timestamp
  readonly path: string;             // Request path that failed
}
```

**Fields**:
- `error.code`: Machine-readable error code
- `error.message`: Human-readable error description
- `error.statusCode`: HTTP status code (401 for auth errors)
- `timestamp`: When the error occurred (ISO 8601 format)
- `path`: The API endpoint that was called

**Common Error Codes**:
- `missing_token`: No Authorization header provided
- `invalid_token`: Token signature invalid or malformed
- `expired_token`: Token past expiration time
- `invalid_audience`: Token audience doesn't match Client ID
- `invalid_issuer`: Token issuer doesn't match expected authority
- `insufficient_scope`: Token doesn't have required scopes

**Validation Rules**:
- `statusCode` MUST be 401 for authentication errors
- `timestamp` MUST be ISO 8601 format
- `path` MUST match request URL path
- `code` MUST be one of the predefined error codes

---

### LiveKitTokenMetadata

Extended metadata to include in LiveKit token for authenticated users.

```typescript
interface LiveKitTokenMetadata {
  readonly userId: string;           // Microsoft Entra user ID
  readonly displayName: string;      // User's display name for LiveKit UI
  readonly email?: string;           // Optional: User email
  readonly tenantId: string;         // Tenant ID for multi-tenant scenarios
}
```

**Fields**:
- `userId`: User's Microsoft Entra object ID (for auditing)
- `displayName`: User's name to display in LiveKit participant list
- `email`: Optional user email for logging/auditing
- `tenantId`: Tenant ID for potential multi-tenant support

**Usage**:
- Embedded in LiveKit token when generating tokens for authenticated users
- Allows LiveKit server to identify users by their Entra identity
- Enables per-user analytics and audit logging

**Validation Rules**:
- `userId` MUST match the authenticated user's Entra ID
- `displayName` MUST NOT be empty
- All fields must be JSON-serializable strings

---

## State Diagram

### Frontend Authentication Flow

```
[Unauthenticated] 
      ↓
   (User clicks "Sign In")
      ↓
[Authenticating] ←──────┐
      ↓                 │
   (MSAL redirect)      │
      ↓                 │
   (Token acquired)     │
      ↓                 │
[Authenticated] ────────┘
      ↓              (Token refresh)
   (User clicks "Sign Out")
      ↓
[Unauthenticated]

Error transitions:
[Authenticating] → [Error] (auth fails)
[Error] → [Authenticating] (user retries)
[Authenticated] → [Unauthenticated] (token invalid)
```

---

## Relationships

### Frontend
- `AuthenticationState` contains `UserProfile` (1:0..1 relationship)
- `AuthenticationState` contains `AuthError` (1:0..1 relationship)
- `RouteGuardContext` uses `AuthenticationState.isAuthenticated` for decisions
- `TokenRequest` produces `UserProfile` via MSAL token acquisition

### Backend
- `TokenValidationResult` contains `UserIdentity` (1:0..1 relationship)
- `TokenValidationResult` contains `AuthErrorResponse` (1:0..1 relationship)
- `UserIdentity` used to create `LiveKitTokenMetadata` (1:1 relationship)

### Cross-Layer
- Frontend `UserProfile` and backend `UserIdentity` represent same user (derived from same token)
- Frontend stores access token, backend validates same token
- `userId` field is consistent across both layers (oid claim)

---

## Persistence

### Frontend Storage
- **AuthenticationState**: In-memory Angular Signal (not persisted)
- **MSAL Token Cache**: sessionStorage (default) or localStorage (configurable)
- **RouteGuardContext.requestedUrl**: sessionStorage (cleared after redirect)

### Backend Storage
- **No persistent storage**: Azure Functions are stateless
- **Token validation keys**: Cached in-memory by MSAL Node (refreshed periodically)

---

## Security Considerations

1. **Token Storage**: Never store tokens in plain text, leverage MSAL's secure cache
2. **PII Logging**: Never log `UserProfile` or `UserIdentity` fields to console
3. **Token Exposure**: Never include tokens in URLs, query params, or error messages
4. **XSS Protection**: Sanitize all user-provided fields (displayName, email) before rendering
5. **CSRF Protection**: PKCE flow provides CSRF protection for authorization code exchange

---

## Migration Notes

**From unauthenticated to authenticated state**:
- Existing sessionStorage data (transcription history) is preserved
- No data migration required - authentication is additive

**Future considerations**:
- Role-based access control (RBAC): Extend `UserIdentity` and `UserProfile` with `roles` field
- Multi-tenant support: Already supported via `tenantId` field
- Offline support: Not applicable for authentication (requires online connectivity)

---

**Data Model Complete**: All entities, relationships, and validation rules defined. Ready to proceed to contract generation.
