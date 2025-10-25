# Research: Microsoft Entra External ID Authentication

**Feature**: 004-entra-external-id-auth  
**Date**: 2025-10-25  
**Status**: Complete

## Research Areas

### 1. MSAL Browser Integration with Angular

**Decision**: Use `@azure/msal-browser` v3.x with Angular-specific wrapper service

**Rationale**: 
- MSAL Browser provides official Microsoft support for browser-based authentication
- Version 3.x supports PKCE flow by default for enhanced security
- Integrates well with Angular's dependency injection through wrapper service
- Provides built-in token caching with configurable storage (sessionStorage/localStorage)
- Supports redirect flow which is more reliable than popup for mobile devices
- Official Microsoft library reduces security vulnerabilities vs custom implementation

**Alternatives Considered**:
- **@azure/msal-angular**: Dedicated Angular wrapper library
  - Rejected: v3 of msal-angular has limitations with Angular 19+ standalone components and signal-based state
  - Our custom service wrapper provides better control over Signal-based reactive state
- **Custom OAuth2 implementation**: Build authentication from scratch
  - Rejected: Higher security risk, more maintenance burden, lacks Microsoft's ongoing security updates
- **Popup-based flow**: Use MSAL popup instead of redirect
  - Rejected: Spec explicitly requires redirect flow, and popups have issues with mobile browsers and popup blockers

**Implementation Notes**:
- Initialize MSAL instance in auth service constructor
- Configure redirect URIs to handle OAuth callback
- Use `acquireTokenSilent()` for automatic token refresh
- Implement `MsalGuard` equivalent using Angular functional guards
- Store auth state in Angular Signal for reactive updates

---

### 2. Token Validation in Azure Functions

**Decision**: Use `@azure/msal-node` for JWT validation with Microsoft's public keys

**Rationale**:
- Official Microsoft library for Node.js token validation
- Automatically fetches and caches Microsoft Entra's public signing keys
- Handles token signature verification, expiration, and audience validation
- Built-in support for clock skew tolerance (configurable, default 5 minutes)
- Provides type-safe access to token claims (user ID, email, name)
- Reduces vulnerability to JWT validation attacks (algorithm confusion, etc.)

**Alternatives Considered**:
- **jsonwebtoken + jwks-rsa**: Generic JWT libraries
  - Rejected: More configuration required, higher risk of misconfiguration, lacks Entra-specific optimizations
- **Passport.js with Azure AD strategy**: Popular Node.js auth middleware
  - Rejected: Adds unnecessary abstraction layer for stateless Azure Functions, heavier dependency footprint
- **Custom JWT validation**: Manual token parsing and validation
  - Rejected: High security risk, complex key rotation handling, no ongoing security updates

**Implementation Notes**:
- Create auth middleware function for Azure Functions
- Configure with Tenant ID and expected Client ID (audience)
- Extract user claims from validated token
- Return 401 Unauthorized with structured error for validation failures
- Add middleware to all protected Azure Function endpoints

---

### 3. Angular Route Guards with Redirect Flow

**Decision**: Implement functional route guard using Angular's `CanActivateFn` with MSAL redirect

**Rationale**:
- Functional guards align with Angular 19+ standalone component architecture
- More flexible and testable than class-based guards
- Can easily inject auth service and handle async MSAL operations
- Supports preserving requested URL for post-authentication redirect
- Works seamlessly with Angular Router's navigation lifecycle

**Alternatives Considered**:
- **Class-based CanActivate guard**: Traditional Angular guard pattern
  - Rejected: Angular is moving away from class-based guards in favor of functional guards
  - Less composable and harder to test in isolation
- **Manual route checking in components**: Each component checks auth status
  - Rejected: Violates DRY principle, error-prone, harder to maintain consistently

**Implementation Notes**:
- Create `authGuard: CanActivateFn` function
- Check authentication state from auth service Signal
- Store requested URL in session for post-auth redirect
- Return `true` for authenticated users, trigger redirect and return `false` for unauthenticated
- Apply guard to all voice feature routes in routing configuration

---

### 4. HTTP Interceptor for Bearer Token Injection

**Decision**: Create Angular HTTP interceptor to automatically add Authorization header

**Rationale**:
- Centralized token management for all HTTP requests
- Eliminates manual token handling in every service call
- Can selectively add tokens only to Azure Functions API calls
- Supports automatic token refresh before request if token expired
- Aligns with Angular best practices for cross-cutting concerns

**Alternatives Considered**:
- **Manual token injection in each service**: Add auth header in service methods
  - Rejected: Violates DRY, easy to forget, maintenance burden
- **Base HTTP service class**: Create wrapper around HttpClient
  - Rejected: Interceptors are more Angular-idiomatic and require less boilerplate

**Implementation Notes**:
- Implement `HttpInterceptorFn` functional interceptor
- Check if request URL targets Azure Functions API
- Acquire token silently from MSAL
- Clone request and add `Authorization: Bearer <token>` header
- Handle token acquisition failures gracefully

---

