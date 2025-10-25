# Tasks: Voice/Chat Response Mode Toggle

**Feature**: 003-voice-chat-mode  
**Input**: Design documents from `/specs/003-voice-chat-mode/`  
**Prerequisites**: ✅ plan.md, ✅ spec.md, ✅ research.md, ✅ data-model.md, ✅ contracts/service-contracts.md

**Tests**: Tests are MANDATORY per Constitutional Principle III (Test-First Development). All tasks include corresponding test implementation following TDD approach (write tests first, ensure they fail, then implement).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. Each user story is independently testable and delivers incremental value.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5, SETUP, FOUND)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Project Configuration)

**Purpose**: Initial project setup and dependency verification

- [ ] T001 [SETUP] Verify Angular 20.0.0 and TypeScript 5.9.2 are installed (check `package.json`)
- [ ] T002 [SETUP] Verify LiveKit Client SDK 2.x installed (check `package.json` for `livekit-client`)
- [ ] T003 [P] [SETUP] Verify Angular Material 20.0.0 installed (check `package.json` for `@angular/material`)
- [ ] T004 [P] [SETUP] Verify Angular CDK installed (check `package.json` for `@angular/cdk`)
- [ ] T005 [P] [SETUP] Verify RxJS 7.x installed (check `package.json`)
- [ ] T006 [SETUP] Review existing `src/app/services/livekit-connection.service.ts` to understand Room access pattern
- [ ] T007 [SETUP] Review existing `src/app/components/voice-chat/voice-chat.component.ts` to plan integration points

---

## Phase 2: Foundational (Shared Infrastructure)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T008 [FOUND] Create `src/app/models/response-mode.model.ts` with ResponseMode type, data channel message interfaces, type guards, and factory functions (see data-model.md sections 1-2)
- [ ] T009 [P] [FOUND] Create `src/app/models/chat-message.model.ts` with ChatMessageState interface, MessageSender type, and factory functions (see data-model.md section 3)
- [ ] T010 [P] [FOUND] Write unit tests for `response-mode.model.ts` type guards in `src/app/models/response-mode.model.spec.ts` (test isValidResponseMode, isResponseModeUpdatedMessage, isAgentChatMessage)
- [ ] T011 [P] [FOUND] Write unit tests for `chat-message.model.ts` factory functions in `src/app/models/chat-message.model.spec.ts` (test createUserMessage, createAgentMessage)
- [ ] T012 [FOUND] Extend `src/app/services/livekit-connection.service.ts` to expose Room instance via readonly signal or getter method (see contracts/service-contracts.md ILiveKitConnectionServiceExtension)
- [ ] T013 [FOUND] Write tests for Room access in `src/app/services/livekit-connection.service.spec.ts` (verify Room instance is exposed correctly when connected)

**Checkpoint**: ✅ Foundation ready - models defined, typed, tested. Room access available. User story implementation can now begin in parallel.

---

## Phase 3: User Story 1 - Toggle Response Mode (Priority: P1) 🎯 MVP

**Goal**: Enable users to switch between voice and chat modes seamlessly without disconnecting

**Independent Test**: Establish connection, click mode toggle button, verify agent's response mode changes from voice to text (or vice versa)

**Value Delivered**: Core functionality - users gain control over response format

### Tests for User Story 1 (MANDATORY - Write FIRST) ✅

- [ ] T014 [P] [US1] Create `src/app/services/response-mode.service.spec.ts` - test suite structure and service instantiation
- [ ] T015 [P] [US1] Write test: ResponseModeService initializes with default voice mode and confirmed state
- [ ] T016 [P] [US1] Write test: setMode() sends SetResponseModeMessage via data channel with correct JSON encoding
- [ ] T017 [P] [US1] Write test: setMode() sets isConfirmed to false while pending confirmation
- [ ] T018 [P] [US1] Write test: ResponseModeUpdatedMessage handler updates currentMode signal and sets isConfirmed to true
- [ ] T019 [P] [US1] Write test: toggleMode() switches from voice to chat and vice versa
- [ ] T020 [P] [US1] Write test: setMode() rejects promise and shows error message after 5-second timeout
- [ ] T021 [P] [US1] Write test: cleanup() removes data channel event listeners and resets state

