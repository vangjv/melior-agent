# Tasks: Microsoft Entra External ID Authentication

**Feature**: 004-entra-external-id-auth  
**Date**: 2025-10-25  
**Input**: Design documents from `/specs/004-entra-external-id-auth/`

## Format: `- [ ] [ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and MSAL dependency installation

- [X] T001 Install @azure/msal-angular@^4.0.0 and @azure/msal-browser@^3.7.0 in Angular project root using npm install --save
- [X] T002 Install @azure/msal-node@^2.6.0 in api/ directory using npm install --save
- [X] T003 [P] Create environment configuration in src/environments/environment.development.ts with Entra config (clientId, tenantId, authority, redirectUri, scopes)
- [X] T004 [P] Create production environment configuration in src/environments/environment.ts with Entra config
- [X] T005 [P] Add Entra environment variables to api/local.settings.json (ENTRA_TENANT_ID, ENTRA_CLIENT_ID, ENTRA_AUTHORITY)
- [X] T006 [P] Update api/local.settings.json with CORS configuration for http://localhost:4200

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Create AuthenticationState interface in src/app/models/auth-state.ts with status, user, error properties
- [X] T008 [P] Create UserProfile interface in src/app/models/auth-state.ts with userId, email, displayName, username, tenantId fields
- [X] T009 [P] Create AuthError interface in src/app/models/auth-state.ts with code, message, userMessage, timestamp, retryable fields
- [X] T010 Configure MSAL factory providers in src/app/app.config.ts (MSALInstanceFactory, MSALGuardConfigFactory, MSALInterceptorConfigFactory)
- [X] T011 Add MSAL providers to src/app/app.config.ts (MSAL_INSTANCE, MSAL_GUARD_CONFIG, MSAL_INTERCEPTOR_CONFIG, MsalService, MsalGuard, MsalBroadcastService, MsalInterceptor)
- [X] T012 Create AuthService in src/app/services/auth.service.ts with signal-based state management wrapping MsalService and MsalBroadcastService
- [X] T013 Implement checkAuthStatus() method in src/app/services/auth.service.ts to check MSAL accounts and update signal state
- [X] T014 [P] Implement handleMsalEvent() method in src/app/services/auth.service.ts to react to LOGIN_SUCCESS, LOGOUT_SUCCESS, ACQUIRE_TOKEN events
- [X] T015 [P] Implement error mapping methods in src/app/services/auth.service.ts (mapErrorCode, getUserFriendlyMessage, isErrorRetryable)
- [X] T016 Create UserIdentity interface in api/src/models/UserIdentity.ts with userId, email, displayName, tenantId, roles fields
- [X] T017 [P] Create TokenValidationResult interface in api/src/models/TokenValidationResult.ts with isValid, userIdentity, error fields
- [X] T018 [P] Create AuthErrorResponse interface in api/src/models/AuthError.ts with error code, message, statusCode, timestamp, path fields
- [X] T019 Create auth middleware in api/src/middleware/auth.middleware.ts using @azure/msal-node for JWT token validation
- [X] T020 Implement validateToken() function in api/src/middleware/auth.middleware.ts to validate bearer tokens against Microsoft Entra
- [X] T021 [P] Implement extractUserIdentity() function in api/src/middleware/auth.middleware.ts to extract user claims from validated token
- [X] T022 [P] Implement createAuthErrorResponse() function in api/src/middleware/auth.middleware.ts for structured 401 responses

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Unauthenticated User Accesses Public Landing Page (Priority: P1) 🎯 MVP

**Goal**: Create public landing page accessible without authentication that provides information about voice features and sign-in option

**Independent Test**: Navigate to http://localhost:4200 without authentication and verify landing page loads, displays app information, and has a "Sign In" button

### Implementation for User Story 1

- [X] T023 [P] [US1] Create LandingComponent in src/app/components/landing/landing.component.ts with standalone configuration and OnPush change detection
- [X] T024 [P] [US1] Create landing component template in src/app/components/landing/landing.component.html with Material card, app description, and sign-in button
- [X] T025 [P] [US1] Create landing component styles in src/app/components/landing/landing.component.scss with responsive layout
- [X] T026 [US1] Add public route for landing page in src/app/app.routes.ts at path '' without MsalGuard
- [X] T027 [US1] Inject AuthService in src/app/components/landing/landing.component.ts and bind sign-in button to authService.signIn()
- [X] T028 [US1] Add computed signal for authentication status in src/app/components/landing/landing.component.ts using authService.isAuthenticated
- [X] T029 [US1] Update landing template to conditionally show "Sign In" or "Go to Voice Chat" button based on auth status