### 5. Authentication State Management with Signals

**Decision**: Use Angular Signals for reactive authentication state (authenticated, user profile, loading, error)

**Rationale**:
- Signals provide fine-grained reactivity without Zone.js (app uses zoneless change detection)
- Computed signals automatically derive auth state changes
- Better performance than RxJS Subject for simple state management
- Easier to test and reason about than observable streams
- Aligns with Angular 19+ best practices and future direction

**Alternatives Considered**:
- **RxJS BehaviorSubject**: Traditional reactive state pattern
  - Rejected: More complex for simple state needs, requires subscription management, not optimal for zoneless app
- **NgRx Store**: Full state management solution
  - Rejected: Overkill for authentication state, adds complexity and bundle size for minimal benefit
- **Service with getters/setters**: Imperative state management
  - Rejected: No reactivity, components must poll for changes, poor UX

**Implementation Notes**:
- Private `WritableSignal` for mutable state in auth service
- Public readonly `Signal` for components to read state
- `computed()` signals for derived state (isAuthenticated, userName, etc.)
- `effect()` for side effects like logging auth state changes

---

### 6. PKCE Flow Implementation

**Decision**: Enable PKCE (Proof Key for Code Exchange) in MSAL Browser configuration

**Rationale**:
- PKCE prevents authorization code interception attacks
- Required security standard for public clients (SPAs)
- MSAL Browser v3+ enables PKCE by default
- No additional configuration needed beyond enabling in MSAL config
- Spec FR-021 explicitly requires PKCE

**Alternatives Considered**:
- **Standard OAuth2 authorization code flow without PKCE**: Original OAuth spec
  - Rejected: Less secure for SPAs, doesn't meet spec requirements

**Implementation Notes**:
- PKCE enabled by default in MSAL Browser v3+
- Verify configuration includes auth code flow settings
- No custom PKCE implementation needed

---

### 7. Token Storage Security

**Decision**: Use MSAL's default token cache with sessionStorage, allow configuration for localStorage

**Rationale**:
- sessionStorage provides better security (cleared on tab close)
- MSAL handles token encryption and secure storage automatically
- Reduces risk of XSS attacks compared to manual storage
- MSAL's cache includes token expiration and refresh logic
- Can configure localStorage for "remember me" scenarios

**Alternatives Considered**:
- **In-memory only storage**: Store tokens only in JavaScript memory
  - Rejected: Tokens lost on page refresh, poor UX
- **Cookies with httpOnly flag**: Store tokens in secure cookies
  - Rejected: Doesn't work well with SPA CORS scenarios, MSAL doesn't support this pattern
- **IndexedDB**: Browser database storage
  - Rejected: Overkill for token storage, MSAL doesn't support, more complex

**Implementation Notes**:
- Configure MSAL cache location in MSAL configuration
- Default to sessionStorage for security
- Document localStorage option for persistent sessions
- Ensure no tokens logged to console (FR-023)

---

### 8. Error Handling and User Feedback

**Decision**: Implement structured error types with user-friendly messages and retry mechanisms

**Rationale**:
- Users need clear guidance when authentication fails
- Different error types require different user actions
- Structured errors enable better logging and debugging
- Aligns with FR-012 requirement for appropriate error messages

**Alternatives Considered**:
- **Generic error messages**: Single "Authentication failed" message
  - Rejected: Doesn't help users understand how to resolve issues
- **Raw MSAL errors**: Show technical error messages from MSAL
  - Rejected: Not user-friendly, exposes implementation details

**Implementation Notes**:
- Define AuthError discriminated union type
- Map MSAL error codes to user-friendly messages
- Provide retry options for transient errors
- Log detailed errors for debugging while showing simple messages to users
- Display errors using Angular Material snackbar or dialog

---

### 9. Multi-Tab Authentication Synchronization

**Decision**: Use MSAL's built-in BroadcastChannel API support for cross-tab auth sync

**Rationale**:
- Users often have multiple tabs open
- Authentication in one tab should update all tabs
- MSAL v3 includes built-in cross-tab communication
- Prevents inconsistent auth state across tabs

**Alternatives Considered**:
- **Manual localStorage events**: Listen for storage changes
  - Rejected: MSAL handles this automatically, no need for custom implementation
- **No synchronization**: Each tab manages auth independently
  - Rejected: Confusing UX when user signs out in one tab but remains signed in on others

**Implementation Notes**:
- Enable MSAL's BroadcastChannel in configuration
- Auth service listens to MSAL events for token changes
- Update Signal state when auth changes detected from other tabs

---

### 10. Landing Page Design and Routing

**Decision**: Create standalone landing component with public route at '/', protect all other routes

**Rationale**:
- Provides unauthenticated users with app information and value proposition
- Clear call-to-action for sign-in
- SEO-friendly public page
- Separates public and authenticated user experiences

**Alternatives Considered**:
- **Immediate auth redirect**: Redirect to sign-in on app load
  - Rejected: Poor UX for first-time users, no opportunity to explain app value