### Implementation for User Story 1

- [ ] T022 [US1] Create `src/app/services/response-mode.service.ts` skeleton with Signal properties (currentMode, isConfirmed, errorMessage, isDataChannelAvailable, isPending computed)
- [ ] T023 [US1] Implement ResponseModeService.initialize(room: Room) - set up RoomEvent.DataReceived listener for incoming messages
- [ ] T024 [US1] Implement ResponseModeService.setMode(mode: ResponseMode) - create SetResponseModeMessage, encode with TextEncoder, publish via room.publishData with RELIABLE flag
- [ ] T025 [US1] Implement ResponseModeService timeout handling - use RxJS timeout(5000) operator, set error message on timeout, revert to confirmed mode
- [ ] T026 [US1] Implement ResponseModeService message decoder - TextDecoder for Uint8Array, JSON.parse, validate with type guards from response-mode.model.ts
- [ ] T027 [US1] Implement ResponseModeService handler for ResponseModeUpdatedMessage - update _currentMode signal, set _isConfirmed to true, clear any pending timeout
- [ ] T028 [US1] Implement ResponseModeService.toggleMode() - call setMode with opposite of currentMode()
- [ ] T029 [US1] Implement ResponseModeService.cleanup() - remove event listeners, reset signals to defaults
- [ ] T030 [US1] Implement ResponseModeService debouncing for setMode calls using RxJS debounceTime(300ms) to prevent rapid successive calls
- [ ] T031 [US1] Add error handling in ResponseModeService for JSON parse errors, invalid messages, data channel unavailability (graceful degradation, never crash)
- [ ] T032 [US1] Run all ResponseModeService tests and verify they pass with 80%+ coverage

### Component Tests for User Story 1 (Write FIRST) ✅

- [ ] T033 [P] [US1] Create `src/app/components/mode-toggle-button/mode-toggle-button.component.spec.ts` - test suite structure
- [ ] T034 [P] [US1] Write test: ModeToggleButtonComponent displays "Voice Mode" when currentMode input is 'voice'
- [ ] T035 [P] [US1] Write test: ModeToggleButtonComponent displays "Chat Mode" when currentMode input is 'chat'
- [ ] T036 [P] [US1] Write test: ModeToggleButtonComponent emits onToggle event when button clicked
- [ ] T037 [P] [US1] Write test: ModeToggleButtonComponent shows disabled state when isDisabled input is true
- [ ] T038 [P] [US1] Write test: ModeToggleButtonComponent shows loading spinner when isPending input is true
- [ ] T039 [P] [US1] Write test: ModeToggleButtonComponent has correct ARIA attributes (aria-label, aria-pressed)

### Component Implementation for User Story 1

- [ ] T040 [US1] Create `src/app/components/mode-toggle-button/mode-toggle-button.component.ts` - standalone component with OnPush change detection
- [ ] T041 [US1] Add ModeToggleButtonComponent inputs: currentMode (required), isPending, isDisabled (see contracts/service-contracts.md IModeToggleButtonComponent)
- [ ] T042 [US1] Add ModeToggleButtonComponent output: onToggle output<void>()
- [ ] T043 [US1] Create `src/app/components/mode-toggle-button/mode-toggle-button.component.html` - Angular Material button with icon, label, and loading spinner
- [ ] T044 [US1] Create `src/app/components/mode-toggle-button/mode-toggle-button.component.scss` - minimum 44x44px touch target, sufficient color contrast (4.5:1)
- [ ] T045 [US1] Add computed signal for buttonLabel in ModeToggleButtonComponent (returns "Voice Mode" or "Chat Mode")
- [ ] T046 [US1] Add computed signal for buttonIcon in ModeToggleButtonComponent (returns appropriate Material icon for current mode)
- [ ] T047 [US1] Implement button click handler in ModeToggleButtonComponent - emit onToggle event
- [ ] T048 [US1] Add ARIA attributes to button: aria-label with current mode, aria-pressed with mode state, aria-busy when pending
- [ ] T049 [US1] Add keyboard navigation support: Space and Enter keys trigger toggle
- [ ] T050 [US1] Run all ModeToggleButtonComponent tests and verify they pass

