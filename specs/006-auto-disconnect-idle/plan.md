# Implementation Plan: Auto-Disconnect on Idle Activity

**Branch**: `006-auto-disconnect-idle` | **Date**: 2025-10-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-auto-disconnect-idle/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement automatic disconnection of idle voice chat sessions when no transcription or chat message activity is detected for a configurable timeout period (default: 2 minutes). The system will use Angular Signals for reactive timer state management, provide visual warnings 30 seconds before disconnection, and persist configuration preferences in browser sessionStorage. The implementation follows the smart/presentational component pattern with strict type safety and comprehensive test coverage.

## Technical Context

**Language/Version**: TypeScript 5.9.2 with Angular 20.0.0  
**Primary Dependencies**: Angular Material 20.0.0, LiveKit Client 2.x, RxJS 7.8, Angular CDK  
**Storage**: Browser sessionStorage for idle timeout configuration persistence  
**Testing**: Jasmine/Karma with Zone.js polyfills, Angular testing utilities for signal testing  
**Target Platform**: Modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)  
**Project Type**: Single-page Angular web application with frontend-only implementation  
**Performance Goals**: Timer updates at 1Hz (1 second intervals), <50ms timer reset latency, minimal impact on voice chat performance  
**Constraints**: Client-side only (no server-side timeout enforcement), timer accuracy within 1 second, warning display at exactly 30 seconds before timeout  
**Scale/Scope**: Single user session per browser tab, configurable timeout range 30 seconds to 60 minutes, persistent configuration across browser sessions

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Initial Check (Before Phase 0)
- ✅ **Angular-First Architecture**: Uses standalone components, Angular Signals (`signal()`, `computed()`, `effect()`), and modern `input()`/`output()` functions
- ✅ **Type Safety**: TypeScript strict mode enabled with explicit interfaces for `IdleTimeoutConfig`, `IdleTimerState`, and `ActivityEvent`
- ✅ **Test-First Development**: TDD approach with unit tests for service logic, component tests for UI, and integration tests for end-to-end flow  
- ✅ **Performance & Scalability**: OnPush change detection strategy, RxJS debouncing for activity events, proper cleanup of timers/subscriptions
- ✅ **Accessibility & Standards**: WCAG 2.1 AA compliance with `role="alert"` for warnings, keyboard navigation, screen reader support

**Status**: ✅ ALL GATES PASSED - Proceeding to Phase 0

### Re-Validation (After Phase 1 Design)

- ✅ **Angular-First Architecture**: 
  - Standalone `IdleWarningComponent` with `ChangeDetectionStrategy.OnPush`
  - Service uses `signal()`, `computed()`, `effect()` for reactive state
  - Component uses `input.required()` and `output()` functions
  - Proper dependency injection with `inject()`

- ✅ **Type Safety**: 
  - All interfaces defined in `/contracts/idle-timeout-types.ts`
  - Strict typing for config, state, and events
  - Type guards for discriminated union (`ActivityEvent`)
  - Validation functions with typed error returns

- ✅ **Test-First Development**: 
  - Jasmine fake timers for deterministic testing
  - Unit tests for service (timer logic, activity monitoring, config validation)
  - Component tests for warning display and user interaction
  - Integration tests for full idle timeout flow
  - Minimum 80% coverage target

- ✅ **Performance & Scalability**: 
  - `OnPush` change detection on presentational component
  - `takeUntilDestroyed()` for automatic subscription cleanup
  - Timer updates at 1Hz (once per second)
  - Activity monitoring uses Signal effects (no manual subscriptions)
  - RxJS operators for efficient stream processing

- ✅ **Accessibility & Standards**: 
  - `role="alert"` with `aria-live="assertive"` for warnings
  - Keyboard accessible dismiss button with `aria-label`
  - Semantic HTML structure
  - Screen reader friendly countdown announcements
  - WCAG 2.1 AA color contrast requirements documented

**Final Status**: ✅ ALL CONSTITUTIONAL REQUIREMENTS MET

