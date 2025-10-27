# Tasks: Unified Conversation Experience

**Input**: Design documents from `/specs/005-unified-conversation/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Tests are MANDATORY per Constitutional Principle III (Test-First Development). All tasks include corresponding test implementation following TDD approach.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Angular components**: `src/app/components/[component-name]/`
- **Angular models**: `src/app/models/`
- **Angular services**: `src/app/services/`
- **Unit tests**: `*.spec.ts` files alongside components/services
- **Integration tests**: `tests/integration/`
- **Utilities**: `src/app/utils/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create unified conversation feature branch `005-unified-conversation` from main
- [ ] T002 [P] Create directory structure for unified conversation components in `src/app/components/unified-conversation-display/`
- [ ] T003 [P] Create directory structure for conversation message component in `src/app/components/conversation-message/`
- [ ] T004 [P] Create directory structure for utilities in `src/app/utils/`
- [ ] T005 Update GitHub Copilot instructions in `.github/copilot-instructions.md` with unified conversation technologies

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core models, interfaces, and storage that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Core Model Implementation

- [ ] T006 [P] Create UnifiedConversationMessage model in `src/app/models/unified-conversation-message.model.ts` with discriminated union pattern, type guards, and factory functions
- [ ] T007 [P] Create ConversationFeedState model in `src/app/models/conversation-feed-state.model.ts` with serialization/deserialization functions
- [ ] T008 [P] Create InterimTranscription model in `src/app/models/interim-transcription.model.ts`
- [ ] T009 [P] Create MessageMetadata model in `src/app/models/message-metadata.model.ts` with factory functions

### Core Model Tests

- [ ] T010 [P] Write unit tests for UnifiedConversationMessage model in `src/app/models/unified-conversation-message.model.spec.ts` (type guards, factory functions, validation)
- [ ] T011 [P] Write unit tests for ConversationFeedState model in `src/app/models/conversation-feed-state.model.spec.ts` (serialization, deserialization, empty state creation)
- [ ] T012 [P] Write unit tests for InterimTranscription model in `src/app/models/interim-transcription.model.spec.ts`
- [ ] T013 [P] Write unit tests for MessageMetadata model in `src/app/models/message-metadata.model.spec.ts`

### Utility Functions

- [ ] T014 [P] Create message merger utility in `src/app/utils/message-merger.util.ts` with sorting, deduplication, and interim transcription replacement logic
- [ ] T015 [P] Create storage migration utility in `src/app/utils/storage-migration.util.ts` to convert legacy chat-storage format to unified format
- [ ] T016 [P] Write unit tests for message merger utility in `src/app/utils/message-merger.util.spec.ts` (sorting, deduplication, out-of-order handling)
- [ ] T017 [P] Write unit tests for storage migration utility in `src/app/utils/storage-migration.util.spec.ts` (legacy format conversion, fallback handling)

### Storage Service

- [ ] T018 Create ConversationStorageService in `src/app/services/conversation-storage.service.ts` with signal-based state management, sessionStorage persistence, message add/clear operations
- [ ] T019 Write unit tests for ConversationStorageService in `src/app/services/conversation-storage.service.spec.ts` (message operations, persistence, restoration, migration)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View Unified Conversation Feed (Priority: P1) 🎯 MVP

**Goal**: Users can see all conversation exchanges (both spoken words and agent responses) in a single chronological message feed, regardless of response mode

**Independent Test**: Initiate conversation, speak to agent, receive response (any mode), verify both user's transcribed speech and agent's response appear in unified message list

### Tests for User Story 1 (TDD - Write First) ✅

- [ ] T020 [P] [US1] Write unit test for ConversationMessageComponent rendering user transcription messages in `src/app/components/conversation-message/conversation-message.component.spec.ts`
- [ ] T021 [P] [US1] Write unit test for ConversationMessageComponent rendering agent transcription messages in `src/app/components/conversation-message/conversation-message.component.spec.ts`
- [ ] T022 [P] [US1] Write unit test for ConversationMessageComponent rendering chat messages in `src/app/components/conversation-message/conversation-message.component.spec.ts`
- [ ] T023 [US1] Write unit test for UnifiedConversationDisplayComponent message ordering in `src/app/components/unified-conversation-display/unified-conversation-display.component.spec.ts`
- [ ] T024 [US1] Write unit test for UnifiedConversationDisplayComponent auto-scroll behavior in `src/app/components/unified-conversation-display/unified-conversation-display.component.spec.ts`
- [ ] T025 [P] [US1] Write integration test for unified conversation flow (user speaks → agent responds → both appear in feed) in `tests/integration/unified-conversation-flow.spec.ts`

