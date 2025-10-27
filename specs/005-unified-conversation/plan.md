# Implementation Plan: Unified Conversation Experience

**Branch**: `005-unified-conversation` | **Date**: October 26, 2025 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-unified-conversation/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Merge the separate transcription and chat message displays into a single unified conversation feed that shows all user and agent messages chronologically, regardless of response mode (voice or chat). The unified component will combine functionality from `TranscriptionDisplayComponent` and `ChatMessageDisplayComponent`, use a new unified message model, and preserve conversation history across mode toggles. Implementation follows Angular 20 best practices with standalone components, signals-based state management, OnPush change detection, and virtual scrolling for performance.

## Technical Context

**Language/Version**: TypeScript 5.9.2, Angular 20.0.0  
**Primary Dependencies**: 
- Angular Material 20.0.0 (UI components)
- Angular CDK 20.0.0 (ScrollingModule for virtual scrolling, A11y for accessibility)
- LiveKit Client SDK 2.x (WebRTC voice communication)
- RxJS 7.x (reactive programming)

**Storage**: Browser sessionStorage for conversation history persistence (5MB limit assumed)  
**Testing**: Jasmine/Karma for unit tests, Angular TestBed for component testing, Zone.js polyfills for test environment  
**Target Platform**: Web browsers (Chrome, Firefox, Safari, Edge), primary focus on mobile web (responsive design)  
**Project Type**: Single-page Angular web application (frontend only, no backend changes for this feature)  
**Performance Goals**: 
- Message rendering: <500ms for 95% of messages to appear after arrival
- Virtual scrolling activation: >100 messages
- Auto-scroll latency: <100ms after message arrives
- Bundle size: Stay within 500KB warning threshold

**Constraints**: 
- Must maintain backward compatibility with LiveKit agent communication
- Cannot break existing authentication flow (004-entra-external-id-auth)
- Must achieve 80%+ unit test coverage
- WCAG 2.1 AA compliance required
- OnPush change detection mandatory for performance

**Scale/Scope**: 
- Support 500+ messages in conversation feed without performance degradation
- Handle concurrent user and agent messages in real-time
- Single user session (no multi-device sync in v1)
- Assume max 5MB sessionStorage per conversation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- ✅ **Angular-First Architecture**: Uses standalone components exclusively, Angular Signals for state management (`signal()`, `computed()`, `effect()`), `input()` and `output()` functions for component APIs, no decorators for inputs/outputs
- ✅ **Type Safety**: TypeScript strict mode enabled, all models use explicit interfaces (`UnifiedConversationMessage`, `ConversationFeedState`), discriminated unions for type-safe message handling
- ✅ **Test-First Development**: TDD approach with tests written before implementation, 80% minimum coverage target, Jasmine/Karma for unit tests, TestBed for component testing
- ✅ **Performance & Scalability**: OnPush change detection strategy on all components, virtual scrolling via CDK when >100 messages, `trackBy` functions for ngFor loops, signal-based reactivity minimizes re-renders
- ✅ **Accessibility & Standards**: WCAG 2.1 AA compliance, semantic HTML (`<article>` for messages), ARIA labels for message metadata, LiveAnnouncer for screen reader notifications, 4.5:1 color contrast ratios

**Gate Status**: ✅ PASSED - All constitutional requirements met. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/005-unified-conversation/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output - design decisions and patterns
├── data-model.md        # Phase 1 output - unified message models and state
├── quickstart.md        # Phase 1 output - developer onboarding guide
├── contracts/           # Phase 1 output - TypeScript interfaces (not API contracts)
│   ├── unified-message.interface.ts
│   ├── conversation-state.interface.ts
│   └── message-metadata.interface.ts
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/app/
├── components/
│   ├── unified-conversation-display/        # NEW: Smart container component
│   │   ├── unified-conversation-display.component.ts
│   │   ├── unified-conversation-display.component.html
│   │   ├── unified-conversation-display.component.scss
│   │   └── unified-conversation-display.component.spec.ts
│   ├── conversation-message/                # NEW: Presentational message component
│   │   ├── conversation-message.component.ts
│   │   ├── conversation-message.component.html
│   │   ├── conversation-message.component.scss
│   │   └── conversation-message.component.spec.ts
│   ├── transcription-display/               # DEPRECATED: Will be removed
│   ├── chat-message-display/                # DEPRECATED: Will be removed
│   └── mode-toggle-button/                  # EXISTING: Reused as-is
│
├── models/
│   ├── unified-conversation-message.model.ts   # NEW: Unified message model
│   ├── conversation-feed-state.model.ts        # NEW: Conversation state model
│   ├── transcription-message.model.ts          # EXISTING: Used for data mapping
│   ├── chat-message.model.ts                   # EXISTING: Used for data mapping
│   └── response-mode.model.ts                  # EXISTING: Mode toggle types
│
├── services/
│   ├── conversation-storage.service.ts         # NEW: Unified storage service
│   ├── conversation-storage.service.spec.ts    # NEW: Service tests
│   ├── livekit-connection.service.ts           # MODIFIED: Emit unified messages
│   ├── livekit-connection.service.spec.ts      # MODIFIED: Update tests
│   ├── chat-storage.service.ts                 # DEPRECATED: Functionality merged
│   └── chat-storage.service.spec.ts            # DEPRECATED: Tests removed
│
└── utils/
    ├── message-merger.util.ts                  # NEW: Message merging logic
    ├── message-merger.util.spec.ts             # NEW: Utility tests
    └── storage-migration.util.ts               # NEW: Legacy data migration