### Tests for User Story 1

- [X] T030 [P] [US1] Create unit test for LandingComponent in src/app/components/landing/landing.component.spec.ts with MSAL service mocks
- [X] T031 [P] [US1] Test that landing page renders without authentication in src/app/components/landing/landing.component.spec.ts
- [X] T032 [P] [US1] Test sign-in button calls authService.signIn() in src/app/components/landing/landing.component.spec.ts
- [ ] T033 [US1] Create integration test for landing page access in tests/integration/auth-flow.spec.ts verifying unauthenticated access

**Checkpoint**: User Story 1 complete - public landing page accessible and tested independently

---

## Phase 4: User Story 2 - User Signs In via Redirect Flow (Priority: P1) 🎯 MVP

**Goal**: Enable users to sign in through Microsoft Entra redirect flow and be redirected back with authenticated session

**Independent Test**: Click "Sign In" on landing page, complete Microsoft Entra authentication, verify redirect back to app with authenticated state

### Implementation for User Story 2

- [X] T034 [P] [US2] Implement signIn() method in src/app/services/auth.service.ts calling msalService.loginRedirect()
- [X] T035 [P] [US2] Implement signOut() method in src/app/services/auth.service.ts calling msalService.logoutRedirect()
- [X] T036 [US2] Handle redirect flow in src/app/app.ts ngOnInit() using msalService.handleRedirectObservable()
- [X] T037 [US2] Subscribe to MsalBroadcastService.msalSubject$ in src/app/services/auth.service.ts initialize() method filtering for auth events
- [X] T038 [US2] Subscribe to MsalBroadcastService.inProgress$ in src/app/services/auth.service.ts initialize() method to track interaction status
- [X] T039 [US2] Update authState signal in src/app/services/auth.service.ts when LOGIN_SUCCESS event received
- [X] T040 [US2] Update authState signal in src/app/services/auth.service.ts when LOGOUT_SUCCESS event received
- [X] T041 [US2] Handle LOGIN_FAILURE events in src/app/services/auth.service.ts by calling handleAuthError() to set error state

### Tests for User Story 2

- [X] T042 [P] [US2] Create unit test for AuthService in src/app/services/auth.service.spec.ts with MsalService and MsalBroadcastService mocks
- [X] T043 [P] [US2] Test signIn() method calls msalService.loginRedirect() in src/app/services/auth.service.spec.ts
- [X] T044 [P] [US2] Test signOut() method calls msalService.logoutRedirect() in src/app/services/auth.service.spec.ts
- [X] T045 [P] [US2] Test authState signal updates on LOGIN_SUCCESS event in src/app/services/auth.service.spec.ts
- [X] T046 [P] [US2] Test authState signal updates on LOGOUT_SUCCESS event in src/app/services/auth.service.spec.ts
- [X] T047 [P] [US2] Test error handling on LOGIN_FAILURE event in src/app/services/auth.service.spec.ts
- [X] T048 [US2] Create integration test for sign-in redirect flow in tests/integration/auth-flow.spec.ts

**Checkpoint**: User Story 2 complete - users can sign in and sign out via redirect flow

---

## Phase 5: User Story 3 - Authenticated User Accesses Voice Features (Priority: P1) 🎯 MVP

**Goal**: Protect all voice chat routes with authentication guards and ensure authenticated users can access features

**Independent Test**: Sign in, then navigate to voice chat routes and verify access is granted with no additional authentication prompts

### Implementation for User Story 3

- [X] T049 [P] [US3] Add MsalGuard to voice chat routes in src/app/app.routes.ts using canActivate: [MsalGuard]
- [X] T050 [P] [US3] Update navigation component in src/app/components/navigation/navigation.component.ts to inject AuthService
- [X] T051 [US3] Add computed signals for user display name and auth status in src/app/components/navigation/navigation.component.ts
- [X] T052 [US3] Update navigation template to show user name and sign-out button when authenticated in src/app/components/navigation/navigation.component.html
- [X] T053 [US3] Add sign-out button handler in src/app/components/navigation/navigation.component.ts calling authService.signOut()
- [X] T054 [US3] Verify protectedResourceMap in src/app/app.config.ts includes Azure Functions API URL for automatic token injection
- [X] T055 [US3] Test that HTTP requests to Azure Functions include Authorization header via MsalInterceptor

