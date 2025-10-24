# Tasks: LiveKit Token Generation API

**Input**: Design documents from `/specs/002-livekit-token-api/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/token-api.openapi.yaml

**Tests**: Tests are MANDATORY per Constitutional Principle III (Test-First Development). All tasks include corresponding test implementation following TDD approach.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Azure Functions backend**: `api/src/`, `api/src/functions/`, `api/src/models/`, `api/src/services/`, `api/src/utils/`
- **Tests**: `tests/unit/`, `tests/integration/`
- **Configuration**: `api/host.json`, `api/local.settings.json`, `api/tsconfig.json`, `api/package.json`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and Azure Functions structure

- [X] T001 Initialize Azure Functions TypeScript v4 project in api/ folder (if not already initialized)
- [X] T002 Install dependencies: @azure/functions, @livekit/server-sdk, zod in api/package.json
- [X] T003 [P] Install dev dependencies: typescript, @types/node, jest, ts-jest, @types/jest in api/package.json
- [X] T004 [P] Configure TypeScript compiler in api/tsconfig.json with strict mode enabled
- [X] T005 [P] Configure Jest for unit and integration testing in api/jest.config.js
- [X] T006 [P] Setup CORS configuration in api/host.json for localhost:4200
- [X] T007 Create local.settings.json.example in api/ with placeholder LiveKit credentials
- [X] T008 [P] Add npm scripts (build, start, test) to api/package.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T009 [P] Create TokenRequest interface in api/src/models/TokenRequest.ts per data-model.md
- [X] T010 [P] Create TokenResponse interface in api/src/models/TokenResponse.ts per data-model.md
- [X] T011 [P] Create ErrorResponse and ValidationError interfaces in api/src/models/ErrorResponse.ts per data-model.md
- [X] T012 [P] Create ErrorCode enum in api/src/models/ErrorResponse.ts per data-model.md
- [X] T013 [P] Create LiveKitConfig interface in api/src/models/LiveKitConfig.ts per data-model.md
- [X] T014 Create Zod validation schema for TokenRequest in api/src/utils/validation.ts
- [X] T015 [P] Create ILiveKitTokenGenerator interface in api/src/services/LiveKitTokenService.ts for dependency injection
- [X] T016 [P] Setup configuration loading utility in api/src/utils/config.ts with lazy initialization pattern

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Generate Token for New Voice Session (Priority: P1) 🎯 MVP

**Goal**: Enable frontend to request and receive valid LiveKit access tokens for joining voice chat sessions

**Independent Test**: Make HTTP POST request to /api/token with roomName and participantIdentity, verify valid JWT token is returned that can authenticate with LiveKit servers

### Tests for User Story 1 (MANDATORY - Constitutional Requirement) ✅

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T017 [P] [US1] Unit test for LiveKitTokenService.generateToken() success case in tests/unit/LiveKitTokenService.test.ts
- [X] T018 [P] [US1] Unit test for LiveKitTokenService.generateToken() with custom expiration in tests/unit/LiveKitTokenService.test.ts
- [X] T019 [P] [US1] Unit test for LiveKitTokenService.generateToken() with participant name in tests/unit/LiveKitTokenService.test.ts
- [X] T020 [P] [US1] Integration test for POST /api/token endpoint with valid request in tests/integration/generateToken.test.ts
- [X] T021 [P] [US1] Integration test verifying token JWT structure and claims in tests/integration/generateToken.test.ts
- [X] T022 [P] [US1] Integration test verifying token can authenticate with LiveKit SDK in tests/integration/generateToken.test.ts

### Implementation for User Story 1

- [X] T023 [US1] Implement LiveKitTokenService.generateToken() method in api/src/services/LiveKitTokenService.ts using @livekit/server-sdk
- [X] T024 [US1] Implement token expiration logic with 1-hour default in api/src/services/LiveKitTokenService.ts
- [X] T025 [US1] Implement audio permissions (canPublish, canSubscribe) configuration in api/src/services/LiveKitTokenService.ts
- [X] T026 [US1] Create generateToken HTTP trigger function in api/src/functions/generateToken.ts
- [X] T027 [US1] Implement request body parsing and Zod validation in api/src/functions/generateToken.ts
- [X] T028 [US1] Implement success response formatting (200 OK) in api/src/functions/generateToken.ts
- [X] T029 [US1] Add structured logging with context.log for token generation requests in api/src/functions/generateToken.ts
- [X] T030 [US1] Register generateToken function in Azure Functions app with POST method and anonymous auth level

**Checkpoint**: At this point, User Story 1 should be fully functional - frontend can successfully request and receive valid LiveKit tokens

---

## Phase 4: User Story 2 - Handle Invalid Token Requests (Priority: P2)

**Goal**: Provide clear error messages for invalid requests to improve developer experience and troubleshooting

**Independent Test**: Send requests with missing/invalid parameters and verify appropriate HTTP 400 errors with descriptive messages are returned

### Tests for User Story 2 (MANDATORY - Constitutional Requirement) ✅

- [X] T031 [P] [US2] Unit test for validation of missing roomName in tests/unit/validation.test.ts
- [X] T032 [P] [US2] Unit test for validation of missing participantIdentity in tests/unit/validation.test.ts
- [X] T033 [P] [US2] Unit test for validation of invalid roomName pattern in tests/unit/validation.test.ts
- [X] T034 [P] [US2] Unit test for validation of invalid participantIdentity pattern in tests/unit/validation.test.ts
- [X] T035 [P] [US2] Unit test for validation of roomName exceeding max length in tests/unit/validation.test.ts
- [X] T036 [P] [US2] Integration test for POST /api/token with missing roomName returns 400 in tests/integration/generateToken.test.ts
- [X] T037 [P] [US2] Integration test for POST /api/token with missing participantIdentity returns 400 in tests/integration/generateToken.test.ts
- [X] T038 [P] [US2] Integration test for POST /api/token with invalid roomName format returns 400 with validation details in tests/integration/generateToken.test.ts

### Implementation for User Story 2

- [X] T039 [US2] Implement validateTokenRequest() function in api/src/utils/validation.ts using Zod schema
- [X] T040 [US2] Implement formatValidationError() helper in api/src/utils/validation.ts to convert Zod errors to ErrorResponse
- [X] T041 [US2] Add try-catch validation error handling in api/src/functions/generateToken.ts
- [X] T042 [US2] Implement 400 error response formatting with validation details in api/src/functions/generateToken.ts
- [X] T043 [US2] Add error logging with validation failure context in api/src/functions/generateToken.ts

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - valid requests succeed, invalid requests fail gracefully with clear errors

---

## Phase 5: User Story 3 - Token Expiration Configuration (Priority: P3)

**Goal**: Allow configuration of token expiration times for different use case scenarios

**Independent Test**: Request tokens with different expirationSeconds parameters and verify token JWT exp claim matches requested duration

### Tests for User Story 3 (MANDATORY - Constitutional Requirement) ✅

- [X] T044 [P] [US3] Unit test for token generation with custom expiration (7200 seconds) in tests/unit/LiveKitTokenService.test.ts
- [X] T045 [P] [US3] Unit test for token generation with minimum expiration (60 seconds) in tests/unit/LiveKitTokenService.test.ts
- [X] T046 [P] [US3] Unit test for token generation with maximum expiration (86400 seconds) in tests/unit/LiveKitTokenService.test.ts
- [X] T047 [P] [US3] Unit test for validation of expirationSeconds below minimum (59 seconds) in tests/unit/validation.test.ts
- [X] T048 [P] [US3] Unit test for validation of expirationSeconds above maximum (86401 seconds) in tests/unit/validation.test.ts
- [X] T049 [P] [US3] Integration test for POST /api/token with custom expiration verifies JWT exp claim in tests/integration/generateToken.test.ts
- [X] T050 [P] [US3] Integration test for POST /api/token with invalid expiration returns 400 in tests/integration/generateToken.test.ts

### Implementation for User Story 3

- [X] T051 [US3] Add expirationSeconds parameter handling in api/src/services/LiveKitTokenService.ts
- [X] T052 [US3] Implement default expiration (3600) when parameter omitted in api/src/services/LiveKitTokenService.ts
- [X] T053 [US3] Add expirationSeconds validation to Zod schema (60-86400 range) in api/src/utils/validation.ts
- [X] T054 [US3] Update TokenResponse to include calculated expiresAt timestamp in api/src/functions/generateToken.ts

**Checkpoint**: All user stories should now be independently functional - tokens can be generated with default or custom expiration times

---

## Phase 6: Error Handling & Edge Cases

**Purpose**: Handle edge cases and server errors identified in spec.md

### Tests for Error Handling ✅

- [X] T055 [P] Unit test for missing LIVEKIT_API_KEY environment variable in tests/unit/LiveKitTokenService.test.ts
- [X] T056 [P] Unit test for missing LIVEKIT_API_SECRET environment variable in tests/unit/LiveKitTokenService.test.ts
- [X] T057 [P] Integration test for POST /api/token when credentials missing returns 500 in tests/integration/generateToken.test.ts
- [X] T058 [P] Integration test for POST /api/token when SDK throws error returns 500 in tests/integration/generateToken.test.ts

### Implementation for Error Handling

- [X] T059 Implement missing credentials check in api/src/utils/config.ts with descriptive error
- [X] T060 Add try-catch for LiveKit SDK errors in api/src/services/LiveKitTokenService.ts
- [X] T061 Implement 500 error response formatting for server errors in api/src/functions/generateToken.ts
- [X] T062 Add error logging with full context for debugging in api/src/functions/generateToken.ts

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and production readiness

- [X] T063 [P] Create comprehensive README.md in api/ folder with setup instructions
- [ ] T064 [P] Verify quickstart.md cURL examples work with actual implementation
- [ ] T065 [P] Add OpenAPI contract validation tests comparing implementation to contracts/token-api.openapi.yaml
- [X] T066 Update local.settings.json.example with all required environment variables and comments
- [ ] T067 [P] Add JSDoc comments to all public methods and interfaces
- [ ] T068 [P] Run ESLint and fix any linting issues across all source files
- [X] T069 Verify test coverage meets >80% threshold per research.md
- [ ] T070 [P] Add Application Insights instrumentation for production monitoring (optional)
- [X] T071 Run full test suite and verify all tests pass
- [ ] T072 Run quickstart.md validation with local Azure Functions runtime

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Error Handling (Phase 6)**: Can start after US1 is complete
- **Polish (Phase 7)**: Depends on all user stories and error handling being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Enhances US1 but independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Extends US1 but independently testable

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Models/interfaces before services
- Services before HTTP functions
- Core implementation before error handling
- Story complete before moving to next priority

### Parallel Opportunities

- **Phase 1 Setup**: All tasks marked [P] can run in parallel (T003, T004, T005, T006, T008)
- **Phase 2 Foundational**: All model creation tasks (T009-T013) can run in parallel, then T014-T016 in parallel
- **User Story Tests**: All tests within each story can be written in parallel
- **User Stories**: Different stories (US1, US2, US3) can be worked on in parallel by different team members after Phase 2
- **Phase 7 Polish**: Documentation tasks (T063, T064, T067, T068) can run in parallel

---

## Parallel Example: User Story 1

```bash
# Write all tests for User Story 1 together (TDD approach):
Task T017: "Unit test for LiveKitTokenService.generateToken() success case"
Task T018: "Unit test for LiveKitTokenService.generateToken() with custom expiration"
Task T019: "Unit test for LiveKitTokenService.generateToken() with participant name"
Task T020: "Integration test for POST /api/token endpoint with valid request"
Task T021: "Integration test verifying token JWT structure and claims"
Task T022: "Integration test verifying token can authenticate with LiveKit SDK"

