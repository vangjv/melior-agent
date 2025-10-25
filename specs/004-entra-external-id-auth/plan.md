# Implementation Plan: Microsoft Entra External ID Authentication

**Branch**: `004-entra-external-id-auth` | **Date**: 2025-10-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-entra-external-id-auth/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement Microsoft Entra External ID authentication for both the Angular frontend and Azure Functions API using MSAL (Microsoft Authentication Library). The frontend will use MSAL Browser for redirect-based authentication flow, while Azure Functions will use token validation middleware. A public landing page will be created at the root route with all voice chat features protected by Angular route guards. Authentication state will be managed using Angular Signals for reactive updates across the application.

## Technical Context

**Language/Version**: TypeScript 5.9.2, Angular 20.0.0, Node.js 18+ (Azure Functions)  
**Primary Dependencies**: @azure/msal-browser (frontend), @azure/msal-node (backend), Angular Router Guards, HTTP Interceptors  
**Storage**: Browser sessionStorage/localStorage for MSAL token cache (frontend), no persistent storage required (backend)  
**Testing**: Jasmine/Karma (frontend unit tests), Jest (Azure Functions unit tests), Integration tests for auth flows  
**Target Platform**: Modern browsers (Chrome, Firefox, Safari, Edge), Azure Functions v4 runtime
**Project Type**: Web application (frontend + backend API)  
**Performance Goals**: Landing page load <2s, sign-in flow completion <15s, token validation <200ms  
**Constraints**: HTTPS required in production, PKCE flow mandatory, WCAG 2.1 AA compliance  
**Scale/Scope**: Support for concurrent authentication sessions, handle 10k+ authenticated users, support multiple browser tabs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Initial Check (Pre-Phase 0) ✅
- ✅ **Angular-First Architecture**: Uses standalone components for landing page, auth callback handler, and navigation. Angular Signals manage authentication state reactively. Route guards use modern Angular patterns with functional guards.
- ✅ **Type Safety**: TypeScript strict mode enabled. All MSAL types, authentication state, user profile, and token models have explicit interfaces. Route guard types properly defined.
- ✅ **Test-First Development**: TDD approach with unit tests for auth service, route guards, interceptors. Integration tests for sign-in/sign-out flows. Mock MSAL library for isolated testing.
- ✅ **Performance & Scalability**: OnPush change detection for auth components. Lazy loading for protected voice feature modules. Token caching minimizes auth provider calls. HTTP interceptor efficiently adds tokens to requests.
- ✅ **Accessibility & Standards**: WCAG 2.1 AA compliance for landing page and auth UI. Keyboard navigation for sign-in/sign-out. Screen reader announcements for auth state changes. Semantic HTML throughout.

### Post-Design Check (After Phase 1) ✅
- ✅ **Angular-First Architecture**: Design confirms standalone components (LandingComponent, AuthCallbackComponent). Auth service uses signal(), computed(), effect(). Functional guards (authGuard: CanActivateFn). HTTP functional interceptor (authInterceptor: HttpInterceptorFn).
- ✅ **Type Safety**: All models defined with TypeScript interfaces (AuthenticationState, UserProfile, AuthError, UserIdentity, TokenValidationResult). MSAL types properly imported and used. No 'any' types in production code.
- ✅ **Test-First Development**: Test structure defined in quickstart. Unit test examples provided for auth.service.spec.ts. Integration test scenarios documented. Mock strategy for MSAL defined.
- ✅ **Performance & Scalability**: Design includes OnPush for landing component. Route-based lazy loading configured in app.routes.ts. Token caching via MSAL's built-in cache (sessionStorage). HTTP interceptor only runs for API URLs (performance optimized).
- ✅ **Accessibility & Standards**: Landing page uses Material components (mat-card, mat-button) with built-in accessibility. Semantic HTML in templates. Loading states with mat-spinner provide screen reader context. Keyboard navigation supported via Material.

**Constitution Compliance**: ✅ PASSED - All principles satisfied in design phase

## Project Structure

### Documentation (this feature)

```text
specs/004-entra-external-id-auth/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── auth-api.openapi.yaml
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Web application (frontend + backend)
src/
├── app/
│   ├── components/
│   │   ├── landing/            # Public landing page component
│   │   ├── auth-callback/      # OAuth redirect callback handler
│   │   └── navigation/         # Navigation with auth-aware UI
│   ├── guards/
│   │   └── auth.guard.ts       # Route guard for protected routes
│   ├── interceptors/
│   │   └── auth.interceptor.ts # HTTP interceptor for bearer tokens
│   ├── models/
│   │   ├── auth-config.ts      # MSAL configuration interface
│   │   ├── auth-state.ts       # Authentication state model
│   │   ├── user-profile.ts     # User identity model
│   │   └── auth-error.ts       # Authentication error types
│   ├── services/
│   │   └── auth.service.ts     # Authentication service with MSAL integration
│   └── app.routes.ts           # Route configuration with guards
├── environments/
│   ├── environment.ts              # Production Entra ID config
│   └── environment.development.ts  # Development Entra ID config

api/
├── src/
│   ├── middleware/
│   │   └── auth.middleware.ts  # Token validation middleware
│   ├── models/
│   │   ├── UserIdentity.ts     # Extracted user identity from token
│   │   └── AuthError.ts        # Auth error responses
│   └── functions/
│       └── generateToken.ts    # Updated to include user identity in LiveKit tokens
└── tests/
    └── integration/
        └── auth.test.ts        # Token validation integration tests

tests/
├── unit/
│   ├── auth.service.spec.ts       # Auth service unit tests
│   ├── auth.guard.spec.ts         # Route guard unit tests
│   └── auth.interceptor.spec.ts   # Interceptor unit tests
└── integration/
    ├── auth-flow.spec.ts          # Sign-in/sign-out flow tests
    └── protected-routes.spec.ts   # Route protection tests
```

**Structure Decision**: Web application structure selected as the feature spans both Angular frontend and Azure Functions backend. Frontend authentication components are organized under `src/app/components/`, with guards, interceptors, and services in their respective folders. Backend auth middleware is added to the existing `api/` structure to validate tokens on protected Azure Functions endpoints.

## Complexity Tracking

> **No constitutional violations - this section is not applicable**

All constitutional principles are satisfied:
- Angular-first architecture maintained throughout
- Full TypeScript typing with strict mode
- TDD approach for all authentication components
- Performance optimizations via OnPush and lazy loading
- WCAG 2.1 AA accessibility compliance

No complexity exceptions required.