### Tests for User Story 3

- [X] T056 [P] [US3] Create unit test for route guard behavior in tests/unit/route-guard.spec.ts with MsalGuard mock
- [X] T057 [P] [US3] Test authenticated users can access protected routes in tests/unit/route-guard.spec.ts
- [X] T058 [P] [US3] Test unauthenticated users redirected to sign-in from protected routes in tests/unit/route-guard.spec.ts
- [X] T059 [P] [US3] Create unit test for NavigationComponent in src/app/components/navigation/navigation.component.spec.ts
- [X] T060 [P] [US3] Test navigation shows user display name when authenticated in src/app/components/navigation/navigation.component.spec.ts
- [X] T061 [P] [US3] Test sign-out button calls authService.signOut() in src/app/components/navigation/navigation.component.spec.ts
- [X] T062 [US3] Create integration test for protected route access in tests/integration/auth-flow.spec.ts
- [X] T063 [US3] Create integration test for MsalInterceptor token injection in tests/integration/auth-flow.spec.ts

**Checkpoint**: User Story 3 complete - voice features protected and accessible to authenticated users

---

## Phase 6: User Story 4 - User Signs Out (Priority: P2)

**Goal**: Allow authenticated users to sign out, clearing local session and returning to landing page

**Independent Test**: Sign in, access voice features, click sign out, verify session cleared and redirected to landing page

### Implementation for User Story 4

- [X] T064 [US4] Verify signOut() method in src/app/services/auth.service.ts properly clears MSAL account cache
- [X] T065 [US4] Add postLogoutRedirectUri configuration in src/app/app.config.ts MSALInstanceFactory to redirect to landing page
- [X] T066 [US4] Test that sign-out clears authState signal and sets status to 'unauthenticated' in src/app/services/auth.service.ts

### Tests for User Story 4

- [X] T067 [P] [US4] Test sign-out clears user profile from authState signal in src/app/services/auth.service.spec.ts
- [X] T068 [P] [US4] Test sign-out redirects to postLogoutRedirectUri in integration test tests/integration/auth-flow.spec.ts
- [X] T069 [US4] Test that accessing protected routes after sign-out triggers re-authentication in tests/integration/auth-flow.spec.ts

**Checkpoint**: User Story 4 complete - sign-out functionality working correctly

---

## Phase 7: User Story 5 - Token Validation in Azure Functions (Priority: P1) 🎯 MVP

**Goal**: Validate bearer tokens in Azure Functions and reject unauthorized requests with 401 errors

**Independent Test**: Make API call with valid token (200 success), invalid token (401), and no token (401)

### Implementation for User Story 5

- [X] T070 [P] [US5] Create utility function in api/src/utils/config.ts to load Entra configuration from environment variables
- [X] T071 [P] [US5] Create validateAudience() helper in api/src/middleware/auth.middleware.ts to check token aud claim matches client ID
- [X] T072 [P] [US5] Create validateIssuer() helper in api/src/middleware/auth.middleware.ts to check token iss claim matches authority
- [X] T073 [US5] Initialize MSAL ConfidentialClientApplication in api/src/middleware/auth.middleware.ts for token validation
- [X] T074 [US5] Implement token signature verification in api/src/middleware/auth.middleware.ts using MSAL Node
- [X] T075 [US5] Implement token expiration check in api/src/middleware/auth.middleware.ts with clock skew tolerance (5 minutes)
- [X] T076 [US5] Extract claims (oid, email, name, tid) in api/src/middleware/auth.middleware.ts extractUserIdentity() function
- [X] T077 [US5] Return structured AuthErrorResponse in api/src/middleware/auth.middleware.ts for validation failures
- [X] T078 [US5] Add auth middleware to generateToken function in api/src/functions/generateToken.ts
- [X] T079 [US5] Update generateToken function in api/src/functions/generateToken.ts to include userIdentity in LiveKit token metadata
- [X] T080 [US5] Create LiveKitTokenMetadata interface in api/src/models/LiveKitTokenMetadata.ts with userId, displayName, email, tenantId fields

### Tests for User Story 5

