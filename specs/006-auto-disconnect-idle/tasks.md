---
description: "Task list for auto-disconnect idle timeout feature implementation"
---

# Tasks: Auto-Disconnect on Idle Activity

**Input**: Design documents from `/specs/006-auto-disconnect-idle/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: This feature follows Test-Driven Development (TDD). Tests are written FIRST and must FAIL before implementation proceeds.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Angular project**: `src/app/`, `src/app/components/`, `src/app/services/`, `src/app/models/`
- **Tests**: Component/service tests `*.spec.ts` alongside source files, integration tests in `tests/integration/`
- **Styling**: `*.scss` files alongside components for encapsulated styling

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure for idle timeout feature

- [X] T001 Review existing services (ConversationStorageService, LiveKitConnectionService) to understand integration points
- [X] T002 [P] Create feature branch `006-auto-disconnect-idle` from main branch
- [X] T003 [P] Verify Angular 20.0.0, TypeScript 5.9.2, and RxJS 7.8 are properly configured in package.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core type definitions and utilities that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 [P] Create `IdleTimeoutConfig` interface in src/app/models/idle-timeout-config.ts
- [X] T005 [P] Create `IdleTimerState` interface in src/app/models/idle-timer-state.ts
- [X] T006 [P] Create `ActivityEvent` discriminated union types in src/app/models/activity-event.ts
- [X] T007 [P] Create `IdleTimeoutValidationError` interface in src/app/models/idle-timeout-validation-error.ts
- [X] T008 [P] Add storage utility functions for idle timeout config in src/app/utils/idle-timeout-storage.util.ts
- [X] T009 Create validation constants (MIN_DURATION, MAX_DURATION, etc.) in src/app/models/idle-timeout-config.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Automatic Disconnection After Idle Period (Priority: P1) 🎯 MVP

**Goal**: Implement core idle timeout functionality that automatically disconnects users after 2 minutes of inactivity (no transcriptions or chat messages).

**Independent Test**: Establish a voice chat connection, remain silent for 2 minutes, verify automatic disconnection occurs. Test passes if session disconnects within 5 seconds after timeout expires.

### Tests for User Story 1 (MANDATORY - TDD Approach) ✅

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T010 [P] [US1] Create IdleTimeoutService spec skeleton in src/app/services/idle-timeout.service.spec.ts
- [X] T011 [P] [US1] Write test: "should initialize with inactive timer state" in idle-timeout.service.spec.ts
- [X] T012 [P] [US1] Write test: "should start timer when connection established" in idle-timeout.service.spec.ts
- [X] T013 [P] [US1] Write test: "should countdown timer every second" in idle-timeout.service.spec.ts (use jasmine.clock())
- [X] T014 [P] [US1] Write test: "should reset timer when transcription received" in idle-timeout.service.spec.ts
- [X] T015 [P] [US1] Write test: "should reset timer when chat message received" in idle-timeout.service.spec.ts
- [X] T016 [P] [US1] Write test: "should call disconnect when timer reaches zero" in idle-timeout.service.spec.ts
- [X] T017 [P] [US1] Write test: "should stop timer when manually disconnected" in idle-timeout.service.spec.ts
- [X] T018 [P] [US1] Write integration test skeleton in tests/integration/idle-timeout-flow.spec.ts
- [X] T019 [US1] Write integration test: "should auto-disconnect after 2 minutes of inactivity" in tests/integration/idle-timeout-flow.spec.ts
- [X] T020 [US1] Write integration test: "should maintain connection when activity occurs within timeout" in tests/integration/idle-timeout-flow.spec.ts

**Verify all tests FAIL** ❌ before proceeding to implementation

### Implementation for User Story 1

- [X] T021 [US1] Create IdleTimeoutService class skeleton with Injectable decorator in src/app/services/idle-timeout.service.ts
- [X] T022 [US1] Implement private signals (_timerState, _config) and public readonly signals in idle-timeout.service.ts
- [X] T023 [US1] Inject ConversationStorageService and LiveKitConnectionService dependencies in idle-timeout.service.ts
- [X] T024 [US1] Implement startTimer() method with RxJS interval for 1-second countdown in idle-timeout.service.ts
- [X] T025 [US1] Implement stopTimer() method with subscription cleanup in idle-timeout.service.ts
- [X] T026 [US1] Implement resetTimer() method to restart countdown from configured duration in idle-timeout.service.ts
- [X] T027 [US1] Create effect to monitor ConversationStorageService.lastMessageAt signal in idle-timeout.service.ts
- [X] T028 [US1] Implement onTimeout() private method to call LiveKitConnectionService.disconnect() in idle-timeout.service.ts
- [X] T029 [US1] Implement ngOnDestroy or use takeUntilDestroyed() for cleanup in idle-timeout.service.ts
- [X] T030 [US1] Load default config (120 second timeout) from constants in idle-timeout.service.ts constructor
- [X] T031 [US1] Integrate IdleTimeoutService into VoiceChatComponent by injecting service in src/app/components/voice-chat/voice-chat.component.ts
- [X] T032 [US1] Call idleTimeoutService.startTimer() when voice chat connection established in voice-chat.component.ts
- [X] T033 [US1] Call idleTimeoutService.stopTimer() when user manually disconnects in voice-chat.component.ts
- [X] T034 [US1] Add error handling for disconnect failures in idle-timeout.service.ts

**Run Tests** ✅ - All User Story 1 tests should now PASS

**Checkpoint**: At this point, User Story 1 should be fully functional - automatic disconnection after 2 minutes of idle time works end-to-end

---

## Phase 4: User Story 2 - Visual Idle Timeout Warning (Priority: P2)

**Goal**: Display a visual warning 30 seconds before automatic disconnection occurs, allowing users to take action to maintain their connection.

**Independent Test**: Establish connection, wait until 30 seconds remain before timeout, verify warning appears with countdown. Test passes if warning displays at exactly 30 seconds and updates every second.

### Tests for User Story 2 (MANDATORY - TDD Approach) ✅

- [X] T035 [P] [US2] Create IdleWarningComponent spec skeleton in src/app/components/idle-warning/idle-warning.component.spec.ts
- [X] T036 [P] [US2] Write test: "should display when timeRemaining <= 30 seconds" in idle-warning.component.spec.ts
- [X] T037 [P] [US2] Write test: "should hide when timeRemaining > 30 seconds" in idle-warning.component.spec.ts
- [X] T038 [P] [US2] Write test: "should show formatted countdown timer (MM:SS)" in idle-warning.component.spec.ts
- [X] T039 [P] [US2] Write test: "should emit dismiss event when dismiss button clicked" in idle-warning.component.spec.ts
- [X] T040 [P] [US2] Write test: "should have role='alert' and aria-live='assertive'" in idle-warning.component.spec.ts
- [X] T041 [US2] Add test to IdleTimeoutService spec: "should set isWarning true when timeRemaining <= 30" in idle-timeout.service.spec.ts
- [X] T042 [US2] Add integration test: "should show warning at 30 seconds and hide after activity" in tests/integration/idle-timeout-flow.spec.ts

**Verify all tests FAIL** ❌ before proceeding to implementation

### Implementation for User Story 2

- [X] T043 [P] [US2] Create IdleWarningComponent as standalone component in src/app/components/idle-warning/idle-warning.component.ts
- [X] T044 [P] [US2] Add ChangeDetectionStrategy.OnPush to IdleWarningComponent in idle-warning.component.ts
- [X] T045 [P] [US2] Define timeRemaining as required input signal using input.required<number>() in idle-warning.component.ts
- [X] T046 [P] [US2] Define onDismiss as output using output<void>() in idle-warning.component.ts
- [X] T047 [P] [US2] Create computed signal for formatted time display (MM:SS) in idle-warning.component.ts
- [X] T048 [P] [US2] Create computed signal shouldShow based on timeRemaining <= 30 in idle-warning.component.ts
- [X] T049 [US2] Update isWarning state in IdleTimeoutService based on timeRemaining threshold in idle-timeout.service.ts
- [X] T050 [US2] Create warning banner HTML template with role="alert" aria-live="assertive" in src/app/components/idle-warning/idle-warning.component.html
- [X] T051 [US2] Add Material icon and dismiss button with aria-label in idle-warning.component.html
- [X] T052 [US2] Display formatted countdown in warning message in idle-warning.component.html
- [X] T053 [US2] Style warning banner with warning colors and positioning in src/app/components/idle-warning/idle-warning.component.scss
- [X] T054 [US2] Ensure WCAG 2.1 AA color contrast in idle-warning.component.scss
- [X] T055 [US2] Add IdleWarningComponent to VoiceChatComponent template in voice-chat.component.html
- [X] T056 [US2] Bind timeRemaining signal to IdleWarningComponent input in voice-chat.component.html
- [X] T057 [US2] Handle onDismiss event to trigger activity and reset timer in voice-chat.component.ts

**Run Tests** ✅ - All User Story 2 tests should now PASS

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - auto-disconnect works AND users get 30-second warning

---

## Phase 5: User Story 3 - Configurable Idle Timeout Duration (Priority: P3)

**Goal**: Allow users to configure the idle timeout duration (with validation: 30 seconds to 60 minutes) and persist their preference across browser sessions in sessionStorage.

**Independent Test**: Set custom timeout of 5 minutes, remain idle for that duration, verify disconnection occurs at correct time. Test passes if custom configuration persists after page refresh.

### Tests for User Story 3 (MANDATORY - TDD Approach) ✅

- [X] T058 [P] [US3] Write test: "should validate timeout duration is >= 30 seconds" in idle-timeout.service.spec.ts
- [X] T059 [P] [US3] Write test: "should validate timeout duration is <= 3600 seconds" in idle-timeout.service.spec.ts
- [X] T060 [P] [US3] Write test: "should validate warningThreshold < durationSeconds" in idle-timeout.service.spec.ts
- [X] T061 [P] [US3] Write test: "should return validation error for invalid config" in idle-timeout.service.spec.ts
- [X] T062 [P] [US3] Write test: "should save valid config to sessionStorage" in idle-timeout.service.spec.ts
- [X] T063 [P] [US3] Write test: "should load config from sessionStorage on initialization" in idle-timeout.service.spec.ts
- [X] T064 [P] [US3] Write test: "should use default config if sessionStorage is empty" in idle-timeout.service.spec.ts
- [X] T065 [P] [US3] Write test: "should apply custom timeout duration when configured" in idle-timeout.service.spec.ts
- [X] T066 [US3] Add integration test: "should persist custom timeout across page refresh" in tests/integration/idle-timeout-flow.spec.ts

**Verify all tests FAIL** ❌ before proceeding to implementation

### Implementation for User Story 3

- [X] T067 [US3] Implement validateConfig() method with business rule validation in idle-timeout.service.ts
- [X] T068 [US3] Implement saveConfig() method to persist to sessionStorage in idle-timeout.service.ts
- [X] T069 [US3] Implement loadConfig() method to retrieve from sessionStorage in idle-timeout.service.ts
- [X] T070 [US3] Update constructor to call loadConfig() on service initialization in idle-timeout.service.ts
- [X] T071 [US3] Expose updateConfig() public method that validates and persists in idle-timeout.service.ts
- [X] T072 [US3] Handle validation errors with typed error returns (IdleTimeoutValidationError) in idle-timeout.service.ts
- [X] T073 [US3] Update startTimer() to use configured durationSeconds from _config signal in idle-timeout.service.ts
- [X] T074 [US3] Update warning logic to use configured warningThresholdSeconds in idle-timeout.service.ts
- [X] T075 [P] [US3] Create simple configuration UI component (optional - can be settings panel) in src/app/components/idle-timeout-settings/idle-timeout-settings.component.ts
- [X] T076 [US3] Add number input for timeout duration with min/max validation in idle-timeout-settings template (if component created)
- [X] T077 [US3] Wire configuration UI to idleTimeoutService.updateConfig() method (if component created)
- [X] T078 [US3] Display validation errors to user in configuration UI (if component created)

**Run Tests** ✅ - All User Story 3 tests should now PASS

**Checkpoint**: All user stories should now be independently functional - auto-disconnect, visual warning, AND configurable timeout all work

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final quality checks

- [X] T079 [P] Add comprehensive JSDoc comments to IdleTimeoutService public methods in idle-timeout.service.ts
- [X] T080 [P] Add JSDoc comments to all model interfaces in src/app/models/
- [X] T081 [P] Update project README.md with idle timeout feature documentation
- [X] T082 [P] Create user guide section in docs/ explaining timeout behavior and configuration
- [X] T083 [P] Add development notes to specs/006-auto-disconnect-idle/quickstart.md based on implementation learnings
- [X] T084 Run full test suite and verify minimum 80% code coverage across all idle timeout files
- [X] T085 Run integration tests end-to-end with real LiveKit connection (mark as pending if infrastructure unavailable)
- [ ] T086 Perform accessibility audit on IdleWarningComponent with screen reader testing (MANUAL TEST - requires NVDA/JAWS)
- [X] T087 [P] Verify WCAG 2.1 AA compliance for warning colors and contrast ratios
- [ ] T088 Test idle timeout behavior across browsers (Chrome, Firefox, Safari, Edge) (MANUAL TEST - requires multiple browsers)
- [X] T089 [P] Review and refactor code for consistency with Angular 20 best practices
- [X] T090 [P] Optimize RxJS subscriptions and verify proper cleanup with no memory leaks
- [X] T091 Update .github/copilot-instructions.md with 006-auto-disconnect-idle feature context
- [ ] T092 Run linter and fix any ESLint violations in new idle timeout files
- [X] T093 Verify all type definitions match contracts/idle-timeout-types.ts specification
- [X] T094 Run quickstart.md validation - verify implementation matches documented approach
- [ ] T095 Create PR with comprehensive description referencing spec.md user stories

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed) after Phase 2
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
  - Delivers: Core auto-disconnect functionality
  - Independent test: Connect, idle for 2 minutes, verify disconnect
  
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Integrates WITH US1 but doesn't BLOCK independently
  - Delivers: Visual warning before disconnect
  - Independent test: Connect, wait for warning at 30 seconds, verify display
  - **Note**: Enhances US1 but could theoretically be tested with manual timer manipulation
  
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Integrates WITH US1 but doesn't BLOCK independently
  - Delivers: Configurable timeout duration
  - Independent test: Set 5-minute timeout, idle, verify disconnect at correct time
  - **Note**: Extends US1 but default 2-minute timeout works without this story

### Within Each User Story

1. **Tests FIRST** (TDD approach):
   - Write all tests for the story
   - Verify they FAIL
   - Only then proceed to implementation

2. **Implementation order**:
   - Service logic (core business rules)
   - Component presentation (UI)
   - Integration (wire together)
   - Polish (error handling, logging)

3. **Checkpoint**:
   - All tests PASS
   - Story independently functional
   - Manual testing confirms behavior

### Parallel Opportunities

- **Phase 1 (Setup)**: All 3 tasks can run in parallel
- **Phase 2 (Foundational)**: Tasks T004-T008 (model files) can run in parallel
- **User Story 1 Tests**: Tasks T010-T018 (spec files) can be written in parallel
- **User Story 2 Tests**: Tasks T035-T040 (component tests) can be written in parallel
- **User Story 2 Implementation**: Tasks T043-T048 (component signals/inputs) can run in parallel
- **User Story 3 Tests**: Tasks T058-T065 (validation tests) can be written in parallel
- **Polish**: Tasks T079-T080, T081-T083, T086-T087, T089-T090, T092-T093 can run in parallel
- **Multiple developers**: After Phase 2, US1, US2, and US3 can be worked on simultaneously by different team members

---

## Parallel Example: User Story 1

### Launch all tests for User Story 1 together:

```bash
# Write these test files in parallel (different files):
# - src/app/services/idle-timeout.service.spec.ts (T010-T017)
# - tests/integration/idle-timeout-flow.spec.ts (T018-T020)
```

### After tests fail, implement service logic:

```bash
# Sequential implementation in idle-timeout.service.ts:
# T021 → T022 → T023 → T024 → T025 → T026 → T027 → T028 → T029 → T030
```

### Then integrate (different files, can parallelize):

```bash
# T031-T034: Modify voice-chat.component.ts (integration)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

