# Feature Specification: Microsoft Entra External ID Authentication

**Feature Branch**: `004-entra-external-id-auth`  
**Created**: 2025-10-25  
**Status**: Draft  
**Input**: User description: "Implement Microsoft Entra External Id authentication for front end and azure function api using MSAL. Modify the Angular app to have a landing page that isn't route guarded but all voice capabilities should be route guarded. Front end auth flow do a redirect."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Unauthenticated User Accesses Public Landing Page (Priority: P1)

A user visits the application for the first time and sees a public landing page that provides information about the voice chat features and prompts them to sign in to access those features.

**Why this priority**: This is the critical entry point for all users and establishes the authentication boundary. Without this, there's no way to onboard users or explain the value proposition before authentication.

**Independent Test**: Can be fully tested by navigating to the application root URL without authentication and verifying the landing page loads without requiring sign-in.

**Acceptance Scenarios**:

1. **Given** a user is not authenticated, **When** they navigate to the application root URL, **Then** they see the public landing page with information about the application and a "Sign In" option
2. **Given** a user is on the landing page, **When** they attempt to access voice features directly via URL, **Then** they are redirected to the sign-in flow
3. **Given** a user is on the landing page, **When** they click navigation elements, **Then** they can only access public content without authentication

---

### User Story 2 - User Signs In via Redirect Flow (Priority: P1)

A user initiates sign-in from the landing page and is redirected to Microsoft Entra External ID for authentication, then returned to the application with an authenticated session.

**Why this priority**: This is the core authentication mechanism that gates all protected features. Without this working, users cannot access any voice chat functionality.

**Independent Test**: Can be fully tested by clicking "Sign In" from the landing page, completing Microsoft Entra authentication, and being redirected back with a valid session.

**Acceptance Scenarios**:

1. **Given** a user clicks "Sign In" on the landing page, **When** the redirect flow initiates, **Then** they are sent to Microsoft Entra External ID login page with the correct tenant and client configuration
2. **Given** a user completes authentication at Microsoft Entra, **When** they are redirected back to the application, **Then** they receive valid authentication tokens and can access protected routes
3. **Given** a user's authentication fails at Microsoft Entra, **When** they are redirected back, **Then** they see an appropriate error message and remain on the landing page with option to retry
4. **Given** a user completes sign-in successfully, **When** they navigate to the application, **Then** their authenticated state persists across page refreshes

---

### User Story 3 - Authenticated User Accesses Voice Features (Priority: P1)

An authenticated user can access all voice chat and transcription features that were previously route-guarded, with their identity context passed through to backend services.

**Why this priority**: This validates that the authentication system successfully protects resources and enables the core business functionality. This is the primary value delivery for the authentication feature.

**Independent Test**: Can be fully tested by signing in and attempting to access voice chat routes, verifying both frontend route access and backend API calls include valid tokens.

**Acceptance Scenarios**:

1. **Given** a user is authenticated, **When** they navigate to voice chat routes, **Then** they can access all voice features without additional prompts
2. **Given** a user is authenticated, **When** they make API calls to Azure Functions, **Then** their requests include valid authentication tokens in headers
3. **Given** a user is authenticated, **When** Azure Functions validate the token, **Then** the request is authorized and proceeds with the user's identity context
4. **Given** a user's token expires during a session, **When** they attempt to access protected resources, **Then** the system automatically attempts token refresh or prompts re-authentication

---

### User Story 4 - User Signs Out (Priority: P2)

An authenticated user can sign out of the application, which clears their local session and optionally signs them out of Microsoft Entra.

**Why this priority**: This is important for security and user control, but not critical for initial MVP since token expiration provides passive logout.

**Independent Test**: Can be fully tested by signing in, then clicking sign out, and verifying session is cleared and user returns to landing page.

**Acceptance Scenarios**:

1. **Given** a user is authenticated, **When** they click "Sign Out", **Then** their local tokens are cleared and they are redirected to the landing page
2. **Given** a user has signed out, **When** they attempt to access protected routes, **Then** they are redirected to the sign-in flow
3. **Given** a user signs out, **When** they close and reopen the browser, **Then** they remain signed out and see the landing page

---

### User Story 5 - Token Validation in Azure Functions (Priority: P1)

Azure Functions receive incoming requests with bearer tokens and validate them against Microsoft Entra External ID before processing, ensuring only authenticated users can generate LiveKit tokens or access other protected endpoints.

**Why this priority**: Backend authentication is equally critical as frontend - without it, the API remains vulnerable to unauthorized access.

**Independent Test**: Can be fully tested by making API calls with valid tokens (success), invalid tokens (401), and no tokens (401), verifying proper authorization enforcement.

**Acceptance Scenarios**:

1. **Given** an Azure Function receives a request with a valid bearer token, **When** it validates the token, **Then** the request proceeds and the user's identity is available in the request context
2. **Given** an Azure Function receives a request with an invalid or expired token, **When** it validates the token, **Then** it returns 401 Unauthorized with appropriate error details
3. **Given** an Azure Function receives a request without a bearer token, **When** it processes the request, **Then** it returns 401 Unauthorized
4. **Given** an Azure Function successfully validates a token, **When** it generates LiveKit tokens, **Then** the user's identity is embedded in the LiveKit token metadata

---

### Edge Cases

- What happens when the user's network connection drops during the redirect authentication flow?
- How does the system handle concurrent authentication requests (e.g., multiple tabs)?
- What happens when Microsoft Entra External ID service is temporarily unavailable?
- How does the system handle token validation failures due to clock skew between client and server?
- What happens when a user's account is disabled in Microsoft Entra after they've obtained tokens?
- How does the system handle deep links to protected routes for unauthenticated users?
- What happens when token refresh fails (network issue, revoked refresh token)?