### Integration for User Story 1

- [ ] T051 [US1] Modify `src/app/components/voice-chat/voice-chat.component.ts` - inject ResponseModeService
- [ ] T052 [US1] Add ResponseModeService.initialize(room) call in VoiceChatComponent after LiveKit connection established (in connection success handler)
- [ ] T053 [US1] Add ResponseModeService.cleanup() call in VoiceChatComponent when disconnecting
- [ ] T054 [US1] Modify `src/app/components/voice-chat/voice-chat.component.html` - add <app-mode-toggle-button> component with signal bindings
- [ ] T055 [US1] Wire ModeToggleButtonComponent inputs to ResponseModeService signals: [currentMode]="responseModeService.currentMode()" [isPending]="responseModeService.isPending()"
- [ ] T056 [US1] Wire ModeToggleButtonComponent (onToggle) event to call responseModeService.toggleMode()
- [ ] T057 [US1] Modify `src/app/components/voice-chat/voice-chat.component.scss` - position mode toggle button prominently (top-right or bottom-right)
- [ ] T058 [US1] Update VoiceChatComponent imports to include ModeToggleButtonComponent in imports array
- [ ] T059 [US1] Write integration test in `tests/integration/response-mode-integration.spec.ts` - test full mode toggle flow with mocked LiveKit Room and data channel

**Checkpoint**: ✅ User Story 1 Complete - Users can toggle between voice and chat modes. Mode changes are sent to agent via data channel. Service handles timeout and errors gracefully.

---

## Phase 4: User Story 2 - View Mode Confirmation and Status (Priority: P1)

**Goal**: Provide clear visual feedback about current mode and mode change status

**Independent Test**: Toggle modes and verify visual indicators clearly show current mode and transition states

**Value Delivered**: User confidence through clear status communication

### Tests for User Story 2 (Write FIRST) ✅

- [ ] T060 [P] [US2] Write test: Mode toggle button shows "Switching..." label during pending state
- [ ] T061 [P] [US2] Write test: Mode toggle button returns to normal state showing new mode after confirmation
- [ ] T062 [P] [US2] Write test: Mode toggle button shows error message when timeout occurs
- [ ] T063 [P] [US2] Write test: Error message auto-clears after 5 seconds using RxJS timer
- [ ] T064 [P] [US2] Write test: Mode indicator uses distinct colors/icons for voice vs chat modes
- [ ] T065 [P] [US2] Write test: Screen reader announces mode changes using Angular CDK LiveAnnouncer

### Implementation for User Story 2

- [ ] T066 [US2] Add pendingLabel computed signal to ModeToggleButtonComponent (returns "Switching..." when isPending is true)
- [ ] T067 [US2] Update `mode-toggle-button.component.html` to show pendingLabel during pending state
- [ ] T068 [US2] Add distinct Material icons for voice mode (mic icon) and chat mode (chat_bubble icon)
- [ ] T069 [US2] Add color theming to `mode-toggle-button.component.scss` - different colors for voice (primary) vs chat (accent)
- [ ] T070 [US2] Inject Angular CDK LiveAnnouncer in ModeToggleButtonComponent
- [ ] T071 [US2] Add effect in ModeToggleButtonComponent to announce mode changes to screen readers when currentMode changes
- [ ] T072 [US2] Modify VoiceChatComponent to display ResponseModeService.errorMessage signal if present
- [ ] T073 [US2] Add error message display area in `voice-chat.component.html` with proper ARIA role="alert"
- [ ] T074 [US2] Style error message in `voice-chat.component.scss` with sufficient contrast and visibility
- [ ] T075 [US2] Implement auto-clear for error messages in ResponseModeService using RxJS timer(5000) to set errorMessage back to null
- [ ] T076 [US2] Update ResponseModeService tests to verify error message auto-clear behavior
- [ ] T077 [US2] Run all User Story 2 tests and verify they pass