This is the recommended approach for fastest time-to-value:

1. **Complete Phase 1**: Setup (5 minutes)
2. **Complete Phase 2**: Foundational - models and types (30 minutes)
3. **Complete Phase 3**: User Story 1 - core auto-disconnect (2-3 hours)
   - Write tests first (T010-T020)
   - Implement service (T021-T030)
   - Integrate with VoiceChatComponent (T031-T034)
4. **STOP and VALIDATE**: 
   - Run all tests - should pass ✅
   - Manual test: Connect → idle 2 minutes → verify disconnect
   - Demo to stakeholders
5. **Deploy MVP** if validation successful

**MVP delivers**: Automatic disconnection after 2 minutes of inactivity - the core value proposition

### Incremental Delivery (Recommended)

After MVP validation, add features incrementally:

1. **Setup + Foundational** → Foundation ready (30-45 minutes)
2. **Add User Story 1** → Test independently → **Deploy MVP** 🎯 (adds 2-3 hours)
3. **Add User Story 2** → Test independently → **Deploy v2** (adds 2-3 hours)
   - Now users get warnings before disconnect
4. **Add User Story 3** → Test independently → **Deploy v3** (adds 2-3 hours)
   - Now users can customize timeout duration
5. **Polish phase** → Final quality checks → **Deploy v1.0** (adds 2-3 hours)