**Design Compliance Notes**:
- No complexity violations
- Follows established project patterns
- Integrates cleanly with existing services
- Maintains separation of concerns (service for logic, component for presentation)

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/app/
├── models/
│   ├── idle-timeout-config.ts       # Interface for timeout configuration
│   ├── idle-timer-state.ts          # Interface for timer state
│   └── activity-event.ts            # Type for activity events
├── services/
│   ├── idle-timeout.service.ts      # Core idle timer logic
│   └── idle-timeout.service.spec.ts # Service unit tests
├── components/
│   ├── idle-warning/
│   │   ├── idle-warning.component.ts       # Warning display (presentational)
│   │   ├── idle-warning.component.html
│   │   ├── idle-warning.component.scss
│   │   └── idle-warning.component.spec.ts
│   └── voice-chat/                  # Existing component to be enhanced
│       └── voice-chat.component.ts  # Integration point for idle timeout
└── utils/
    └── storage.utils.ts             # sessionStorage helper functions

tests/
├── unit/
│   ├── idle-timeout.service.spec.ts
│   └── idle-warning.component.spec.ts
└── integration/
    └── idle-timeout-flow.spec.ts    # End-to-end idle disconnection tests
```

**Structure Decision**: This is a single Angular web application. The feature adds idle timeout monitoring to the existing voice chat functionality. New code follows the established pattern with models for type definitions, a service for business logic, and a presentational component for the warning UI. Integration occurs through the existing `VoiceChatComponent` which will inject the `IdleTimeoutService`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations - this feature fully complies with all constitutional requirements.

---

## Phase Completion Summary

### Phase 0: Research ✅ COMPLETE
**Output**: esearch.md

All technical unknowns resolved:
- Timer implementation: RxJS interval + Angular Signals
- Activity detection: ConversationStorageService.lastMessageAt signal monitoring
- Tab visibility: No special handling (continues regardless)
- Configuration storage: Browser sessionStorage
- Warning UX: MatSnackBar or inline banner with role="alert"
- Testing strategy: Jasmine fake timers (jasmine.clock())
- Integration: LiveKitConnectionService.disconnect() on timeout

### Phase 1: Design & Contracts ✅ COMPLETE
**Outputs**: 
- data-model.md - TypeScript interfaces and state machine
- contracts/idle-timeout-types.ts - Complete type definitions
- quickstart.md - Developer implementation guide
- Agent context updated (copilot-instructions.md)

Artifacts created:
- 3 core interfaces (IdleTimeoutConfig, IdleTimerState, ActivityEvent)
- Service interface (IIdleTimeoutService)
- Component props interface (IdleWarningProps)
- Validation types and type guards
- State machine diagram
- Integration patterns documented

### Constitutional Re-Validation ✅ PASSED
All five constitutional pillars validated against final design:
- Angular-First Architecture: Standalone components + Signals
- Type Safety: Strict interfaces with validation
- Test-First Development: Comprehensive test strategy defined
- Performance: OnPush, proper cleanup, 1Hz updates
- Accessibility: WCAG 2.1 AA with ARIA support

---

## Next Steps

The planning phase is complete. To continue implementation:

1. **Run /speckit.tasks** to generate detailed implementation tasks from this plan
2. **Follow TDD approach**: Write tests before implementation
3. **Start with models**: Create TypeScript interfaces first
4. **Implement service**: Build IdleTimeoutService with timer logic
5. **Create component**: Build IdleWarningComponent (presentational)
6. **Integrate**: Connect to VoiceChatComponent
7. **Test thoroughly**: Unit, component, integration tests

---

## Artifacts Generated

| File | Purpose | Status |
|------|---------|--------|
| plan.md | This file - implementation roadmap | ✅ Complete |
| esearch.md | Phase 0 technical research findings | ✅ Complete |
| data-model.md | TypeScript interfaces and data structures | ✅ Complete |
| contracts/idle-timeout-types.ts | Type definitions | ✅ Complete |
| quickstart.md | Developer implementation guide | ✅ Complete |
| .github/copilot-instructions.md | Updated agent context | ✅ Updated |

---

**Planning Status**: ✅ READY FOR IMPLEMENTATION

**Branch**:  06-auto-disconnect-idle  
**Next Command**: /speckit.tasks to break down into actionable tasks