**Checkpoint**: ✅ User Story 2 Complete - Clear visual feedback for mode status, pending states, and errors. Screen reader support for accessibility.

---

## Phase 5: User Story 3 - Display Chat Messages (Priority: P2)

**Goal**: Provide readable UI for text conversation with visual separation between user and agent messages

**Independent Test**: Switch to chat mode, have conversation, verify messages display correctly with styling and scrolling

**Value Delivered**: Usable text conversation interface

### Tests for User Story 3 (Write FIRST) ✅

- [ ] T078 [P] [US3] Create `src/app/services/chat-storage.service.spec.ts` - test suite structure
- [ ] T079 [P] [US3] Write test: ChatStorageService initializes with empty message history
- [ ] T080 [P] [US3] Write test: ChatStorageService.addMessage() adds message to history and updates signal
- [ ] T081 [P] [US3] Write test: ChatStorageService.clearHistory() removes all messages
- [ ] T082 [P] [US3] Write test: ChatStorageService tracks both user and agent messages with correct sender
- [ ] T083 [P] [US3] Write test: ChatStorageService messages have unique IDs using crypto.randomUUID()
- [ ] T084 [P] [US3] Create `src/app/components/chat-message-display/chat-message-display.component.spec.ts` - test suite structure
- [ ] T085 [P] [US3] Write test: ChatMessageDisplayComponent displays user messages with distinct styling
- [ ] T086 [P] [US3] Write test: ChatMessageDisplayComponent displays agent messages with distinct styling
- [ ] T087 [P] [US3] Write test: ChatMessageDisplayComponent shows timestamps for all messages
- [ ] T088 [P] [US3] Write test: ChatMessageDisplayComponent auto-scrolls to bottom when new message arrives
- [ ] T089 [P] [US3] Write test: ChatMessageDisplayComponent uses virtual scrolling (Angular CDK) when message count > 100

### Service Implementation for User Story 3

- [ ] T090 [US3] Create `src/app/services/chat-storage.service.ts` with signal for message history (chatMessages: Signal<ChatMessageState[]>)
- [ ] T091 [US3] Implement ChatStorageService.addMessage(content: string, sender: MessageSender) - create ChatMessageState, append to history
- [ ] T092 [US3] Implement ChatStorageService.clearHistory() - reset chatMessages signal to empty array
- [ ] T093 [US3] Implement ChatStorageService.getHistory() - return readonly signal of chat messages
- [ ] T094 [US3] Run ChatStorageService tests and verify they pass

### Component Implementation for User Story 3

- [ ] T095 [US3] Create `src/app/components/chat-message-display/chat-message-display.component.ts` - standalone component with OnPush change detection
- [ ] T096 [US3] Add ChatMessageDisplayComponent input: messages (required) of type ChatMessageState[]
- [ ] T097 [US3] Create `src/app/components/chat-message-display/chat-message-display.component.html` - message list with *ngFor and trackBy using message.id
- [ ] T098 [US3] Add Angular CDK ScrollingModule to ChatMessageDisplayComponent imports for virtual scrolling
- [ ] T099 [US3] Implement virtual scrolling with <cdk-virtual-scroll-viewport> for messages when count > 100 (itemSize: 60px)
- [ ] T100 [US3] Create `src/app/components/chat-message-display/chat-message-display.component.scss` - distinct styles for user vs agent messages (alignment, background color, border)
- [ ] T101 [US3] Add timestamp formatting pipe or function to display message.timestamp in readable format (HH:mm:ss or relative time)
- [ ] T102 [US3] Add @ViewChild for scroll container and implement auto-scroll to bottom in AfterViewChecked lifecycle hook
- [ ] T103 [US3] Implement smooth scroll behavior using scrollIntoView({ behavior: 'smooth', block: 'end' })
- [ ] T104 [US3] Add semantic HTML: use <article> for messages, <time> for timestamps, proper heading structure
- [ ] T105 [US3] Ensure sufficient color contrast (4.5:1 minimum) for all message text
- [ ] T106 [US3] Run ChatMessageDisplayComponent tests and verify they pass

