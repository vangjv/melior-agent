# Tasks: Text Chat Input

**Input**: Design documents from `/specs/007-text-chat-input/`
**Prerequisites**: plan.md, spec.md, data-model.md, quickstart.md, contracts/

**Tests**: Tests are included per user story requirements. TDD approach recommended - write failing tests before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Angular project**: `src/app/`, `src/app/components/`, `src/app/services/`, `src/app/models/`
- **Tests**: Component tests `*.spec.ts` alongside components, integration tests in `tests/integration/`
- **Styling**: `*.scss` files alongside components for encapsulated styling
- **Agent**: `agent/agent.md` for LiveKit agent modifications

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and model foundation

- [X] T001 [P] Create text input state model interfaces in src/app/models/text-input-state.model.ts
- [X] T002 [P] Create text message protocol models in src/app/models/text-input-protocol.model.ts
- [X] T003 [P] Create text message error models in src/app/models/text-message-error.model.ts
- [X] T004 [P] Create keyboard event utility models in src/app/models/keyboard-event.model.ts
- [X] T005 Extend unified conversation message model in src/app/models/unified-conversation-message.model.ts with UserTextMessage interface
- [X] T006 Add model exports to src/app/models/index.ts barrel file

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core services that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Add sendTextMessage() method to LiveKitConnectionService in src/app/services/livekit-connection.service.ts
- [X] T008 Add sendTextMessage() method to ConversationStorageService in src/app/services/conversation-storage.service.ts
- [X] T009 Update LiveKit agent data channel handler in agent/agent.md to receive text_message protocol

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Send Text Message (Priority: P1) 🎯 MVP

**Goal**: Enable users to type and send messages directly to the agent without using voice input

**Independent Test**: Type a message in the text input field, click send, verify message appears in conversation history and agent responds

### Tests for User Story 1

- [ ] T010 [P] [US1] Create TextInputComponent unit tests in src/app/components/text-input/text-input.spec.ts
- [ ] T011 [P] [US1] Create integration test for text message flow in tests/integration/text-chat-input.spec.ts

### Implementation for User Story 1

- [X] T012 [US1] Generate TextInputComponent with Angular CLI: ng generate component components/text-input --standalone
- [X] T013 [US1] Implement TextInputComponent TypeScript logic in src/app/components/text-input/text-input.ts
- [X] T014 [US1] Create TextInputComponent template in src/app/components/text-input/text-input.html
- [X] T015 [US1] Add TextInputComponent styles in src/app/components/text-input/text-input.scss
- [X] T016 [US1] Integrate TextInputComponent into UnifiedConversationDisplayComponent template
- [X] T017 [US1] Add handleTextMessage() method to UnifiedConversationDisplayComponent
- [ ] T018 [US1] Test text message appears in conversation after sending
- [ ] T019 [US1] Verify agent receives and processes text message from data channel

**Checkpoint**: Users can now type and send text messages to the agent

---

## Phase 4: User Story 2 - Text Input Always Available (Priority: P1)

**Goal**: Ensure text input is visible and accessible in all application states (voice mode, chat mode, connected, disconnected)

**Independent Test**: Verify text input visibility and state across voice/chat modes and connected/disconnected states

### Tests for User Story 2

- [ ] T020 [P] [US2] Add tests for text input visibility in all connection states in src/app/components/text-input/text-input.component.spec.ts
- [ ] T021 [P] [US2] Add tests for text input state transitions when switching modes in tests/integration/text-chat-input.spec.ts

### Implementation for User Story 2

- [ ] T022 [US2] Add isDisabled input signal to TextInputComponent reflecting connection state in src/app/components/text-input/text-input.component.ts
- [ ] T023 [US2] Wire connection state to text input disabled property in src/app/components/conversation/conversation.component.ts
- [ ] T024 [US2] Add visual indicator (placeholder text) when disconnected in src/app/components/text-input/text-input.component.html
- [ ] T025 [US2] Test text input persists when switching between voice and chat modes
- [ ] T026 [US2] Verify typed text is preserved during mode transitions

**Checkpoint**: Text input remains available and visible across all application states

---

## Phase 5: User Story 3 - Bypass Speech-to-Text for Typed Messages (Priority: P1)

