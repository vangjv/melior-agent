# Implementation Plan: Microsoft Entra External ID Authentication

**Branch**: `004-entra-external-id-auth` | **Date**: 2025-10-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-entra-external-id-auth/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement Microsoft Entra External ID authentication for both the Angular frontend and Azure Functions API using MSAL Angular v4 and MSAL Node. The frontend will use **@azure/msal-angular** (official Angular wrapper) with built-in guards, interceptors, and services for redirect-based authentication. Azure Functions will use token validation middleware with @azure/msal-node. A public landing page will be created at the root route with all voice chat features protected by MsalGuard. Authentication state will be managed using Angular Signals combined with MsalBroadcastService for reactive updates across the application and multi-tab synchronization.

## Technical Context

**Language/Version**: TypeScript 5.9.2, Angular 20.0.0, Node.js 18+ (Azure Functions)  
**Primary Dependencies**: @azure/msal-angular v4 (frontend), @azure/msal-browser v3 (peer dependency), @azure/msal-node v2.6.0 (backend), MsalGuard, MsalInterceptor, MsalBroadcastService  
**Storage**: Browser sessionStorage for MSAL token cache (frontend), no persistent storage required (backend)  
**Testing**: Jasmine/Karma (frontend unit tests with MSAL service mocks), Jest (Azure Functions unit tests), Integration tests for auth flows  
**Target Platform**: Modern browsers (Chrome, Firefox, Safari, Edge), Azure Functions v4 runtime  
**Performance Goals**: Landing page load <2s, sign-in flow completion <15s, token validation <200ms  
**Constraints**: HTTPS required in production, PKCE flow (automatic with MSAL Browser), WCAG 2.1 AA compliance  
**Scale/Scope**: Support for concurrent authentication sessions, handle 10k+ authenticated users, support multiple browser tabs with cross-tab state sync via MsalBroadcastService

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Initial Check (Pre-Phase 0) ✅
- ✅ **Angular-First Architecture**: Uses standalone components for landing page and navigation. Angular Signals manage authentication state reactively. MSAL Angular v4 provides official Angular-native guards, interceptors, and services designed for standalone components.
- ✅ **Type Safety**: TypeScript strict mode enabled. All MSAL types, authentication state, user profile, and token models have explicit interfaces. MsalGuard and MsalInterceptor fully typed.
- ✅ **Test-First Development**: TDD approach with unit tests for auth service, components. Integration tests for sign-in/sign-out flows. Mock MsalService, MsalBroadcastService, MsalGuard for isolated testing.
- ✅ **Performance & Scalability**: OnPush change detection for auth components. Lazy loading for protected voice feature modules. Token caching via MSAL's built-in cache minimizes auth provider calls. MsalInterceptor efficiently adds tokens only to configured API URLs.
- ✅ **Accessibility & Standards**: WCAG 2.1 AA compliance for landing page and auth UI. Keyboard navigation for sign-in/sign-out. Screen reader announcements for auth state changes. Semantic HTML with Angular Material components.

### Post-Design Check (After Phase 1) ✅
- ✅ **Angular-First Architecture**: Design confirms standalone components (LandingComponent). Auth service wraps MsalService and MsalBroadcastService, exposing signals. Uses factory providers in app.config.ts (MSALInstanceFactory, MSALGuardConfigFactory, MSALInterceptorConfigFactory) for standalone architecture. No MsalModule required.
- ✅ **Type Safety**: All models defined with TypeScript interfaces (AuthenticationState, UserProfile, AuthError, UserIdentity, TokenValidationResult). MSAL Angular types (MsalGuardConfiguration, MsalInterceptorConfiguration, IPublicClientApplication) properly imported and used. No 'any' types in production code.
- ✅ **Test-First Development**: Test structure defined in quickstart. Unit test strategy for mocking MsalService and MsalBroadcastService documented. Integration test scenarios for redirect flow documented. MSAL Angular provides testability hooks.
- ✅ **Performance & Scalability**: Design includes OnPush for landing component. Route-based lazy loading configured in app.routes.ts with MsalGuard. Token caching via MSAL's built-in cache (sessionStorage). MsalInterceptor configured with protectedResourceMap for selective token injection (performance optimized).
- ✅ **Accessibility & Standards**: Landing page uses Material components (mat-card, mat-button) with built-in accessibility. Semantic HTML in templates. Loading states tracked via MsalBroadcastService.inProgress$ provide screen reader context. Keyboard navigation supported via Material and MsalGuard redirect handling.

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
│   │   └── navigation/         # Navigation with auth-aware UI
│   ├── models/
│   │   ├── auth-state.ts       # Authentication state model (Signals-based)
│   │   ├── user-profile.ts     # User identity model
│   │   └── auth-error.ts       # Authentication error types
│   ├── services/
│   │   └── auth.service.ts     # Auth service wrapping MsalService/MsalBroadcastService with Signals
│   ├── app.config.ts           # MSAL configuration with factory providers
│   └── app.routes.ts           # Route configuration with MsalGuard

api/
├── src/
│   ├── middleware/
│   │   └── auth.middleware.ts  # Token validation middleware with @azure/msal-node
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
│   ├── auth.service.spec.ts       # Auth service unit tests (mock MsalService)
│   └── landing.component.spec.ts  # Landing component tests
└── integration/
    └── auth-flow.spec.ts          # End-to-end auth flow tests
```

**Key Architecture Decisions**:
- **MSAL Angular v4**: Official Angular library with MsalGuard, MsalInterceptor, MsalService, MsalBroadcastService
- **No custom guard/interceptor**: Use built-in MsalGuard and MsalInterceptor instead of custom implementations
- **Factory providers**: Configure MSAL via factory functions in app.config.ts for standalone component architecture
- **No auth callback component**: MSAL Angular handles redirect flow automatically
- **Signals + RxJS bridge**: AuthService subscribes to MsalBroadcastService observables, exposes state via Angular Signals

**Structure Decision**: Web application structure selected as the feature spans both Angular frontend and Azure Functions backend. Frontend authentication components are organized under `src/app/components/`, with auth service exposing reactive state via Signals. MSAL Angular configuration is centralized in `app.config.ts` using factory providers (no MsalModule). Backend auth middleware is added to the existing `api/` structure to validate tokens on protected Azure Functions endpoints.

## Complexity Tracking

> **No constitutional violations - this section is not applicable**

All constitutional principles are satisfied:
- Angular-first architecture maintained with MSAL Angular v4 (official library designed for Angular)
- Full TypeScript typing with strict mode (MsalGuardConfiguration, MsalInterceptorConfiguration, IPublicClientApplication)
- TDD approach for all authentication components (mock MsalService, MsalBroadcastService, MsalGuard)
- Performance optimizations via OnPush, lazy loading, and MsalInterceptor's protectedResourceMap
- WCAG 2.1 AA accessibility compliance using Angular Material components

No complexity exceptions required.