### Integration for User Story 3

- [ ] T107 [US3] Inject ChatStorageService in ResponseModeService
- [ ] T108 [US3] Update ResponseModeService to call ChatStorageService.addMessage() when AgentChatMessage is received
- [ ] T109 [US3] Update ResponseModeService to create user messages from transcription when in chat mode (coordinate with TranscriptionService)
- [ ] T110 [US3] Modify `voice-chat.component.html` to add <app-chat-message-display> component
- [ ] T111 [US3] Wire ChatMessageDisplayComponent [messages] input to ChatStorageService.chatMessages signal
- [ ] T112 [US3] Add conditional display in VoiceChatComponent template: show chat display only when currentMode is 'chat'
- [ ] T113 [US3] Update `voice-chat.component.scss` to layout chat display area (full width, flex-grow, overflow handling)
- [ ] T114 [US3] Update VoiceChatComponent imports to include ChatMessageDisplayComponent
- [ ] T115 [US3] Write integration test in `tests/integration/response-mode-integration.spec.ts` - test receiving chat messages and verifying display
- [ ] T116 [US3] Test chat display with 100+ messages to verify virtual scrolling performance (maintain 60fps)

**Checkpoint**: ✅ User Story 3 Complete - Chat messages display correctly with user/agent distinction, timestamps, auto-scroll, and virtual scrolling for performance.

---

## Phase 6: User Story 4 - Maintain Mode Across Connection Lifecycle (Priority: P2)

**Goal**: Handle mode state consistently across disconnections and reconnections

**Independent Test**: Set mode preference, disconnect, reconnect, verify mode state handling

**Value Delivered**: Predictable behavior during connection issues

### Tests for User Story 4 (Write FIRST) ✅

- [ ] T117 [P] [US4] Write test: Mode preference is saved to localStorage when changed
- [ ] T118 [P] [US4] Write test: Mode preference is loaded from localStorage on service initialization
- [ ] T119 [P] [US4] Write test: Mode resets to voice (default) when disconnecting
- [ ] T120 [P] [US4] Write test: Mode automatically requests saved preference after reconnection
- [ ] T121 [P] [US4] Write test: ChatStorageService.clearHistory() is called when disconnecting
- [ ] T122 [P] [US4] Write test: Mode state is reset to confirmed when cleanup() is called

### Implementation for User Story 4

- [ ] T123 [US4] Add localStorage persistence to ResponseModeService - save mode preference on change using effect()
- [ ] T124 [US4] Add localStorage key constant: STORAGE_KEY_MODE_PREFERENCE = 'melior-agent-response-mode'
- [ ] T125 [US4] Implement loadPreferredMode() method in ResponseModeService - read from localStorage, validate with isValidResponseMode, return default if invalid
- [ ] T126 [US4] Call loadPreferredMode() in ResponseModeService constructor to initialize _currentMode signal
- [ ] T127 [US4] Update ResponseModeService.cleanup() to call ChatStorageService.clearHistory()
- [ ] T128 [US4] Add auto-request preferred mode in ResponseModeService.initialize() - call setMode with loaded preference after brief delay (500ms)
- [ ] T129 [US4] Update ResponseModeService.cleanup() to reset _currentMode to 'voice' and _isConfirmed to true
- [ ] T130 [US4] Update VoiceChatComponent to call ResponseModeService.cleanup() in disconnect handler and ngOnDestroy
- [ ] T131 [US4] Write integration test in `tests/integration/response-mode-integration.spec.ts` - test disconnect/reconnect cycle with mode persistence
- [ ] T132 [US4] Run all User Story 4 tests and verify they pass