- [X] T081 [P] [US5] Create unit test for auth middleware in api/src/middleware/auth.middleware.test.ts
- [X] T082 [P] [US5] Test validateToken() with valid token returns isValid: true in api/src/middleware/auth.middleware.test.ts
- [X] T083 [P] [US5] Test validateToken() with missing token returns missing_token error in api/src/middleware/auth.middleware.test.ts
- [X] T084 [P] [US5] Test validateToken() with invalid signature returns invalid_token error in api/src/middleware/auth.middleware.test.ts
- [X] T085 [P] [US5] Test validateToken() with expired token returns expired_token error in api/src/middleware/auth.middleware.test.ts
- [X] T086 [P] [US5] Test validateToken() with wrong audience returns invalid_audience error in api/src/middleware/auth.middleware.test.ts
- [X] T087 [P] [US5] Test extractUserIdentity() correctly maps token claims to UserIdentity in api/src/middleware/auth.middleware.test.ts
- [ ] T088 [US5] Create integration test for generateToken endpoint in tests/integration/auth.test.ts with real token validation
- [ ] T089 [US5] Test generateToken returns 401 for missing Authorization header in tests/integration/auth.test.ts
- [ ] T090 [US5] Test generateToken returns 401 for invalid token in tests/integration/auth.test.ts
- [ ] T091 [US5] Test generateToken returns 200 with user identity for valid token in tests/integration/auth.test.ts

**Checkpoint**: User Story 5 complete - Azure Functions properly validate tokens and embed user identity

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T092 [P] Add ARIA labels to landing page buttons in src/app/components/landing/landing.component.html for accessibility
- [X] T093 [P] Add screen reader announcements for auth state changes in src/app/services/auth.service.ts using live region
- [ ] T094 [P] Test keyboard navigation for sign-in and sign-out flows in tests/integration/accessibility.spec.ts
- [ ] T095 [P] Add loading spinner during authentication redirect using MsalBroadcastService.inProgress$ signal
- [ ] T096 [P] Add error display component for authentication errors using Angular Material snackbar
- [ ] T097 [P] Test WCAG 2.1 AA compliance for landing page using axe-core in tests/e2e/accessibility.spec.ts
- [X] T098 [P] Add API documentation comments to auth middleware in api/src/middleware/auth.middleware.ts
- [X] T099 [P] Add JSDoc comments to AuthService public methods in src/app/services/auth.service.ts
- [X] T100 [P] Update README.md with authentication setup instructions and Entra configuration steps
- [X] T101 [P] Add authentication troubleshooting section to README.md
- [ ] T102 Validate all acceptance scenarios from spec.md by running quickstart.md steps
- [ ] T103 Test multi-tab authentication synchronization using MsalBroadcastService cross-tab events
- [ ] T104 Test deep link to protected route redirects back after authentication
- [ ] T105 Verify no tokens logged to browser console (FR-023 compliance check)
- [ ] T106 Run full test suite (npm test) and verify all tests pass
- [ ] T107 Run linting (npm run lint) and fix any issues

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1, US2, US3, US5 are P1 priority (MVP)
  - US4 is P2 priority (can be deferred)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Works with US1 landing page but independently testable
- **User Story 3 (P1)**: Depends on US2 (requires sign-in capability) - Independently testable once US2 complete
- **User Story 4 (P2)**: Depends on US2 (requires sign-in to test sign-out) - Independently testable once US2 complete
- **User Story 5 (P1)**: Can start after Foundational (Phase 2) - Independent backend implementation, no dependencies on frontend stories

### Within Each User Story

- Implementation tasks before tests (TDD: tests should fail initially)
- Models before services
- Services before components
- Components before templates
- Integration tests last in each story

### Parallel Opportunities

**Phase 1 (Setup)**: All tasks can run in parallel except T002 depends on T001

**Phase 2 (Foundational)**: 
- T007, T008, T009 can run in parallel (frontend models)
- T014, T015 can run in parallel (auth service methods)
- T016, T017, T018 can run in parallel (backend models)
- T020, T021, T022 can run in parallel (middleware functions)

**Phase 3 (US1)**:
- T023, T024, T025 can run in parallel (component files)
- T030, T031, T032 can run in parallel (unit tests)

**Phase 4 (US2)**:
- T034, T035 can run in parallel (auth service methods)
- T042, T043, T044, T045, T046, T047 can run in parallel (unit tests)

**Phase 5 (US3)**:
- T049, T050 can run in parallel (different files)
- T056, T057, T058, T059, T060, T061 can run in parallel (unit tests)