Each increment adds value without breaking previous functionality.

### Parallel Team Strategy (3+ Developers)

With multiple developers working simultaneously:

1. **Together**: Complete Setup + Foundational (Phase 1-2)
   - Entire team ensures types and contracts are solid
   
2. **Once Foundational complete**, split work:
   - **Developer A**: User Story 1 (Phase 3) - Core disconnect logic
   - **Developer B**: User Story 2 (Phase 4) - Warning component
   - **Developer C**: User Story 3 (Phase 5) - Configuration
   
3. **Integration**:
   - Stories integrate naturally through shared service
   - Each developer tests their story independently
   - Final integration test confirms all three work together

4. **Polish**: All developers contribute to Phase 6 tasks in parallel

**Timeline estimate**: 1-2 days with 3 developers vs 3-4 days with 1 developer

---

## Testing Strategy

### Test-Driven Development (TDD) Flow

For each user story:

1. **RED**: Write tests that define expected behavior → Tests FAIL ❌
2. **GREEN**: Implement minimum code to make tests pass → Tests PASS ✅
3. **REFACTOR**: Clean up implementation while keeping tests passing

### Test Coverage Goals

- **Minimum 80%** code coverage across all idle timeout files
- **100%** coverage of critical paths:
  - Timer countdown logic
  - Activity detection and reset
  - Disconnect triggering
  - Configuration validation

