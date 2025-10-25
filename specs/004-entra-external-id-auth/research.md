# Research: Microsoft Entra External ID Authentication

**Feature**: 004-entra-external-id-auth  
**Date**: 2025-10-25  
**Status**: Complete

## Research Areas

### 1. MSAL Browser vs MSAL Angular Integration

**Decision**: Use `@azure/msal-angular` v4.x with Angular standalone components support

**Rationale**: 
- MSAL Angular v4 provides first-class support for Angular 15-20 and standalone components
- Includes `MsalGuard` for declarative route protection (canActivate)
- Includes `MsalInterceptor` for automatic HTTP token injection
- Provides `MsalService` with Angular-idiomatic RxJS observables
- Includes `MsalBroadcastService` for reactive auth state changes
- Built-in support for Angular's dependency injection
- Official Angular Standalone Sample demonstrates Angular 19 usage
- Reduces boilerplate compared to manual MSAL Browser integration
- Handles Angular-specific edge cases (SSR, change detection, routing)
- Better testing support with Angular TestBed integration
- PKCE flow enabled by default in underlying MSAL Browser v3+

**Alternatives Considered**:
- **@azure/msal-browser only with custom wrapper**: Manually integrate MSAL Browser
  - Rejected: MSAL Angular v4 provides all needed abstractions (guards, interceptors, services)
  - More maintenance burden to replicate what msal-angular already provides
  - Would need custom implementations of route guards and HTTP interceptors
  - Miss out on Angular-specific optimizations and patterns
- **MSAL Angular v3**: Previous version
  - Rejected: v4 adds Angular 19/20 support and improvements for standalone components
  - v3 is in maintenance mode, v4 is actively developed
- **Custom OAuth2 implementation**: Build authentication from scratch
  - Rejected: Higher security risk, more maintenance burden, lacks Microsoft's ongoing security updates

**Implementation Notes**:
- Configure MSAL Angular in `app.config.ts` using factory providers
- Use `MsalGuard` directly in route definitions with `canActivate`
- Use `MsalInterceptor` with `provideHttpClient(withInterceptorsFromDi())`
- Inject `MsalService` for sign-in/sign-out operations
- Use `MsalBroadcastService` to subscribe to auth state changes
- No need for `MsalModule` with standalone components - use factory providers instead
- Handle redirect in app component with `MsalService.handleRedirectObservable()`

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

**Decision**: Use MSAL Angular's built-in `MsalGuard` configured for redirect interaction

**Rationale**:
- `MsalGuard` is specifically designed for Angular route protection with MSAL
- Handles redirect flow automatically when configured with `InteractionType.Redirect`
- Integrates seamlessly with Angular Router's navigation lifecycle  
- Automatically preserves requested URL for post-authentication redirect
- Works with both module-based and standalone component architectures
- Provides `loginFailedRoute` configuration for error handling
- Supports custom auth requests per route via `MsalGuardConfiguration`
- Well-tested and maintained by Microsoft for Angular versions 15-20

**Alternatives Considered**:
- **Custom functional guard (CanActivateFn)**: Build custom guard using MSAL service
  - Rejected: `MsalGuard` already provides all needed functionality
  - Custom implementation would duplicate MsalGuard's logic
  - Lose out on tested edge case handling (iframe detection, popup handling)
- **Class-based custom guard**: Traditional Angular guard extending CanActivate
  - Rejected: MSAL Angular's `MsalGuard` is the official solution
  - No advantage over using the built-in guard
- **Manual route checking in components**: Each component checks auth status
  - Rejected: Violates DRY principle, error-prone, harder to maintain consistently

**Implementation Notes**:
- Configure `MsalGuard` in `app.config.ts` using `MSAL_GUARD_CONFIG` provider
- Set `interactionType: InteractionType.Redirect` in configuration
- Optionally set `authRequest` with specific scopes per guard
- Set `loginFailedRoute` to handle authentication failures (e.g., '/login-failed')
- Apply guard to routes: `canActivate: [MsalGuard]` in route definitions
- `MsalGuard` automatically stores requested URL and redirects after successful auth
- No need to manually handle redirect logic - MsalGuard does this automatically