- **Auth-gated everything**: Require auth even for landing page
  - Rejected: Violates spec requirement for public landing page

**Implementation Notes**:
- Create landing component with app overview, features, testimonials
- Add "Sign In" button that calls auth service
- Configure route: `{ path: '', component: LandingComponent }`
- All voice feature routes include `canActivate: [authGuard]`
- Update navigation to show different options for authenticated vs unauthenticated users

---

## Best Practices Summary

### Frontend (Angular)
1. **MSAL Configuration**: Store Client ID and Tenant ID in environment files, never in source code
2. **Token Refresh**: Use `acquireTokenSilent()` with fallback to interactive flow
3. **Route Protection**: Apply guards at route level, not component level
4. **Error Boundaries**: Catch and handle MSAL errors in auth service, expose user-friendly messages
5. **Testing**: Mock MSAL instance for unit tests, use real redirect flow in E2E tests

### Backend (Azure Functions)
1. **Token Validation**: Validate every request, never trust client-provided identity
2. **Audience Validation**: Always verify token audience matches your Client ID
3. **Clock Skew**: Configure 5-minute tolerance for token expiration
4. **Error Responses**: Return structured errors with error codes for client handling
5. **User Identity**: Extract user claims after validation, pass to business logic

### Security
1. **HTTPS Only**: Enforce HTTPS in production for all auth redirects and API calls
2. **PKCE Flow**: Use authorization code flow with PKCE for SPA security
3. **Token Exposure**: Never log tokens, never include in URLs or query parameters
4. **Scope Minimization**: Request only necessary scopes for user information
5. **Token Expiration**: Short-lived access tokens (1 hour), leverage refresh tokens

### Performance
1. **Token Caching**: Leverage MSAL's built-in cache, avoid redundant token requests
2. **Lazy Loading**: Load protected feature modules only after authentication
3. **OnPush Detection**: Use OnPush strategy for auth-related components
4. **Bundle Optimization**: Tree-shake MSAL library, only import needed modules

---

## Configuration Reference

### Microsoft Entra External ID Configuration
- **Client ID**: `4d072598-4248-45b0-be42-9a42e3bea85b`
- **Tenant ID**: `03e82745-fdd7-4afd-b750-f7a4749a3775`
- **Authority URL**: `https://login.microsoftonline.com/03e82745-fdd7-4afd-b750-f7a4749a3775`
- **Redirect URI**: `http://localhost:4200/auth/callback` (development), `https://<production-domain>/auth/callback` (production)
- **Scopes**: `openid`, `profile`, `email`, `User.Read` (minimum required)

### MSAL Browser Configuration Keys
- `auth.clientId`: Application (client) ID
- `auth.authority`: Authority URL with tenant ID
- `auth.redirectUri`: OAuth redirect callback URL
- `cache.cacheLocation`: 'sessionStorage' or 'localStorage'
- `system.loggerOptions`: Configure logging level (errors only in production)

### Azure Functions Environment Variables
- `ENTRA_TENANT_ID`: Tenant ID for token validation
- `ENTRA_CLIENT_ID`: Client ID for audience validation
- `ENTRA_AUTHORITY`: Authority URL for MSAL Node configuration

---

## Dependencies to Add

### Frontend (Angular)
```json
{
  "@azure/msal-browser": "^3.7.0"
}
```

### Backend (Azure Functions)
```json
{
  "@azure/msal-node": "^2.6.0"
}
```

### Dev Dependencies (Testing)
```json
{
  "@types/msal": "^1.0.0"
}
```

---

## Risk Mitigation

### Risk: Token expiration during active session
**Mitigation**: Implement proactive token refresh 5 minutes before expiration using `acquireTokenSilent()`

### Risk: Microsoft Entra service outage
**Mitigation**: Graceful error handling with retry mechanism, cache last-known auth state for read-only operations

### Risk: CORS issues with redirect flow
**Mitigation**: Configure allowed origins in Azure portal, test redirect flow thoroughly in development

### Risk: Token theft via XSS
**Mitigation**: Use sessionStorage (cleared on tab close), implement Content Security Policy (CSP), sanitize all user inputs

### Risk: Confused deputy attack
**Mitigation**: Always validate token audience matches expected Client ID in Azure Functions

---

## Open Questions Resolved

**Q: Should we support "remember me" functionality?**
**A**: Yes, configurable. Default to sessionStorage (more secure), allow localStorage configuration for persistent sessions.

**Q: How to handle authentication in E2E tests?**
**A**: Mock MSAL redirect flow in test environment, provide test accounts for integration tests, document test authentication setup in quickstart.

**Q: What scopes should we request from Microsoft Entra?**
**A**: Minimum required: `openid`, `profile`, `email`. Additional scopes can be added later as needed for Microsoft Graph API integration.

**Q: Should we implement role-based access control (RBAC)?**
**A**: Out of scope for this feature. Current requirement is authentication only. RBAC can be added in future feature if needed.

---

**Research Complete**: All technical decisions documented with rationale. Ready to proceed to Phase 1 (Design & Contracts).