tests/
├── unit/
│   ├── unified-conversation-display.component.spec.ts
│   ├── conversation-message.component.spec.ts
│   ├── conversation-storage.service.spec.ts
│   └── message-merger.util.spec.ts
└── integration/
    ├── unified-conversation-flow.spec.ts       # NEW: E2E conversation test
    └── mode-toggle-integration.spec.ts         # NEW: Mode switching test
```

**Structure Decision**: This is a Single Project (Angular web application). We are consolidating two existing display components (`transcription-display` and `chat-message-display`) into a new unified component structure. The new `unified-conversation-display` component follows the smart/presentational pattern with a container component managing state and a presentational `conversation-message` component for individual message rendering. The existing `chat-storage.service.ts` is replaced by `conversation-storage.service.ts` which handles the unified message format. Legacy components are marked for deprecation but retained temporarily for rollback capability.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitutional violations. This section is not applicable.

## Phase 0 Artifacts ✅

- ✅ [research.md](./research.md) - All technical unknowns resolved
  - Message model unification strategy (discriminated unions)
  - Message ordering and deduplication approach
  - Virtual scrolling strategy (>100 messages threshold)
  - Storage strategy (sessionStorage with migration)
  - Component architecture (smart/presentational pattern)
  - Message metadata indicators (Material icons)
  - Mode toggle integration (reuse existing component)
  - Interim transcription handling
  - Auto-scroll behavior with user override
  - Migration strategy for legacy data

## Phase 1 Artifacts ✅

- ✅ [data-model.md](./data-model.md) - Complete data model specification
  - UnifiedConversationMessage (discriminated union)
  - ConversationFeedState (conversation state container)
  - InterimTranscription (temporary transcription state)
  - MessageMetadata (debugging/analytics metadata)
  - Storage schema (sessionStorage format)
  - Factory functions and type guards
  - Serialization/deserialization logic

- ✅ [contracts/](./contracts/) - TypeScript interface definitions
  - unified-message.interface.ts
  - conversation-state.interface.ts
  - message-metadata.interface.ts

- ✅ [quickstart.md](./quickstart.md) - Developer onboarding guide
  - Architecture overview
  - Key concepts (unified model, ordering, virtual scrolling)
  - Common development tasks
  - Testing guide
  - Performance tips
  - Debugging tips
  - Common pitfalls

- ✅ Agent context updated
  - GitHub Copilot context file updated with new technologies

## Next Steps

Phase 2 is handled by the `/speckit.tasks` command, which will:
1. Generate detailed implementation tasks from this plan
2. Create task checklist in `tasks.md`
3. Break down work into concrete, testable units
4. Assign priorities and dependencies

**To proceed**: Run `/speckit.tasks` to generate implementation task list.

## Summary

This implementation plan establishes the technical foundation for unifying the conversation experience. All research has been completed, design decisions documented, and data models specified. The feature is ready for task breakdown and implementation.

**Key Technical Decisions**:
- Discriminated union pattern for type-safe message handling
- Signal-based reactive state management
- Smart/presentational component architecture
- Virtual scrolling for performance (>100 messages)
- sessionStorage for conversation persistence
- Migration support for legacy data

**Constitutional Compliance**: All requirements met with no violations.


## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