---

### 4. HTTP Interceptor for Bearer Token Injection

**Decision**: Use MSAL Angular's built-in `MsalInterceptor` with protected resource map

**Rationale**:
- `MsalInterceptor` is the official Angular HTTP interceptor for MSAL
- Automatically adds Authorization header with bearer token to configured endpoints
- Uses protected resource map to specify which URLs need tokens and what scopes
- Handles token acquisition automatically using `acquireTokenSilent()`
- Falls back to interactive authentication if silent acquisition fails
- Integrates with `MsalBroadcastService` for interaction status tracking
- Supports both class-based (`HTTP_INTERCEPTORS`) and functional interceptor patterns
- Well-tested for Angular HTTP client including edge cases

**Alternatives Considered**:
- **Custom HTTP interceptor (HttpInterceptorFn)**: Build functional interceptor
  - Rejected: `MsalInterceptor` provides all needed functionality
  - Would duplicate well-tested logic from Microsoft
  - Lose automatic token refresh and fallback handling
- **Manual token injection in each service**: Add auth header in service methods
  - Rejected: Violates DRY, easy to forget, maintenance burden
- **Base HTTP service class**: Create wrapper around HttpClient
  - Rejected: Interceptors are more Angular-idiomatic and MSAL Interceptor handles this

**Implementation Notes**:
- Configure `MsalInterceptor` in `app.config.ts` using `MSAL_INTERCEPTOR_CONFIG` provider
- Create `protectedResourceMap`: `Map<string, Array<string>>` mapping URLs to scopes
- Set `interactionType: InteractionType.Redirect` for fallback authentication
- Add to providers with `HTTP_INTERCEPTORS` token and `multi: true`
- Use `provideHttpClient(withInterceptorsFromDi())` for Angular 15+ standalone apps
- Interceptor only adds tokens to URLs in the protected resource map
- Automatically handles token refresh before expiration

---

### 5. Authentication State Management with Signals

**Decision**: Use Angular Signals combined with `MsalBroadcastService` for reactive auth state

**Rationale**:
- Signals provide fine-grained reactivity without Zone.js (app uses zoneless change detection)
- `MsalBroadcastService` provides observables for MSAL authentication events (login success, logout, acquire token success, etc.)
- Can bridge RxJS observables from `MsalBroadcastService` to signals using `toSignal()` or manual subscription
- Computed signals automatically derive auth state changes
- Better performance than RxJS Subject-only approach for component consumption
- Easier to test and reason about than pure observable streams
- Aligns with Angular 19+ best practices and MSAL Angular's event system

**Alternatives Considered**:
- **RxJS BehaviorSubject only**: Keep all state in observables
  - Rejected: Less optimal for zoneless app, requires manual subscription management in components
  - `MsalBroadcastService` already provides observables; signals are better for component consumption
- **NgRx Store**: Full state management solution
  - Rejected: Overkill for authentication state, adds complexity and bundle size for minimal benefit
  - `MsalService` already manages core auth state; just need reactive layer for components
- **Service with getters/setters**: Imperative state management
  - Rejected: No reactivity, components must poll for changes, poor UX

**Implementation Notes**:
- Private `WritableSignal` for mutable state in auth service
- Public readonly `Signal` for components to read state
- Subscribe to `MsalBroadcastService.msalSubject$` to react to `EventType` events
- Use `MsalBroadcastService.inProgress$` to track interaction status (login/logout/acquireToken)
- `computed()` signals for derived state (isAuthenticated, userName, etc.)
- `effect()` for side effects like logging auth state changes or analytics
- Optionally use `toSignal()` to convert `msalSubject$` to signal for more reactive patterns

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

**Decision**: Use MSAL Angular's `MsalBroadcastService` for cross-tab auth sync