**Checkpoint**: ✅ User Story 4 Complete - Mode preference persists across sessions, chat history clears on disconnect, mode state resets correctly.

---

## Phase 7: User Story 5 - Mobile-Optimized Mode Toggle (Priority: P3)

**Goal**: Ensure mode toggle is easily accessible and usable on mobile devices

**Independent Test**: Use toggle on various mobile devices and screen sizes to verify accessibility and usability

**Value Delivered**: Improved mobile UX

### Tests for User Story 5 (Write FIRST) ✅

- [ ] T133 [P] [US5] Write test: Mode toggle button has minimum 44x44px touch target size
- [ ] T134 [P] [US5] Write test: Mode toggle is positioned in easily reachable location on mobile (viewport width < 768px)
- [ ] T135 [P] [US5] Write test: Mode toggle remains accessible in landscape mode
- [ ] T136 [P] [US5] Write test: Mode toggle label scales with large text accessibility settings
- [ ] T137 [P] [US5] Write test: Chat display is responsive on small screens (minimum 320px width)

### Implementation for User Story 5

- [ ] T138 [US5] Add CSS media query in `mode-toggle-button.component.scss` for mobile screens (max-width: 767px)
- [ ] T139 [US5] Ensure button touch target is 44x44px minimum on all screen sizes using padding
- [ ] T140 [US5] Add responsive positioning in `voice-chat.component.scss` - bottom-right fixed position on mobile, top-right on desktop
- [ ] T141 [US5] Test button on iOS Safari and Chrome Android to verify touch responsiveness
- [ ] T142 [US5] Add CSS for landscape mode handling in `voice-chat.component.scss` (max-height media query)
- [ ] T143 [US5] Ensure mode toggle label uses rem units for font size to support browser text scaling
- [ ] T144 [US5] Add responsive layout for chat display in `chat-message-display.component.scss` - full width on mobile, max-width on desktop
- [ ] T145 [US5] Test chat display on 320px width device (iPhone SE) to verify layout doesn't break
- [ ] T146 [US5] Add CSS to prevent horizontal scrolling on narrow screens
- [ ] T147 [US5] Verify sufficient spacing between interactive elements (minimum 8px) on mobile
- [ ] T148 [US5] Run all User Story 5 tests and verify they pass
- [ ] T149 [US5] Manual testing on physical mobile devices (iOS and Android) to validate touch interaction

**Checkpoint**: ✅ User Story 5 Complete - Mode toggle is mobile-optimized with proper touch targets, responsive positioning, and accessibility.

---

## Final Phase: Polish & Cross-Cutting Concerns

**Purpose**: Final integration, comprehensive testing, documentation, and deployment preparation

- [ ] T150 [P] Run full test suite: `npm test` and verify 80%+ code coverage for all new code
- [ ] T151 [P] Run linter: `npm run lint` and fix any violations
- [ ] T152 [P] Run build: `ng build` and verify no errors, check bundle size within budget (warning: 500KB, error: 1MB)
- [ ] T153 Accessibility audit: Use axe DevTools or Lighthouse to verify WCAG 2.1 AA compliance
- [ ] T154 Manual testing: Complete all acceptance scenarios from spec.md for each user story
- [ ] T155 [P] Update README.md with new feature documentation (voice/chat mode toggle usage)
- [ ] T156 [P] Add JSDoc comments to all public methods in ResponseModeService and ChatStorageService
- [ ] T157 Integration test: Test mode toggle with real LiveKit connection (if test environment available) - mark as pending if infrastructure not available
- [ ] T158 Edge case testing: Test rapid toggle clicks, connection loss during mode change, malformed data channel messages
- [ ] T159 Performance testing: Test chat display with 500+ messages, verify 60fps maintained with virtual scrolling
- [ ] T160 Cross-browser testing: Verify functionality on Chrome, Firefox, Safari, Edge
- [ ] T161 Code review: Submit PR and address reviewer feedback
- [ ] T162 Merge to main branch after PR approval