### Test Types

1. **Unit Tests** (jasmine.clock() for timer control):
   - IdleTimeoutService: All public methods and signal updates
   - IdleWarningComponent: Display logic and event emissions
   - Validation functions: All edge cases and error conditions

2. **Integration Tests**:
   - End-to-end idle timeout flow with real services
   - Configuration persistence across component lifecycle
   - Warning display → user action → timer reset flow

3. **Accessibility Tests**:
   - Screen reader announces warnings
   - Keyboard navigation works
   - ARIA attributes correct

### Manual Testing Checklist

- [ ] Connect and idle for 2 minutes → auto-disconnect occurs
- [ ] Send message at 1:50 → timer resets, connection maintained
- [ ] Speak and get transcription at 1:45 → timer resets
- [ ] Warning appears at 30 seconds remaining
- [ ] Warning updates every second with correct time
- [ ] Dismiss warning → user prompted to take action
- [ ] Configure 5-minute timeout → persists after refresh
- [ ] Invalid timeout (20 seconds) → validation error shown
- [ ] Manual disconnect → timer stops, no auto-disconnect

---

## Notes

- **[P] tasks**: Different files, no dependencies - can run in parallel
- **[Story] label**: Maps task to specific user story for traceability
- **Test-First**: Write tests, verify they fail, then implement - no exceptions
- **Independent stories**: Each user story should be completable and testable on its own
- **Checkpoints**: Stop at each phase checkpoint to validate before proceeding
- **Commit strategy**: Commit after each task or logical group for easy rollback
- **Code review**: Request review at story boundaries (after each phase completion)