**Goal**: Text messages are sent immediately without STT processing delay or transcription errors

**Independent Test**: Send text message and verify it appears instantly without STT processing, with exact content match

### Tests for User Story 3

- [ ] T027 [P] [US3] Add test verifying text message bypasses STT pipeline in tests/integration/text-chat-input.spec.ts
- [ ] T028 [P] [US3] Add test confirming message content accuracy (no transcription errors) in tests/integration/text-chat-input.spec.ts

### Implementation for User Story 3

- [ ] T029 [US3] Implement text message protocol validation in src/app/models/text-input-protocol.model.ts
- [ ] T030 [US3] Add message source tracking ('text' vs 'voice') in ConversationService in src/app/services/conversation.service.ts
- [ ] T031 [US3] Update agent to inject text messages directly into conversation bypassing VAD/STT in agent/agent.md
- [ ] T032 [US3] Test text message latency is <100ms from send to conversation display
- [ ] T033 [US3] Verify agent response mode (voice/chat) is respected for text input

**Checkpoint**: Text messages bypass STT processing and are delivered accurately and instantly

---

## Phase 6: User Story 4 - Text Input Enhancements (Priority: P2)

**Goal**: Add multi-line support, keyboard shortcuts, and visual feedback for polished messaging experience

**Independent Test**: Use Enter to send, Shift+Enter for new lines, verify character counter, test auto-sizing textarea

### Tests for User Story 4

- [ ] T034 [P] [US4] Add tests for Enter key sending message in src/app/components/text-input/text-input.component.spec.ts
- [ ] T035 [P] [US4] Add tests for Shift+Enter inserting new line in src/app/components/text-input/text-input.component.spec.ts
- [ ] T036 [P] [US4] Add tests for send button disabled state with empty input in src/app/components/text-input/text-input.component.spec.ts
- [ ] T037 [P] [US4] Add tests for character counter visibility threshold in src/app/components/text-input/text-input.component.spec.ts

### Implementation for User Story 4

- [ ] T038 [US4] Implement handleKeydown() method for Enter/Shift+Enter in src/app/components/text-input/text-input.component.ts
- [ ] T039 [US4] Add canSend computed signal (non-empty text check) in src/app/components/text-input/text-input.component.ts
- [ ] T040 [US4] Add characterCount and showCharacterCount computed signals in src/app/components/text-input/text-input.component.ts
- [ ] T041 [US4] Add matTextareaAutosize directive with min/max rows to template in src/app/components/text-input/text-input.component.html
- [ ] T042 [US4] Add character counter hint to template in src/app/components/text-input/text-input.component.html
- [ ] T043 [US4] Add focus visual indicator styles in src/app/components/text-input/text-input.component.scss
- [ ] T044 [US4] Implement auto-focus after sending message in src/app/components/text-input/text-input.component.ts
- [ ] T045 [US4] Test multi-line message support with Shift+Enter
- [ ] T046 [US4] Verify textarea expands up to 5 rows before scrolling

**Checkpoint**: Text input has polished UX with keyboard shortcuts and visual feedback

---

## Phase 7: User Story 5 - Mobile Text Input Optimization (Priority: P2)

**Goal**: Optimize text input for mobile devices with proper keyboard handling and responsive layout

**Independent Test**: Test on mobile devices - verify keyboard doesn't cover input, conversation scrollable, layout adapts to orientation

### Tests for User Story 5

- [ ] T047 [P] [US5] Add responsive layout tests using Angular CDK BreakpointObserver in src/app/components/text-input/text-input.component.spec.ts
- [ ] T048 [P] [US5] Add mobile keyboard handling tests in tests/integration/text-chat-input.spec.ts (may use pending() for device-specific tests)

### Implementation for User Story 5

- [ ] T049 [US5] Add mobile-specific styles using CSS dvh units in src/app/components/text-input/text-input.component.scss
- [ ] T050 [US5] Implement position: sticky with bottom: 0 for text input container in src/app/components/text-input/text-input.component.scss
- [ ] T051 [US5] Add @media queries for mobile breakpoints in src/app/components/text-input/text-input.component.scss
- [ ] T052 [US5] Add viewport meta tag configuration (if not already present) in src/index.html
- [ ] T053 [US5] Test text input scrolls into view when mobile keyboard opens
- [ ] T054 [US5] Verify conversation history remains scrollable above text input on mobile
- [ ] T055 [US5] Test orientation change preserves typed content

