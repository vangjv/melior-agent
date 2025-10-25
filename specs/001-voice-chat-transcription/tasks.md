---
description: "Task list for Voice Chat Transcription App feature implementation"
---

# Tasks: Voice Chat Transcription App

**Input**: Design documents from `/specs/001-voice-chat-transcription/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/service-contracts.md

**Tests**: Following Constitutional Principle III (Test-First Development), all implementation tasks include corresponding test implementation using TDD approach.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Angular project**: `src/app/`, `src/app/components/`, `src/app/services/`, `src/app/models/`
- **Tests**: Component tests `*.spec.ts` alongside components, E2E tests in `tests/e2e/`
- **Styling**: `*.scss` files alongside components for encapsulated styling

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Verify Angular 20 project structure matches plan.md specification in src/app/
- [X] T002 Install livekit-client@^2.0.0 dependency via npm
- [X] T003 [P] Install @angular/material and configure custom theme in src/styles.scss
- [X] T004 [P] Install @angular/cdk for virtual scrolling support
- [X] T005 [P] Configure TypeScript strict mode in tsconfig.json per Constitution Check
- [X] T006 [P] Configure performance budgets in angular.json (500KB warning, 1MB error)
- [X] T007 [P] Create environment configuration files with tokenApiUrl and liveKitUrl in src/environments/
- [X] T008 [P] Verify backend token API (002-livekit-token-api) is running at http://localhost:7071
- [X] T009 Update .gitignore to exclude environment secrets and node_modules

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T010 [P] Create ConnectionState discriminated union types in src/app/models/connection-state.model.ts
- [X] T011 [P] Create ConnectionError interface and error code types in src/app/models/connection-state.model.ts
- [X] T012 [P] Create TranscriptionMessage interface in src/app/models/transcription-message.model.ts
- [X] T013 [P] Create VoiceSession and SessionMetadata interfaces in src/app/models/session.model.ts
- [X] T014 [P] Create LiveKit configuration interface in src/app/models/livekit-config.model.ts
- [X] T015 [P] Create TokenRequest and TokenResponse interfaces in src/app/models/token.model.ts
- [X] T016 [P] Create TokenApiError interface for backend error handling in src/app/models/token.model.ts
- [X] T017 [P] Create ILiveKitConnectionService contract interface in src/app/services/livekit-connection.service.ts
- [X] T018 [P] Create ITranscriptionService contract interface in src/app/services/transcription.service.ts
- [X] T019 [P] Create ITokenService contract interface in src/app/services/token.service.ts
- [X] T020 Configure Angular Material theme with custom colors and typography in src/styles.scss
- [X] T021 Setup global SCSS variables for mobile-first breakpoints in src/styles.scss

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T009 [P] Create ConnectionState discriminated union types in src/app/models/connection-state.model.ts
- [X] T010 [P] Create ConnectionError interface and error code types in src/app/models/connection-state.model.ts
- [X] T011 [P] Create TranscriptionMessage interface in src/app/models/transcription-message.model.ts
- [X] T012 [P] Create VoiceSession and SessionMetadata interfaces in src/app/models/session.model.ts
- [X] T013 [P] Create LiveKit configuration interface in src/app/models/livekit-config.model.ts
- [X] T014 [P] Create TokenRequest and TokenResponse interfaces in src/app/models/token.model.ts
- [X] T015 [P] Create TokenApiError interface for backend error handling in src/app/models/token.model.ts
- [X] T016 [P] Create ILiveKitConnectionService contract interface in src/app/services/livekit-connection.service.ts
- [X] T017 [P] Create ITranscriptionService contract interface in src/app/services/transcription.service.ts
- [X] T018 [P] Create ITokenService contract interface in src/app/services/token.service.ts
- [X] T019 Configure Angular Material theme with custom colors and typography in src/styles.scss
- [X] T020 Setup global SCSS variables for mobile-first breakpoints in src/styles.scss

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Establish Voice Connection (Priority: P1) 🎯 MVP

**Goal**: Enable users to connect to LiveKit voice agent via a connect button, establishing real-time voice communication

**Independent Test**: Launch app, tap connect button, verify voice connection established, speak and hear agent response

**Key Integration**: Uses Token Service to obtain LiveKit access tokens from backend API (002-livekit-token-api) before establishing connection

### Tests for User Story 1 (TDD - Write First) ✅

- [X] T021 [P] [US1] Write unit test for TokenService.generateToken() success in src/app/services/token.service.spec.ts
- [X] T022 [P] [US1] Write unit test for TokenService.generateToken() handles 400 validation errors in src/app/services/token.service.spec.ts
- [X] T023 [P] [US1] Write unit test for TokenService.generateToken() retries on 500 errors in src/app/services/token.service.spec.ts
- [X] T024 [P] [US1] Write unit test for checkMicrophonePermission() in src/app/services/livekit-connection.service.spec.ts
- [X] T025 [P] [US1] Write unit test for requestMicrophonePermission() in src/app/services/livekit-connection.service.spec.ts
- [X] T026 [P] [US1] Write unit test for connect() first obtains token from TokenService in src/app/services/livekit-connection.service.spec.ts
- [X] T027 [P] [US1] Write unit test for connect() method transitions to 'connecting' state in src/app/services/livekit-connection.service.spec.ts
- [X] T028 [P] [US1] Write unit test for connect() success transitions to 'connected' state in src/app/services/livekit-connection.service.spec.ts
- [X] T029 [P] [US1] Write unit test for connect() failure transitions to 'error' state in src/app/services/livekit-connection.service.spec.ts
- [X] T030 [P] [US1] Write unit test for connect() handles token acquisition failure gracefully in src/app/services/livekit-connection.service.spec.ts
- [X] T031 [P] [US1] Write unit test for ConnectionButtonComponent shows "Connect" when disconnected in src/app/components/connection-button/connection-button.component.spec.ts
- [X] T032 [P] [US1] Write unit test for ConnectionButtonComponent shows "Disconnect" when connected in src/app/components/connection-button/connection-button.component.spec.ts
- [X] T033 [US1] Write integration test for token acquisition + connection flow in tests/integration/livekit-integration.spec.ts

### Implementation for User Story 1

- [X] T034 [P] [US1] Create TokenService with providedIn: 'root' in src/app/services/token.service.ts
- [X] T035 [US1] Inject HttpClient and environment config into TokenService in src/app/services/token.service.ts
- [X] T036 [US1] Implement TokenService.generateToken() with HTTP POST to /api/token in src/app/services/token.service.ts
- [X] T037 [US1] Add retry logic (2 attempts, 1s delay) for transient failures in src/app/services/token.service.ts
- [X] T038 [US1] Implement error handling mapping backend errors to TokenApiError in src/app/services/token.service.ts
- [X] T039 [US1] Add validateTokenRequest() method with validation rules in src/app/services/token.service.ts
- [X] T040 [US1] Implement LiveKitConnectionService.checkMicrophonePermission() with navigator.permissions API in src/app/services/livekit-connection.service.ts
- [X] T041 [US1] Implement LiveKitConnectionService.requestMicrophonePermission() with getUserMedia in src/app/services/livekit-connection.service.ts
- [X] T042 [US1] Inject TokenService into LiveKitConnectionService constructor in src/app/services/livekit-connection.service.ts
- [X] T043 [US1] Update connect() to call tokenService.generateToken() before LiveKit connection in src/app/services/livekit-connection.service.ts
- [X] T044 [US1] Implement LiveKitConnectionService.connect() with LiveKit Room connection logic in src/app/services/livekit-connection.service.ts
- [X] T045 [US1] Add connectionState Signal management for state transitions in src/app/services/livekit-connection.service.ts
- [X] T046 [US1] Add currentSession Signal to track VoiceSession in src/app/services/livekit-connection.service.ts
- [X] T047 [US1] Add connectionQuality Signal with RoomEvent.ConnectionQualityChanged handler in src/app/services/livekit-connection.service.ts
- [X] T048 [US1] Implement error handling for PERMISSION_DENIED errors in src/app/services/livekit-connection.service.ts
- [X] T049 [US1] Implement error handling for NETWORK_ERROR and SERVER_UNAVAILABLE in src/app/services/livekit-connection.service.ts
- [X] T050 [US1] Implement error handling for token acquisition failures (AUTHENTICATION_FAILED) in src/app/services/livekit-connection.service.ts
- [X] T051 [P] [US1] Create ConnectionButtonComponent with standalone component decorator in src/app/components/connection-button/connection-button.component.ts
- [X] T052 [US1] Add connectionState input signal to ConnectionButtonComponent in src/app/components/connection-button/connection-button.component.ts
- [X] T053 [US1] Add onConnect output signal emitter to ConnectionButtonComponent in src/app/components/connection-button/connection-button.component.ts
- [X] T054 [US1] Implement button template with conditional "Connect"/"Disconnect" text in src/app/components/connection-button/connection-button.component.html
- [X] T055 [US1] Style ConnectionButtonComponent with Material button and mobile touch targets (44x44pt min) in src/app/components/connection-button/connection-button.component.scss
- [X] T056 [P] [US1] Create VoiceChatComponent as smart component with standalone decorator in src/app/components/voice-chat/voice-chat.component.ts
- [X] T057 [US1] Inject LiveKitConnectionService into VoiceChatComponent constructor in src/app/components/voice-chat/voice-chat.component.ts
- [X] T058 [US1] Implement handleConnect() method calling service.connect() in src/app/components/voice-chat/voice-chat.component.ts
- [X] T059 [US1] Add connection state computed signal from service in src/app/components/voice-chat/voice-chat.component.ts
- [X] T060 [US1] Create VoiceChatComponent template with ConnectionButtonComponent in src/app/components/voice-chat/voice-chat.component.html
- [X] T080 [US1] Style VoiceChatComponent with mobile-first responsive layout in src/app/components/voice-chat/voice-chat.component.scss
- [X] T081 [US1] Add ARIA labels for connection state announcements in src/app/components/voice-chat/voice-chat.component.html
- [X] T082 [US1] Add error display for token acquisition failures in src/app/components/voice-chat/voice-chat.component.html
- [X] T083 [US1] Update app.component to include VoiceChatComponent in src/app/app.component.html
- [X] T084 [US1] Verify all tests pass for User Story 1
- [X] T085 [US1] Verify backend token API integration works end-to-end

**Checkpoint**: At this point, User Story 1 should be fully functional - users can obtain tokens from backend and connect to voice agent

---

## Phase 4: User Story 3 - End Voice Session (Priority: P1)

**Goal**: Enable users to cleanly disconnect from the voice chat session via disconnect button

**Independent Test**: Establish connection, tap disconnect button, verify connection ends cleanly and UI returns to initial state

**Note**: US3 implemented before US2 as it completes the core connection lifecycle (connect/disconnect) which is P1 priority

### Tests for User Story 3 (TDD - Write First) ✅

- [X] T048 [P] [US3] Write unit test for disconnect() method transitions to 'disconnected' state in src/app/services/livekit-connection.service.spec.ts
- [X] T049 [P] [US3] Write unit test for disconnect() cleans up LiveKit Room instance in src/app/services/livekit-connection.service.spec.ts
- [X] T050 [P] [US3] Write unit test for disconnect button click emits onDisconnect event in src/app/components/connection-button/connection-button.component.spec.ts
- [X] T051 [US3] Write integration test for connect-disconnect lifecycle in tests/integration/livekit-integration.spec.ts

### Implementation for User Story 3

- [X] T052 [US3] Implement LiveKitConnectionService.disconnect() with Room cleanup in src/app/services/livekit-connection.service.ts
- [X] T053 [US3] Add state transition from 'connected' to 'disconnected' on disconnect in src/app/services/livekit-connection.service.ts
- [X] T054 [US3] Add RoomEvent.Disconnected handler to update connectionState signal in src/app/services/livekit-connection.service.ts
- [X] T055 [US3] Handle unexpected disconnections with error state transitions in src/app/services/livekit-connection.service.ts
- [X] T056 [US3] Add onDisconnect output signal emitter to ConnectionButtonComponent in src/app/components/connection-button/connection-button.component.ts
- [X] T057 [US3] Implement handleDisconnect() method in VoiceChatComponent calling service.disconnect() in src/app/components/voice-chat/voice-chat.component.ts
- [X] T058 [US3] Add disconnect button handler binding in VoiceChatComponent template in src/app/components/voice-chat/voice-chat.component.html
- [X] T059 [US3] Add ARIA live region announcement for disconnection in src/app/components/voice-chat/voice-chat.component.html
- [X] T060 [US3] Verify all tests pass for User Story 3

**Checkpoint**: At this point, User Story 1 should be fully functional - users can obtain tokens from backend and connect to voice agent

---

## Phase 4: User Story 3 - End Voice Session (Priority: P1)

**Goal**: Enable users to cleanly disconnect from the voice chat session via disconnect button

**Independent Test**: Establish connection, tap disconnect button, verify connection ends cleanly and UI returns to initial state

**Note**: US3 implemented before US2 as it completes the core connection lifecycle (connect/disconnect) which is P1 priority

### Tests for User Story 3 (TDD - Write First) ✅

- [X] T086 [P] [US3] Write unit test for disconnect() method transitions to 'disconnected' state in src/app/services/livekit-connection.service.spec.ts
- [X] T087 [P] [US3] Write unit test for disconnect() cleans up LiveKit Room instance in src/app/services/livekit-connection.service.spec.ts
- [X] T088 [P] [US3] Write unit test for disconnect button click emits onDisconnect event in src/app/components/connection-button/connection-button.component.spec.ts
- [X] T089 [US3] Write integration test for connect-disconnect lifecycle in tests/integration/livekit-integration.spec.ts

### Implementation for User Story 3

- [X] T090 [US3] Implement LiveKitConnectionService.disconnect() with Room cleanup in src/app/services/livekit-connection.service.ts
- [X] T091 [US3] Add state transition from 'connected' to 'disconnected' on disconnect in src/app/services/livekit-connection.service.ts
- [X] T092 [US3] Add RoomEvent.Disconnected handler to update connectionState signal in src/app/services/livekit-connection.service.ts
- [X] T093 [US3] Handle unexpected disconnections with error state transitions in src/app/services/livekit-connection.service.ts
- [X] T094 [US3] Add onDisconnect output signal emitter to ConnectionButtonComponent in src/app/components/connection-button/connection-button.component.ts
- [X] T095 [US3] Implement handleDisconnect() method in VoiceChatComponent calling service.disconnect() in src/app/components/voice-chat/voice-chat.component.ts
- [X] T096 [US3] Add disconnect button handler binding in VoiceChatComponent template in src/app/components/voice-chat/voice-chat.component.html
- [X] T097 [US3] Add ARIA live region announcement for disconnection in src/app/components/voice-chat/voice-chat.component.html
- [X] T079 [US3] Verify all tests pass for User Story 3

**Checkpoint**: At this point, User Stories 1 AND 3 should both work - complete connect/disconnect lifecycle

---

---

## Phase 5: User Story 2 - View Real-Time Transcription (Priority: P2)

**Goal**: Display real-time transcription of user and agent speech during active voice session

**Independent Test**: Establish connection, speak a sentence, verify transcription appears on screen with speaker distinction

### Tests for User Story 2 (TDD - Write First) ✅

- [X] T080 [P] [US2] Write unit test for startTranscription() subscribes to RoomEvent.TranscriptionReceived in src/app/services/transcription.service.spec.ts
- [X] T081 [P] [US2] Write unit test for new transcription updates transcriptions signal in src/app/services/transcription.service.spec.ts
- [X] T082 [P] [US2] Write unit test for interim transcription updates interimTranscription signal in src/app/services/transcription.service.spec.ts
- [X] T083 [P] [US2] Write unit test for stopTranscription() unsubscribes from events in src/app/services/transcription.service.spec.ts
- [X] T084 [P] [US2] Write unit test for TranscriptionDisplayComponent renders messages in src/app/components/transcription-display/transcription-display.component.spec.ts
- [X] T085 [P] [US2] Write unit test for speaker distinction (user vs agent styling) in src/app/components/transcription-display/transcription-display.component.spec.ts
- [X] T086 [P] [US2] Write unit test for auto-scroll to latest message in src/app/components/transcription-display/transcription-display.component.spec.ts
- [X] T087 [US2] Write E2E test for full transcription flow in tests/e2e/voice-chat.spec.ts

### Implementation for User Story 2

- [X] T088 [P] [US2] Create TranscriptionService with providedIn: 'root' in src/app/services/transcription.service.ts
- [X] T089 [US2] Add transcriptions signal as readonly array in src/app/services/transcription.service.ts
- [X] T090 [US2] Add interimTranscription signal for non-final transcriptions in src/app/services/transcription.service.ts
- [X] T091 [US2] Add messageCount computed signal from transcriptions.length in src/app/services/transcription.service.ts
- [X] T092 [US2] Implement startTranscription() to subscribe to RoomEvent.TranscriptionReceived in src/app/services/transcription.service.ts
- [X] T093 [US2] Implement mapLiveKitSegmentToMessage() mapper function in src/app/services/transcription.service.ts
- [X] T094 [US2] Update transcriptions signal on new final transcription received in src/app/services/transcription.service.ts
- [X] T095 [US2] Update interimTranscription signal on interim transcription in src/app/services/transcription.service.ts
- [X] T096 [US2] Implement stopTranscription() cleanup and unsubscribe in src/app/services/transcription.service.ts
- [X] T097 [US2] Implement clearTranscriptions() to reset signals in src/app/services/transcription.service.ts
- [X] T079 [P] [US2] Create TranscriptionDisplayComponent with standalone decorator in src/app/components/transcription-display/transcription-display.component.ts
- [X] T080 [US2] Add transcriptions input signal to TranscriptionDisplayComponent in src/app/components/transcription-display/transcription-display.component.ts
- [X] T081 [US2] Add OnPush change detection strategy to TranscriptionDisplayComponent in src/app/components/transcription-display/transcription-display.component.ts
- [X] T082 [US2] Implement template with @for loop and trackBy using message.id in src/app/components/transcription-display/transcription-display.component.html
- [X] T083 [US2] Add ARIA live region with role="log" aria-live="polite" in src/app/components/transcription-display/transcription-display.component.html
- [X] T084 [US2] Style user messages with distinct color/alignment in src/app/components/transcription-display/transcription-display.component.scss
- [X] T085 [US2] Style agent messages with distinct color/alignment in src/app/components/transcription-display/transcription-display.component.scss
- [X] T086 [US2] Add timestamp display with Angular date pipe in src/app/components/transcription-display/transcription-display.component.html
- [X] T087 [US2] Implement auto-scroll using ViewChild and scrollIntoView in src/app/components/transcription-display/transcription-display.component.ts
- [X] T088 [US2] Inject TranscriptionService into VoiceChatComponent in src/app/components/voice-chat/voice-chat.component.ts
- [X] T089 [US2] Call transcriptionService.startTranscription() on successful connection in src/app/components/voice-chat/voice-chat.component.ts
- [X] T090 [US2] Call transcriptionService.stopTranscription() on disconnect in src/app/components/voice-chat/voice-chat.component.ts
- [X] T091 [US2] Add TranscriptionDisplayComponent to VoiceChatComponent template in src/app/components/voice-chat/voice-chat.component.html
- [X] T092 [US2] Pass transcriptions signal to TranscriptionDisplayComponent input in src/app/components/voice-chat/voice-chat.component.html
- [X] T093 [US2] Verify all tests pass for User Story 2

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently - full voice chat with transcription

---

## Phase 6: User Story 4 - Mobile-Optimized Experience (Priority: P2)

**Goal**: Ensure responsive, usable experience across various mobile device screen sizes

**Independent Test**: Open app on phone portrait, phone landscape, and tablet; verify all UI elements accessible and readable

### Tests for User Story 4 (TDD - Write First) ✅

- [X] T094 [P] [US4] Write responsive layout test for portrait mode (320px-480px) in src/app/components/voice-chat/voice-chat.component.spec.ts
- [X] T095 [P] [US4] Write responsive layout test for landscape mode (568px-768px) in src/app/components/voice-chat/voice-chat.component.spec.ts
- [X] T096 [P] [US4] Write virtual scrolling activation test for >100 messages in src/app/components/transcription-display/transcription-display.component.spec.ts
- [X] T097 [US4] Write E2E accessibility test with screen reader navigation in tests/e2e/accessibility.spec.ts

### Implementation for User Story 4

- [X] T098 [P] [US4] Add mobile-first media queries for portrait mode in src/app/components/voice-chat/voice-chat.component.scss
- [X] T099 [P] [US4] Add media queries for landscape orientation in src/app/components/voice-chat/voice-chat.component.scss
- [X] T100 [P] [US4] Add media queries for tablet sizes (768px+) in src/app/components/voice-chat/voice-chat.component.scss
- [X] T101 [P] [US4] Ensure touch targets meet 44x44pt minimum in src/app/components/connection-button/connection-button.component.scss
- [X] T102 [US4] Implement virtual scrolling with CdkVirtualScrollViewport in src/app/components/transcription-display/transcription-display.component.html
- [X] T103 [US4] Configure itemSize for virtual scrolling optimization in src/app/components/transcription-display/transcription-display.component.ts
- [X] T104 [US4] Add conditional virtual scrolling only when messageCount > 100 in src/app/components/transcription-display/transcription-display.component.ts
- [X] T105 [US4] Test and adjust viewport height for mobile screens in src/app/components/transcription-display/transcription-display.component.scss
- [X] T106 [US4] Add system font size scaling support with relative units (rem/em) in src/styles.scss
- [X] T107 [US4] Verify layout integrity with large system fonts in src/app/components/voice-chat/voice-chat.component.scss
- [X] T108 [US4] Add focus management for keyboard navigation in src/app/components/voice-chat/voice-chat.component.ts
- [X] T109 [US4] Verify all tests pass for User Story 4

**Checkpoint**: All user stories should now be independently functional - complete mobile-optimized voice chat app

---

## Phase 7: Reconnection & Error Handling (Enhancement)

**Purpose**: Handle network interruptions and improve resilience

- [X] T110 [P] [US3] Write unit test for reconnect() method with exponential backoff in src/app/services/livekit-connection.service.spec.ts
- [X] T111 [P] [US3] Write unit test for RoomEvent.Reconnecting state transition in src/app/services/livekit-connection.service.spec.ts
- [X] T112 [US3] Implement LiveKitConnectionService.reconnect() with retry logic in src/app/services/livekit-connection.service.ts
- [X] T113 [US3] Add RoomEvent.Reconnecting handler to set reconnecting state in src/app/services/livekit-connection.service.ts
- [X] T114 [US3] Add RoomEvent.Reconnected handler to restore connected state in src/app/services/livekit-connection.service.ts
- [X] T115 [US3] Implement exponential backoff logic (1s, 2s, 4s, 8s, 16s max) in src/app/services/livekit-connection.service.ts
- [X] T116 [US3] Add max retry limit (5 attempts) before manual reconnect required in src/app/services/livekit-connection.service.ts
- [X] T117 [US3] Display reconnecting status in ConnectionButtonComponent in src/app/components/connection-button/connection-button.component.html
- [X] T118 [US3] Show retry attempt count in UI during reconnection in src/app/components/voice-chat/voice-chat.component.html
- [X] T119 [US3] Preserve transcription state during reconnection attempts in src/app/services/transcription.service.ts

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T120 [P] Add high contrast mode CSS custom properties in src/styles.scss
- [X] T121 [P] Optimize bundle size by lazy loading future routes in src/app/app.routes.ts
- [X] T122 [P] Add performance marks for connection time monitoring in src/app/services/livekit-connection.service.ts
- [X] T123 [P] Add performance marks for transcription latency tracking in src/app/services/transcription.service.ts
- [X] T124 [P] Update README.md with quickstart instructions from quickstart.md
- [ ] T125 [P] Add JSDoc comments to all public service methods in src/app/services/
- [X] T126 Verify performance budget compliance in angular.json build output
- [X] T127 Run full test suite and verify 80%+ code coverage
- [ ] T128 Validate quickstart.md setup instructions by following them
- [ ] T129 Run E2E accessibility tests and verify WCAG 2.1 AA compliance
- [ ] T130 Final code review and refactoring across all components

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US1 (Phase 3) can start immediately after Foundational
  - US3 (Phase 4) depends on US1 (needs connect before disconnect)
  - US2 (Phase 5) depends on US1 (needs connection for transcription)
  - US4 (Phase 6) can start in parallel with US2 (independent responsive work)
- **Reconnection (Phase 7)**: Depends on US1 and US3 (extends connection lifecycle)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 3 (P1)**: Depends on US1 - Must be able to connect before disconnecting
- **User Story 2 (P2)**: Depends on US1 - Needs active connection for transcription
- **User Story 4 (P2)**: Can start after Foundational - Independent responsive/accessibility work

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD)
- Models before services (foundation types needed)
- Services before components (business logic before UI)
- Presentational components before smart components (building blocks first)
- Integration tests after all unit tests pass
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 (Setup)**: All tasks marked [P] can run in parallel
- T003, T004, T005, T006, T007, T008

**Phase 2 (Foundational)**: All tasks marked [P] can run in parallel
- T010-T020 (all model interfaces including token models)

**Within User Stories**:
- All test tasks marked [P] can be written in parallel
- Components can be styled in parallel with different developers

**Cross-Story Parallelization**:
- After US1 is complete: US2, US3, US4 tests can be written in parallel
- US4 (mobile optimization) can proceed independently alongside US2 implementation

---

## Parallel Example: User Story 1

```bash
# Phase 1: Write all US1 tests in parallel (TDD - these should fail)
[Developer A] T021-T026: Token service unit tests
[Developer B] T027-T030: Connection service unit tests  
[Developer C] T031-T033: Component and integration tests