---

## Dependency Graph & Parallel Execution

### Phase Dependencies
- **Phase 1 (Setup)**: No dependencies, can run all tasks in parallel
- **Phase 2 (Foundational)**: Depends on Phase 1 completion, tasks T008-T011 can run in parallel, T012-T013 can run in parallel
- **Phase 3 (US1)**: Depends on Phase 2 completion, test tasks T014-T021 can run in parallel, component test tasks T033-T039 can run in parallel
- **Phase 4 (US2)**: Depends on Phase 3 completion, test tasks T060-T065 can run in parallel
- **Phase 5 (US3)**: Depends on Phase 3 completion (can run in parallel with Phase 4), test tasks T078-T089 can run in parallel
- **Phase 6 (US4)**: Depends on Phase 3 and Phase 5 completion, test tasks T117-T122 can run in parallel
- **Phase 7 (US5)**: Depends on Phase 3 completion (can run in parallel with Phase 4-6), test tasks T133-T137 can run in parallel
- **Final Phase**: Depends on all previous phases completion, tasks T150-T152 and T155-T156 can run in parallel

### Maximum Parallelization Example
After Phase 2 completes:
- **Developer A**: Phase 3 (US1) - Core mode toggle functionality
- **Developer B**: Phase 4 (US2) - Visual feedback and status (depends on Phase 3, can start tests in parallel)
- **Developer C**: Phase 5 (US3) - Chat display (depends on Phase 3, can run in parallel with Phase 4)
- **Developer D**: Phase 7 (US5) - Mobile optimization (depends on Phase 3, can run in parallel with Phase 4-6)

Once Phase 3 completes, Developer B can implement Phase 4 while Developer C works on Phase 5 in parallel.

---

## MVP Scope Recommendation

**Minimum Viable Product**: Complete **Phase 3 (User Story 1)** only

**Why**: US1 delivers the core value proposition - ability to toggle between voice and chat modes. This is independently testable and provides immediate user value.

**MVP Includes**:
- ResponseModeService with data channel communication
- ModeToggleButtonComponent with basic functionality
- Integration into VoiceChatComponent
- Basic error handling and timeout

**MVP Excludes** (can be added incrementally):
- Advanced visual feedback (US2) - nice-to-have but not critical
- Chat message display (US3) - can be added in iteration 2
- Persistence across connections (US4) - enhancement for iteration 3
- Mobile optimizations (US5) - can be refined after core functionality works

**Post-MVP Iterations**:
- **Iteration 2**: Add US2 (status feedback) + US3 (chat display) for complete feature
- **Iteration 3**: Add US4 (persistence) for improved UX
- **Iteration 4**: Add US5 (mobile) for production polish

---

## Task Count Summary

- **Setup**: 7 tasks
- **Foundational**: 6 tasks
- **User Story 1 (P1)**: 46 tasks (MVP)
- **User Story 2 (P1)**: 18 tasks
- **User Story 3 (P2)**: 39 tasks
- **User Story 4 (P2)**: 16 tasks
- **User Story 5 (P3)**: 17 tasks
- **Final Phase**: 13 tasks

**Total**: 162 tasks

**Estimated Completion Time**:
- MVP (US1 only): ~20 hours (1 developer, 2.5 days)
- Full Feature (US1-US5): ~50-60 hours (1 developer, 7-8 days)
- With parallelization (3 developers): ~25-30 hours (3-4 days)

---

**Tasks Generated**: 2025-10-24  
**Branch**: `003-voice-chat-mode`  
**Status**: Ready for Implementation ✅