**Phase 7 (US5)**:
- T070, T071, T072 can run in parallel (utility functions)
- T081-T087 can run in parallel (unit tests)

**Phase 8 (Polish)**:
- T092, T093, T094, T095, T096, T097, T098, T099, T100, T101 can all run in parallel

**Cross-Phase Parallelism**:
- After Phase 2 completes, US1, US2, and US5 can start in parallel (independent)
- US3 can start once US2 completes
- US4 can start once US2 completes

---

## Parallel Example: After Foundational Phase Completes

```bash
# Three developers can work in parallel:

Developer A (Frontend - US1):
- T023, T024, T025: Create landing component files
- T030, T031, T032: Write landing component tests

Developer B (Frontend - US2):
- T034, T035: Implement sign-in/sign-out methods
- T036-T041: Handle redirect flow and events
- T042-T047: Write auth service tests

Developer C (Backend - US5):
- T070-T077: Implement token validation
- T078-T080: Update generateToken function
- T081-T091: Write auth middleware tests
```

---

## Implementation Strategy

### MVP First (User Stories 1, 2, 3, 5 Only)

1. Complete Phase 1: Setup (T001-T006)
2. Complete Phase 2: Foundational (T007-T022) - CRITICAL BLOCKER
3. Complete Phase 3: User Story 1 (T023-T033) - Landing page
4. Complete Phase 4: User Story 2 (T034-T048) - Sign-in flow
5. Complete Phase 5: User Story 3 (T049-T063) - Protected routes
6. Complete Phase 7: User Story 5 (T070-T091) - Backend auth
7. **STOP and VALIDATE**: Test all MVP stories independently
8. Deploy/demo MVP

**Deferred for Post-MVP**:
- Phase 6: User Story 4 (Sign-out) - P2 priority
- Phase 8: Polish (Accessibility, documentation, etc.)

### Incremental Delivery

1. Foundation (Phase 1 + 2) → Can't demo yet but infrastructure ready
2. Add US1 → Demo: Public landing page
3. Add US2 → Demo: Full sign-in flow
4. Add US3 → Demo: Protected voice features
5. Add US5 → Demo: Authenticated API calls
6. Add US4 → Demo: Complete auth lifecycle
7. Add Phase 8 → Demo: Production-ready

### Parallel Team Strategy

With multiple developers:

1. Team completes Phase 1 + 2 together (Setup + Foundational)
2. Once Foundational is done:
   - Developer A: US1 (Landing page)
   - Developer B: US2 (Sign-in flow)
   - Developer C: US5 (Backend auth)
3. Once US2 completes:
   - Developer B moves to US3 (Protected routes)
   - Developer A can help with US4 (Sign-out)
4. All converge on Phase 8 (Polish)

---

## Notes

- **MSAL Angular v4**: Uses factory providers in app.config.ts, no MsalModule needed
- **Redirect Flow**: No auth callback component needed, MSAL handles automatically
- **Signals + RxJS**: AuthService bridges MsalBroadcastService observables to signals
- **Token Injection**: MsalInterceptor automatically adds tokens to configured API URLs
- **Tests**: Mock MsalService, MsalBroadcastService, and MsalGuard for unit tests
- **Environment**: Remember to register redirect URIs in Azure Portal before testing
- **Security**: Never log tokens, use HTTPS in production, enable PKCE (default in MSAL v3+)
- **Accessibility**: Use Material components for built-in ARIA support
- Each user story is independently testable - validate before moving to next story
- Commit after each task or logical group of tasks

---

## Task Summary

- **Total Tasks**: 107
- **Setup Tasks**: 6 (Phase 1)
- **Foundational Tasks**: 16 (Phase 2)
- **User Story 1 Tasks**: 11 (7 implementation + 4 tests)
- **User Story 2 Tasks**: 15 (8 implementation + 7 tests)
- **User Story 3 Tasks**: 15 (7 implementation + 8 tests)
- **User Story 4 Tasks**: 6 (3 implementation + 3 tests)
- **User Story 5 Tasks**: 22 (11 implementation + 11 tests)
- **Polish Tasks**: 16 (Phase 8)
- **Parallel Tasks**: 48 tasks marked [P]
- **MVP Scope**: Phases 1, 2, 3, 4, 5, 7 (85 tasks)
- **Post-MVP**: Phases 6, 8 (22 tasks)

---

**Tasks Complete**: All 107 tasks defined with clear file paths, dependencies, and parallel opportunities. Ready for implementation.