# Phase 2: Implement services in sequence (token first, then connection)
[Developer A] T034-T039: TokenService implementation
[Developer B] T040-T050: LiveKitConnectionService implementation (uses TokenService)
[Developer C] T051-T066: Components and UI integration

# Verify all tests now pass including end-to-end token acquisition + connection
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 3 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Connect)
4. Complete Phase 4: User Story 3 (Disconnect)
5. **STOP and VALIDATE**: Test connect→disconnect cycle independently
6. Deploy/demo basic voice chat (no transcription yet)

This gives you a working voice chat app in the shortest time!

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 + 3 → Test connect/disconnect cycle → **Deploy MVP**
3. Add User Story 2 → Test with transcription → **Deploy v1.1**
4. Add User Story 4 → Test on multiple devices → **Deploy v1.2**
5. Add Phase 7 → Test reconnection → **Deploy v1.3**
6. Each increment adds value without breaking previous features

### Parallel Team Strategy

With multiple developers:

1. **Week 1**: Team completes Setup + Foundational together
2. **Week 2**: Once Foundational is done:
   - Developer A: User Story 1 (Connect)
   - Developer B: User Story 4 (Mobile/A11y - can work independently)
3. **Week 3**: 
   - Developer A: User Story 3 (Disconnect - depends on US1)
   - Developer B: User Story 2 (Transcription - depends on US1)