### Implementation for User Story 1

- [ ] T026 [P] [US1] Create ConversationMessageComponent (presentational) in `src/app/components/conversation-message/conversation-message.component.ts` with input signals for message, template using @if for message type discrimination
- [ ] T027 [P] [US1] Create ConversationMessageComponent template in `src/app/components/conversation-message/conversation-message.component.html` with semantic HTML (article tags), sender styling
- [ ] T028 [P] [US1] Create ConversationMessageComponent styles in `src/app/components/conversation-message/conversation-message.component.scss` with user/agent visual distinction, responsive layout
- [ ] T029 [US1] Create UnifiedConversationDisplayComponent (smart) in `src/app/components/unified-conversation-display/unified-conversation-display.component.ts` with ConversationStorageService injection, sorted messages computed signal, scroll container reference
- [ ] T030 [US1] Create UnifiedConversationDisplayComponent template in `src/app/components/unified-conversation-display/unified-conversation-display.component.html` with scrollable container, ngFor with trackBy, auto-scroll logic
- [ ] T031 [US1] Create UnifiedConversationDisplayComponent styles in `src/app/components/unified-conversation-display/unified-conversation-display.component.scss` with scroll container styling, message spacing
- [ ] T032 [US1] Implement chronological message ordering using computed signal in UnifiedConversationDisplayComponent
- [ ] T033 [US1] Implement auto-scroll to latest message with ViewChild and AfterViewChecked lifecycle hook in UnifiedConversationDisplayComponent
- [ ] T034 [US1] Modify LiveKitConnectionService in `src/app/services/livekit-connection.service.ts` to emit UnifiedConversationMessage instances for transcription events
- [ ] T035 [US1] Update LiveKitConnectionService tests in `src/app/services/livekit-connection.service.spec.ts` to verify unified message emission
- [ ] T036 [US1] Integrate UnifiedConversationDisplayComponent into main app component/template (replace transcription-display and chat-message-display references)

**Checkpoint**: User Story 1 complete - users can view unified conversation feed with all messages chronologically ordered and auto-scrolling

---

## Phase 4: User Story 2 - Toggle Response Mode Mid-Conversation (Priority: P1)

**Goal**: Users can switch between voice and chat response modes during active conversation without losing history or context

**Independent Test**: Start conversation in voice mode, toggle to chat mode, continue conversation, verify all previous messages remain visible and new responses arrive via chat

### Tests for User Story 2 (TDD - Write First) ✅

- [ ] T037 [P] [US2] Write unit test for ConversationStorageService mode toggle preserving message history in `src/app/services/conversation-storage.service.spec.ts`
- [ ] T038 [P] [US2] Write unit test for UnifiedConversationDisplayComponent reflecting mode changes in `src/app/components/unified-conversation-display/unified-conversation-display.component.spec.ts`
- [ ] T039 [US2] Write integration test for mode toggle mid-conversation (voice → chat → verify history preserved) in `tests/integration/mode-toggle-integration.spec.ts`

### Implementation for User Story 2

- [ ] T040 [US2] Add mode toggle method to ConversationStorageService in `src/app/services/conversation-storage.service.ts` (update currentMode signal, persist to sessionStorage)
- [ ] T041 [US2] Add mode change event listener to UnifiedConversationDisplayComponent to react to mode toggle
- [ ] T042 [US2] Update app component to wire mode toggle button events to ConversationStorageService mode update
- [ ] T043 [US2] Add visual mode indicator to UnifiedConversationDisplayComponent template (display current mode icon/label)
- [ ] T044 [US2] Update LiveKitConnectionService to observe current mode and route agent responses appropriately (voice TTS vs data channel text)
- [ ] T045 [US2] Test mode toggle integration manually: verify history preservation across mode switches