## Constitutional Compliance *(mandatory)*

**Angular Architecture**: Use standalone components for all authentication-related UI (landing page, callback handler, sign-out component). Implement authentication state using Angular Signals for reactive state management. Use Angular's provideRouter with route guards for protecting voice feature routes.

**Type Safety**: Define TypeScript interfaces for all authentication-related models (AuthConfig, UserProfile, AuthenticationResult, TokenValidationResult). Use strict typing for MSAL configuration objects and token response types.

**Testing Strategy**: TDD approach with unit tests for authentication service methods, route guards, and token interceptors. Integration tests for the full sign-in/sign-out flows. Mock MSAL library for isolated component testing. API integration tests for token validation in Azure Functions with mocked Entra ID responses.

**Performance Requirements**: Use OnPush change detection for all authentication-related components. Implement token caching to minimize authentication calls. Lazy load protected route modules to optimize initial load time for unauthenticated users on landing page.

**Accessibility Standards**: WCAG 2.1 AA compliance for landing page and authentication UI. Ensure keyboard navigation works for sign-in/sign-out controls. Provide screen reader announcements for authentication state changes (signed in, signed out, errors).

## Requirements *(mandatory)*

### Functional Requirements

**Frontend Authentication**:

- **FR-001**: Application MUST display a public landing page accessible without authentication when users visit the root URL
- **FR-002**: Application MUST provide a "Sign In" action on the landing page that initiates the Microsoft Entra External ID redirect flow
- **FR-003**: Application MUST redirect unauthenticated users to Microsoft Entra External ID using the redirect authentication flow (not popup)
- **FR-004**: Application MUST use the provided Client ID (4d072598-4248-45b0-be42-9a42e3bea85b) and Tenant ID (03e82745-fdd7-4afd-b750-f7a4749a3775) for Microsoft Entra External ID configuration
- **FR-005**: Application MUST protect all voice chat and transcription routes with authentication guards that prevent access for unauthenticated users
- **FR-006**: Application MUST redirect unauthenticated users attempting to access protected routes to the sign-in flow
- **FR-007**: Application MUST store authentication tokens securely in browser storage with appropriate security flags
- **FR-008**: Application MUST automatically include bearer tokens in HTTP requests to Azure Functions endpoints
- **FR-009**: Application MUST handle token expiration by attempting automatic token refresh using refresh tokens
- **FR-010**: Application MUST provide a "Sign Out" action for authenticated users that clears local session state
- **FR-011**: Application MUST preserve the originally requested protected route and redirect users there after successful authentication
- **FR-012**: Application MUST display appropriate error messages when authentication fails (user cancelled, network error, invalid credentials)

**Backend API Authentication**:

- **FR-013**: Azure Functions MUST validate bearer tokens on all protected endpoints before processing requests
- **FR-014**: Azure Functions MUST validate tokens against Microsoft Entra External ID using the provided Tenant ID
- **FR-015**: Azure Functions MUST return 401 Unauthorized for requests with missing, invalid, or expired tokens
- **FR-016**: Azure Functions MUST extract user identity information from validated tokens (user ID, email, display name)
- **FR-017**: Azure Functions MUST include user identity in LiveKit token metadata when generating tokens for authenticated users
- **FR-018**: Azure Functions MUST return structured error responses for authentication failures with appropriate error codes and messages
- **FR-019**: Azure Functions MUST support token validation with appropriate clock skew tolerance (5 minutes standard)

**Security Requirements**:

- **FR-020**: Application MUST use HTTPS for all authentication redirects and API calls in production
- **FR-021**: Application MUST implement PKCE (Proof Key for Code Exchange) flow for enhanced security in the redirect flow
- **FR-022**: Application MUST validate token signatures using Microsoft Entra's published public keys
- **FR-023**: Application MUST not expose authentication tokens in URLs or browser console logs
- **FR-024**: Azure Functions MUST validate token audience matches the expected client/application identifier

### Key Entities

- **User**: Represents an authenticated user with identity information from Microsoft Entra (user ID, email, display name, authentication tokens). User identity is required to access protected voice features.

- **Authentication Token**: Represents access and refresh tokens issued by Microsoft Entra External ID, including expiration time, scopes, and token type. Used for frontend session management and backend API authorization.

- **Authentication Configuration**: Represents the MSAL configuration including Client ID, Tenant ID, redirect URIs, scopes, and authentication flow settings. Defines how the application connects to Microsoft Entra External ID.

- **Authentication State**: Represents the current authentication status (authenticated, unauthenticated, in progress, error) and associated user profile when authenticated. Managed reactively via Angular Signals.

- **Route Guard Context**: Represents the authorization state for route navigation, including the requested route, authentication requirement, and redirect behavior for unauthenticated access.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can access the public landing page in under 2 seconds without any authentication prompts
- **SC-002**: Authenticated users can complete the sign-in flow (from clicking "Sign In" to accessing protected routes) in under 15 seconds under normal network conditions
- **SC-003**: 100% of requests to protected voice chat routes are blocked for unauthenticated users and redirected to sign-in
- **SC-004**: 100% of Azure Functions API calls with invalid or missing tokens return 401 Unauthorized within 200ms
- **SC-005**: Token refresh succeeds automatically in 95% of cases where refresh tokens are valid, without requiring user interaction
- **SC-006**: Users accessing deep links to protected routes are redirected to their originally requested route after authentication in 100% of successful sign-in flows
- **SC-007**: Zero authentication tokens are exposed in browser URLs, console logs, or browser history
- **SC-008**: The landing page maintains WCAG 2.1 AA compliance with zero accessibility violations detected by automated testing tools