# All tests should FAIL (red phase)

# Then implement User Story 1:
Task T023-T030: Implementation tasks in sequence (some depend on each other)

# All tests should now PASS (green phase)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup → Azure Functions project initialized
2. Complete Phase 2: Foundational (CRITICAL) → All models and interfaces ready
3. Complete Phase 3: User Story 1 → Basic token generation working
4. **STOP and VALIDATE**: Test User Story 1 independently with cURL/Postman
5. Deploy to Azure Functions or demo locally

**This delivers**: Working token generation API that frontend can call to join LiveKit rooms

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready ✅
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!) ✅
3. Add User Story 2 → Test independently → Deploy/Demo ✅ (Now with validation!)
4. Add User Story 3 → Test independently → Deploy/Demo ✅ (Now with custom expiration!)
5. Add Error Handling → Robust production-ready API ✅
6. Polish → Documentation and monitoring complete ✅

Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - **Developer A**: User Story 1 (T017-T030)
   - **Developer B**: User Story 2 (T031-T043)
   - **Developer C**: User Story 3 (T044-T054)
3. Stories complete and integrate independently
4. Team converges on Error Handling and Polish phases

---

## Task Summary

- **Total Tasks**: 72
- **Phase 1 (Setup)**: 8 tasks
- **Phase 2 (Foundational)**: 8 tasks
- **Phase 3 (User Story 1)**: 14 tasks (6 tests + 8 implementation)
- **Phase 4 (User Story 2)**: 13 tasks (8 tests + 5 implementation)
- **Phase 5 (User Story 3)**: 11 tasks (7 tests + 4 implementation)
- **Phase 6 (Error Handling)**: 8 tasks (4 tests + 4 implementation)
- **Phase 7 (Polish)**: 10 tasks

**Parallel Opportunities**: 35 tasks marked [P] can run in parallel with other tasks in same phase

**Independent Test Criteria**:
- **US1**: POST request returns valid LiveKit JWT token
- **US2**: Invalid requests return 400 with clear error messages
- **US3**: Custom expiration parameter reflected in token JWT claims

**Suggested MVP Scope**: Phase 1 + Phase 2 + Phase 3 (User Story 1 only) = 30 tasks

---

## Notes

- **[P] tasks** = different files, no dependencies within phase - can run in parallel
- **[Story] label** maps task to specific user story (US1, US2, US3) for traceability
- **TDD approach**: Write tests first (should FAIL), then implement (tests PASS), then refactor
- Each user story should be independently completable and testable
- Stop at any checkpoint to validate story independently
- Commit after each task or logical group of related tasks
- The API folder structure follows Azure Functions v4 TypeScript conventions
- All TypeScript code must use strict mode with no `any` types
- Test coverage target: >80% per research.md findings