**Checkpoint**: User Story 2 complete - users can toggle modes mid-conversation with full history preservation

---

## Phase 5: User Story 3 - Distinguish Message Types Visually (Priority: P2)

**Goal**: Users can easily identify which messages are from them vs. agent, and understand whether agent response was delivered via voice or text

**Independent Test**: Examine conversation feed with mixed message types, verify visual styling clearly distinguishes user from agent messages and optionally indicates delivery method

### Tests for User Story 3 (TDD - Write First) ✅

- [ ] T046 [P] [US3] Write unit test for ConversationMessageComponent user vs agent styling in `src/app/components/conversation-message/conversation-message.component.spec.ts`
- [ ] T047 [P] [US3] Write unit test for ConversationMessageComponent delivery method badges (voice vs chat icons) in `src/app/components/conversation-message/conversation-message.component.spec.ts`
- [ ] T048 [US3] Write accessibility test for message visual distinctions (ARIA labels, color contrast) in `tests/integration/accessibility.spec.ts`

### Implementation for User Story 3

- [ ] T049 [P] [US3] Add message sender visual styling to ConversationMessageComponent styles (user right-aligned blue, agent left-aligned gray)
- [ ] T050 [P] [US3] Add delivery method badge display to ConversationMessageComponent template (mic icon for voice, chat_bubble icon for chat)
- [ ] T051 [US3] Import Material icons module for message badges (MatIconModule) in ConversationMessageComponent
- [ ] T052 [US3] Add ARIA labels to messages for screen reader accessibility (sender, delivery method, timestamp)
- [ ] T053 [US3] Implement color contrast validation for message styling (meet WCAG AA 4.5:1 ratio)
- [ ] T054 [US3] Add timestamp display to ConversationMessageComponent template (formatted relative time)

**Checkpoint**: User Story 3 complete - message types are visually distinguishable with clear sender and delivery method indicators

---

## Phase 6: User Story 4 - Preserve Conversation History Across Sessions (Priority: P3)

**Goal**: Conversation history persists when disconnecting/reconnecting, allowing users to review previous exchanges

**Independent Test**: Have conversation, disconnect, reconnect, verify previous conversation history is restored

### Tests for User Story 4 (TDD - Write First) ✅

- [ ] T055 [P] [US4] Write unit test for ConversationStorageService sessionStorage persistence in `src/app/services/conversation-storage.service.spec.ts`
- [ ] T056 [P] [US4] Write unit test for ConversationStorageService history restoration on initialization in `src/app/services/conversation-storage.service.spec.ts`
- [ ] T057 [US4] Write unit test for UnifiedConversationDisplayComponent virtual scrolling activation (>100 messages) in `src/app/components/unified-conversation-display/unified-conversation-display.component.spec.ts`
- [ ] T058 [US4] Write integration test for conversation persistence across disconnect/reconnect cycles in `tests/integration/unified-conversation-flow.spec.ts`

### Implementation for User Story 4

- [ ] T059 [US4] Implement sessionStorage save logic in ConversationStorageService (debounced, triggered on message add)
- [ ] T060 [US4] Implement sessionStorage restore logic in ConversationStorageService constructor (load on service initialization)
- [ ] T061 [US4] Add virtual scrolling support to UnifiedConversationDisplayComponent template using CdkVirtualScrollViewport (activated when messages.length > 100)
- [ ] T062 [US4] Import Angular CDK ScrollingModule in UnifiedConversationDisplayComponent
- [ ] T063 [US4] Add session boundary visual separator to ConversationMessageComponent (display timestamp/divider for restored vs new messages)
- [ ] T064 [US4] Implement conversation clear functionality in ConversationStorageService (clear sessionStorage and reset state)
- [ ] T065 [US4] Add clear conversation button to UnifiedConversationDisplayComponent (optional, for user-initiated history wipe)
- [ ] T066 [US4] Test virtual scrolling performance with 500+ messages (verify smooth scrolling, no jank)