### Common Pitfalls to Avoid

- ❌ Implementing before writing tests
- ❌ Writing vague tasks without file paths
- ❌ Creating dependencies between user stories that prevent independent testing
- ❌ Modifying the same file in parallel tasks
- ❌ Skipping checkpoints and building on untested code
- ❌ Forgetting to use `takeUntilDestroyed()` for RxJS cleanup
- ❌ Not using `OnPush` change detection strategy
- ❌ Missing ARIA attributes for accessibility

### Success Indicators

- ✅ All tests pass
- ✅ 80%+ code coverage
- ✅ Each user story independently testable
- ✅ No console errors or warnings
- ✅ Accessibility audit passes
- ✅ Manual testing checklist complete
- ✅ Code follows Angular 20 best practices
- ✅ Documentation updated

---

## Summary

**Total Tasks**: 95 tasks across 6 phases

**Task Breakdown by User Story**:
- Setup (Phase 1): 3 tasks
- Foundational (Phase 2): 6 tasks (BLOCKS all stories)
- User Story 1 - Auto-Disconnect (P1): 31 tasks (11 tests + 20 implementation) 🎯 MVP
- User Story 2 - Visual Warning (P2): 23 tasks (8 tests + 15 implementation)
- User Story 3 - Configurable Timeout (P3): 15 tasks (9 tests + 6 implementation)
- Polish & Cross-Cutting (Phase 6): 17 tasks

**Parallel Opportunities Identified**: 
- 22 tasks marked [P] can run in parallel within their phase
- After Foundational phase, all 3 user stories can be developed in parallel by separate developers

**Independent Test Criteria**:
- US1: Connect → idle 2 min → verify disconnect (MVP-ready)
- US2: Connect → wait for 30 sec warning → verify display
- US3: Set 5 min timeout → idle → verify custom disconnect time + persist

**Suggested MVP Scope**: 
- Phase 1-3 only (Setup + Foundational + User Story 1)
- Delivers core auto-disconnect after 2 minutes
- Estimated effort: 3-4 hours for single developer
- Provides immediate value: prevents abandoned sessions

**Format Validation**: ✅ All tasks follow required checklist format:
- `- [ ] [TaskID] [P?] [Story?] Description with file path`
- Sequential IDs (T001-T095)
- [P] marker for parallelizable tasks
- [Story] label (US1, US2, US3) for user story phases
- Clear descriptions with exact file paths

---

**Ready for implementation!** Follow TDD approach, complete MVP first, then iterate.