**Checkpoint**: Mobile users have optimized text input experience with proper keyboard handling

---

## Phase 8: User Story 6 - Send Indicator and Error Handling (Priority: P3)

**Goal**: Provide visual feedback during sending and clear error messages for failed sends

**Independent Test**: Monitor send button state changes, simulate network failures, verify error messages and retry capability

### Tests for User Story 6

- [ ] T056 [P] [US6] Add tests for send button state transitions in src/app/components/text-input/text-input.component.spec.ts
- [ ] T057 [P] [US6] Add tests for error handling and retry logic in tests/integration/text-chat-input.spec.ts

### Implementation for User Story 6

- [ ] T058 [US6] Add isSending signal to TextInputComponent in src/app/components/text-input/text-input.component.ts
- [ ] T059 [US6] Add error signal for failed sends in src/app/components/text-input/text-input.component.ts
- [ ] T060 [US6] Update sendMessage() to handle async send with try/catch in src/app/components/text-input/text-input.component.ts
- [ ] T061 [US6] Add loading spinner to send button during transmission in src/app/components/text-input/text-input.component.html
- [ ] T062 [US6] Add error message display with retry button in src/app/components/text-input/text-input.component.html
- [ ] T063 [US6] Add error state styles (red border, error text) in src/app/components/text-input/text-input.component.scss
- [ ] T064 [US6] Implement error recovery logic (preserve message text on failure) in src/app/components/text-input/text-input.component.ts
- [ ] T065 [US6] Add MatSnackBar for transient error notifications (optional) in src/app/components/text-input/text-input.component.ts
- [ ] T066 [US6] Test send button shows loading state during transmission
- [ ] T067 [US6] Test error message displays on network failure
- [ ] T068 [US6] Verify retry button re-attempts send with preserved message

**Checkpoint**: Users receive clear feedback on message delivery status with error recovery

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting multiple user stories and final validation

- [ ] T069 [P] Add ARIA labels and accessibility attributes to text input in src/app/components/text-input/text-input.component.html
- [ ] T070 [P] Add focus management for screen readers in src/app/components/text-input/text-input.component.ts
- [ ] T071 [P] Test high contrast mode compatibility in src/app/components/text-input/text-input.component.scss
- [ ] T072 [P] Add input sanitization for XSS prevention in src/app/models/text-input-protocol.model.ts
- [ ] T073 [P] Update .github/copilot-instructions.md with text chat input technologies (already done)
- [ ] T074 Run all quickstart.md test scenarios for validation
- [ ] T075 Performance optimization: Verify OnPush change detection working correctly
- [ ] T076 Performance testing: Ensure <100ms text input response time
- [ ] T077 Cross-browser testing: Chrome, Firefox, Safari, Edge
- [ ] T078 Mobile device testing: iOS Safari, Chrome Android
- [ ] T079 Code review and cleanup: Remove console.log statements, add JSDoc comments
- [ ] T080 Update feature documentation in docs/ with screenshots and usage guide

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup (Phase 1) completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational (Phase 2) completion
  - P1 stories (US1, US2, US3) should be completed first (Phase 3-5)
  - P2 stories (US4, US5) can follow P1 stories (Phase 6-7)
  - P3 stories (US6) completed last (Phase 8)
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories (core MVP)
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - May integrate with US1 for connection state
- **User Story 3 (P1)**: Depends on US1 completion - Extends core sending with protocol validation
- **User Story 4 (P2)**: Depends on US1 completion - Enhances core text input functionality
- **User Story 5 (P2)**: Depends on US1 completion - Mobile optimization builds on core component
- **User Story 6 (P3)**: Depends on US1 completion - Adds error handling to core sending

### Within Each User Story

- Tests SHOULD be written and FAIL before implementation (TDD approach)
- Models before services (data structures defined first)
- Services before components (business logic before UI)
- Component TypeScript before template/styles (logic before presentation)
- Integration tests after implementation (verify end-to-end flow)

### Parallel Opportunities