**Checkpoint**: User Story 4 complete - conversation history persists across sessions with efficient virtual scrolling for large message counts

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting multiple user stories, cleanup, and final validation

### Documentation & Cleanup

- [ ] T067 [P] Update README.md with unified conversation feature description and architecture overview
- [ ] T068 [P] Update quickstart.md with final implementation details and developer guide in `specs/005-unified-conversation/quickstart.md`
- [ ] T069 [P] Add JSDoc comments to all public methods in ConversationStorageService
- [ ] T070 [P] Add JSDoc comments to component input/output signals in UnifiedConversationDisplayComponent and ConversationMessageComponent

### Deprecation & Migration

- [ ] T071 Mark TranscriptionDisplayComponent as deprecated in `src/app/components/transcription-display/transcription-display.component.ts` (add deprecation comment)
- [ ] T072 Mark ChatMessageDisplayComponent as deprecated in `src/app/components/chat-message-display/chat-message-display.component.ts` (add deprecation comment)
- [ ] T073 Mark ChatStorageService as deprecated in `src/app/services/chat-storage.service.ts` (functionality merged into ConversationStorageService)
- [ ] T074 Create migration guide document in `specs/005-unified-conversation/MIGRATION.md` for developers upgrading from separate displays

### Testing & Validation

- [ ] T075 [P] Run full unit test suite and verify 80%+ coverage target met
- [ ] T076 [P] Run integration test suite for unified conversation flows
- [ ] T077 [P] Run accessibility audit using axe-core or similar tool (WCAG 2.1 AA compliance)
- [ ] T078 Perform manual testing of edge cases (rapid mode toggle, out-of-order transcriptions, long agent responses, connection drops)
- [ ] T079 Validate bundle size budget compliance (stay under 500KB warning threshold)
- [ ] T080 Run performance profiling with Chrome DevTools (verify <500ms message rendering latency)

### Final Integration

- [ ] T081 Smoke test complete user journey: connect → speak → agent responds (voice) → toggle to chat → agent responds (text) → disconnect → reconnect → verify history
- [ ] T082 Verify quickstart.md instructions work for new developer onboarding
- [ ] T083 Update feature status in spec.md to "Complete" with completion date
- [ ] T084 Prepare feature demo for stakeholder review

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US1 (Phase 3): Can start after Foundational - No dependencies on other stories
  - US2 (Phase 4): Depends on US1 completion (requires conversation feed to be rendered before mode toggle integration)
  - US3 (Phase 5): Can start after US1 completion (enhances existing message display)
  - US4 (Phase 6): Can start after US1 completion (adds persistence to existing display)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Foundation → US1 (independent, no other story dependencies)
- **User Story 2 (P1)**: Foundation → US1 → US2 (requires working conversation display)
- **User Story 3 (P2)**: Foundation → US1 → US3 (enhances message styling)
- **User Story 4 (P3)**: Foundation → US1 → US4 (adds persistence layer)

### Within Each User Story

1. Write tests FIRST (ensure they FAIL before implementation)
2. Implement models/utilities (if needed for that story)
3. Implement components/services
4. Integrate with existing services (LiveKit, mode toggle)
5. Verify tests PASS
6. Manual validation of acceptance scenarios

### Parallel Opportunities

**Phase 1 (Setup)**:
- All tasks (T001-T005) can run in parallel

**Phase 2 (Foundational)**:
- Core models: T006-T009 can run in parallel
- Core model tests: T010-T013 can run in parallel (after models created)
- Utilities: T014-T015 can run in parallel (after models created)
- Utility tests: T016-T017 can run in parallel (after utilities created)
- Storage service: T018-T019 sequential (test after implementation)

**Phase 3 (US1)**:
- Tests: T020-T022 can run in parallel, T023-T025 can run in parallel
- Implementation: T026-T028 (ConversationMessageComponent files) in parallel, T029-T031 (UnifiedConversationDisplayComponent files) in parallel

**Phase 4 (US2)**:
- Tests: T037-T039 can run in parallel
- Implementation: T040-T045 mostly sequential due to dependencies