4. **Week 4**: Both developers on Phase 7 & 8 (polish)

---

## Task Summary

- **Total Tasks**: ~155 (updated with Token Service integration)
- **Phase 1 (Setup)**: 9 tasks
- **Phase 2 (Foundational)**: 12 tasks (added TokenRequest/Response/Error models + ITokenService contract)
- **Phase 3 (US1 - Connect)**: 46 tasks (13 tests, 33 implementation - includes Token Service)
- **Phase 4 (US3 - Disconnect)**: 13 tasks (4 tests, 9 implementation)
- **Phase 5 (US2 - Transcription)**: 33 tasks (8 tests, 25 implementation)
- **Phase 6 (US4 - Mobile)**: 16 tasks (4 tests, 12 implementation)
- **Phase 7 (Reconnection)**: 10 tasks (2 tests, 8 implementation)
- **Phase 8 (Polish)**: 11 tasks

**Parallel Opportunities**: ~50 tasks marked [P] can be parallelized

**MVP Scope**: Phase 1 + Phase 2 + Phase 3 + Phase 4 = ~80 tasks for voice chat with secure token acquisition

**Test Coverage**: ~31 dedicated test tasks ensuring Constitutional Principle III compliance

**New in This Update**:
- Token Service for secure backend API integration (002-livekit-token-api)
- Token models (TokenRequest, TokenResponse, TokenApiError)
- Token acquisition flow in connection lifecycle
- Backend API dependency verification task
- Error handling for token acquisition failures

---

## Notes

- **[P] tasks** = Different files, no dependencies, can parallelize
- **[Story] labels** map tasks to specific user stories for traceability
- **TDD approach**: All test tasks must be written and fail before implementation tasks
- Each user story should be **independently completable and testable**
- **CRITICAL DEPENDENCY**: Backend token API (002-livekit-token-api) must be running for US1 to work
- **Commit** after each task or logical group
- **Stop at checkpoints** to validate story independently
- Follow **Constitutional Principles**: Angular-first, type-safe, test-first, performant, accessible
- Use **OnPush change detection** on all components
- Use **Angular Signals** for all state management
- Ensure **WCAG 2.1 AA compliance** throughout
- Maintain **performance budgets** per angular.json configuration