- **Phase 1 (Setup)**: ALL tasks (T001-T006) can run in parallel (different model files)
- **Phase 2 (Foundational)**: T007 and T008 can run in parallel; T009 depends on both
- **Within User Story 1**: T010 and T011 (tests) can run in parallel before implementation
- **Within User Story 2**: T020 and T021 (tests) can run in parallel
- **Within User Story 3**: T027 and T028 (tests) can run in parallel
- **Within User Story 4**: T034-T037 (tests) can run in parallel
- **Within User Story 5**: T047 and T048 (tests) can run in parallel
- **Within User Story 6**: T056 and T057 (tests) can run in parallel
- **Phase 9 (Polish)**: T069-T073 can run in parallel (documentation and accessibility)

**Note**: Once Foundational phase completes, multiple user stories can be worked on in parallel by different team members. However, for solo development, recommended order is US1 → US2 → US3 (MVP), then US4 → US5, finally US6.

---

## Parallel Example: User Story 1 (MVP)

```bash
# After Phase 2 completes, start User Story 1 in parallel:

# Terminal 1 - Component tests
npm test -- text-input.component.spec.ts --watch

# Terminal 2 - Integration tests  
npm test -- tests/integration/text-chat-input.spec.ts --watch

# Terminal 3 - Implementation
ng generate component components/text-input --standalone
# Then implement T013-T019 sequentially

# Tests should FAIL initially, then pass as implementation progresses
```

---

## MVP Scope

**Minimum Viable Product**: Complete Phase 1, Phase 2, and User Story 1-3 (P1 stories)

This delivers:
- ✅ Text input component at bottom of conversation
- ✅ Send text messages to agent
- ✅ Text input available in all modes
- ✅ Messages bypass STT processing
- ✅ Basic send button and clear input after send

**Total MVP Tasks**: T001-T033 (33 tasks)

**Estimated MVP Duration**: 5-7 hours for experienced Angular developer

**Post-MVP Enhancements**: 
- P2 stories (US4-US5): Enhanced UX and mobile optimization (nice-to-have)
- P3 stories (US6): Error handling and delivery confirmation (future improvement)

---

## Task Summary

**Total Tasks**: 80
- **Phase 1 (Setup)**: 6 tasks
- **Phase 2 (Foundational)**: 3 tasks
- **Phase 3 (US1 - P1)**: 10 tasks
- **Phase 4 (US2 - P1)**: 7 tasks
- **Phase 5 (US3 - P1)**: 7 tasks
- **Phase 6 (US4 - P2)**: 13 tasks
- **Phase 7 (US5 - P2)**: 9 tasks
- **Phase 8 (US6 - P3)**: 13 tasks
- **Phase 9 (Polish)**: 12 tasks

**MVP Tasks** (P1 only): 33 tasks (Phases 1-5)
**Full Feature**: 80 tasks (All phases)

**Independent Test Criteria per Story**:
- US1: Type message → Click send → Appears in conversation
- US2: Check visibility in all states (voice/chat, connected/disconnected)
- US3: Send text → Verify instant delivery without STT processing
- US4: Test Enter to send, Shift+Enter for newline, character counter
- US5: Test on mobile device - keyboard handling, responsive layout
- US6: Test sending states, error messages, retry functionality

---

## Validation Checklist

Before considering the feature complete, verify:

- ✅ All acceptance scenarios from spec.md pass
- ✅ Text input visible and functional in all application states
- ✅ Messages appear in conversation immediately after sending
- ✅ Agent receives and responds to text messages correctly
- ✅ Enter key sends, Shift+Enter adds new line
- ✅ Send button disabled when input empty or disconnected
- ✅ Character counter appears at 90% of limit (4500+ characters)
- ✅ Textarea expands up to 5 rows before scrolling
- ✅ Mobile keyboard doesn't obscure text input
- ✅ Text input clears after successful send
- ✅ Error messages display on send failure
- ✅ Unit test coverage ≥80% for new components
- ✅ Integration tests pass for complete text message flow
- ✅ Accessibility audit passes (ARIA labels, keyboard navigation)
- ✅ Performance benchmarks met (<100ms response time)
- ✅ Cross-browser compatibility verified
- ✅ Mobile device testing complete (iOS + Android)