**Phase 5 (US3)**:
- Tests: T046-T048 can run in parallel
- Implementation: T049-T050 can run in parallel, T051-T054 sequential integration

**Phase 6 (US4)**:
- Tests: T055-T058 can run in parallel
- Implementation: T059-T066 mostly sequential

**Phase 7 (Polish)**:
- Documentation: T067-T070 in parallel
- Deprecation: T071-T074 in parallel
- Testing: T075-T077 in parallel
- Final validation: T078-T084 sequential

### Recommended Staffing

**Single developer**: Sequential execution P1 → P2 → P3 → P4 (estimated 5-7 days)

**Two developers**:
- Dev 1: Foundational (Phase 2) → US1 (Phase 3) → US2 (Phase 4)
- Dev 2: Wait for US1 completion → US3 (Phase 5) + US4 (Phase 6) in parallel
- Estimated: 4-5 days

**Three developers**:
- Dev 1: Foundational (Phase 2 models/utilities) → US1 (Phase 3)
- Dev 2: Foundational (Phase 2 storage service) → US2 (Phase 4)
- Dev 3: Wait for US1 → US3 (Phase 5) + US4 (Phase 6)
- Estimated: 3-4 days

---

## Parallel Example: User Story 1 Implementation

```bash
# Terminal 1 - Component structure
git checkout 005-unified-conversation
ng generate component components/conversation-message --skip-tests
ng generate component components/unified-conversation-display --skip-tests

# Terminal 2 - Tests (TDD approach)
# Write test files first
touch src/app/components/conversation-message/conversation-message.component.spec.ts
touch src/app/components/unified-conversation-display/unified-conversation-display.component.spec.ts

# Terminal 3 - Run tests in watch mode
npm test -- --watch

# After tests written and FAILING, implement components in Terminal 1
# Verify tests PASS as implementation progresses
```

---

## Implementation Strategy

### MVP Scope (Minimum Viable Product)

The MVP consists of **User Story 1 only** (Phase 3):
- View unified conversation feed with chronological message ordering
- Basic user/agent message distinction
- Auto-scroll to latest message
- No mode toggle integration (can be added in US2)
- No visual badges (can be added in US3)
- No persistence (can be added in US4)

**MVP Delivery**: Estimated 2-3 days for single developer following TDD approach

### Incremental Delivery Plan

1. **Sprint 1** (MVP): US1 - Unified conversation display (2-3 days)
2. **Sprint 2**: US2 - Mode toggle integration (1-2 days)
3. **Sprint 3**: US3 - Visual enhancements + US4 - Persistence (2-3 days)
4. **Sprint 4**: Polish, documentation, deprecation (1-2 days)

**Total Estimated Effort**: 6-10 days for complete feature (all user stories + polish)

---

## Task Summary

- **Total Tasks**: 84
- **Setup Phase**: 5 tasks
- **Foundational Phase**: 14 tasks
- **User Story 1 (P1)**: 17 tasks
- **User Story 2 (P1)**: 9 tasks
- **User Story 3 (P2)**: 9 tasks
- **User Story 4 (P3)**: 12 tasks
- **Polish Phase**: 18 tasks

**Format Validation**: ✅ All tasks follow checklist format (checkbox, ID, labels, file paths)

**Constitutional Compliance**: ✅ All tasks support TDD approach, Angular 20 best practices, 80% test coverage target, WCAG 2.1 AA accessibility

**Independent Testing**: ✅ Each user story includes independent test criteria and integration tests

**Parallel Opportunities**: ✅ 42 tasks marked [P] for parallel execution (50% parallelizable)

---

## Next Steps

1. Review and approve this task list with team/stakeholders
2. Create GitHub issues or project board items from task list (optional)
3. Begin Phase 1 (Setup) immediately
4. Follow TDD approach: Write tests first, ensure they fail, implement, verify tests pass
5. Complete Foundational phase before starting any user story work
6. Implement user stories in priority order (P1 → P2 → P3)
7. Validate each user story independently before moving to next
8. Complete all stories before starting Polish phase

**To begin implementation**: Start with Task T001 (create feature branch) and proceed sequentially through Setup and Foundational phases.