**Rationale**:
- Users often have multiple tabs open
- Authentication in one tab should update all tabs
- `MsalBroadcastService` automatically broadcasts auth events across tabs using BrowserCacheLocation
- MSAL v3 includes built-in cross-tab communication via localStorage or sessionStorage events
- Prevents inconsistent auth state across tabs
- `MsalBroadcastService.msalSubject$` emits events that fire when auth state changes in any tab

**Alternatives Considered**:
- **Manual localStorage events**: Listen for storage changes and update signals
  - Rejected: `MsalBroadcastService` handles this automatically via MSAL's internal event system
  - Would duplicate MSAL's well-tested cross-tab logic
- **No synchronization**: Each tab manages auth independently
  - Rejected: Confusing UX when user signs out in one tab but remains signed in on others

**Implementation Notes**:
- MSAL automatically uses BroadcastChannel API (with localStorage fallback) when cache location is `localStorage`
- Subscribe to `MsalBroadcastService.msalSubject$` in auth service
- Filter for `EventType.LOGIN_SUCCESS`, `EventType.LOGOUT_SUCCESS`, `EventType.ACQUIRE_TOKEN_SUCCESS` events
- Update Signal state when auth changes detected from any tab (including current)
- `MsalBroadcastService.inProgress$` tracks ongoing interactions across all tabs

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
- Add "Sign In" button that calls `MsalService.loginRedirect()` or injects `MsalService` and calls login
- Configure route: `{ path: '', component: LandingComponent }`
- All voice feature routes include `canActivate: [MsalGuard]` to protect with MSAL Angular's built-in guard
- Update navigation to show different options for authenticated vs unauthenticated users (check `MsalService.instance.getAllAccounts()` or auth state signal)

---

## Best Practices Summary

### Frontend (Angular with MSAL Angular v4)
1. **MSAL Configuration**: Store Client ID and Tenant ID in environment files, never in source code
2. **Factory Providers**: Use factory functions in `app.config.ts` to configure MSAL for standalone components (no MsalModule)
3. **Route Protection**: Use `MsalGuard` at route level (`canActivate: [MsalGuard]`), not component level checks
4. **HTTP Interceptor**: Configure `MsalInterceptor` with protected resource map for automatic token injection
5. **Reactive State**: Use `MsalBroadcastService` for auth event subscriptions, bridge to Angular Signals for component state
6. **Error Boundaries**: Subscribe to `EventType.LOGIN_FAILURE`, `EventType.ACQUIRE_TOKEN_FAILURE` events, expose user-friendly messages
7. **Testing**: Mock `MsalService`, `MsalBroadcastService`, `MsalGuard` for unit tests, use real redirect flow in E2E tests

### Backend (Azure Functions)
1. **Token Validation**: Validate every request with `@azure/msal-node`, never trust client-provided identity
2. **Audience Validation**: Always verify token audience matches your Client ID
3. **Clock Skew**: Configure 5-minute tolerance for token expiration in ConfidentialClientApplication
4. **Error Responses**: Return structured errors with error codes for client handling
5. **User Identity**: Extract user claims after validation, pass to business logic

### Security
1. **HTTPS Only**: Enforce HTTPS in production for all auth redirects and API calls
2. **PKCE Flow**: MSAL Browser automatically uses authorization code flow with PKCE for SPA security
3. **Token Exposure**: Never log tokens, never include in URLs or query parameters
4. **Scope Minimization**: Request only necessary scopes (openid, profile, email, offline_access)
5. **Token Expiration**: Short-lived access tokens (1 hour), MSAL handles refresh automatically via `acquireTokenSilent()`

### Performance
1. **Token Caching**: MSAL's built-in cache in localStorage/sessionStorage, avoid redundant token requests
2. **Lazy Loading**: Load protected feature modules only after authentication
3. **OnPush Detection**: Use OnPush strategy for auth-related components (Angular 19 default)
4. **Bundle Optimization**: MSAL Angular v4 is tree-shakeable, only import needed types

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
