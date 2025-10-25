# Implementation Plan: Voice/Chat Response Mode Toggle

**Branch**: `003-voice-chat-mode` | **Date**: 2025-10-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-voice-chat-mode/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Add a voice/chat response mode toggle to the Angular voice chat application, enabling users to switch between receiving agent responses as synthesized speech (voice mode) or text messages (chat mode) via LiveKit's data channel. The feature maintains voice input throughout while giving users flexibility in response delivery format. Implementation includes a new ResponseModeService for data channel communication, mode toggle UI component, chat message display with auto-scroll, mode state persistence, and timeout/error handling.

## Technical Context

**Language/Version**: TypeScript 5.9.2 with Angular 20.0.0  
**Primary Dependencies**: 
- Angular Material 20.0.0 (UI components)
- LiveKit Client SDK 2.x (data channel APIs: RoomEvent.DataReceived, publishData)
- RxJS 7.x (reactive programming)
- Angular CDK (virtual scrolling for chat messages)

**Storage**: 
- Browser localStorage (user mode preference persistence)
- Session-only in-memory storage (chat message history)

**Testing**: 
- Jasmine/Karma for unit tests
- Angular TestBed with HttpClientTestingModule
- Mock LiveKit Room and data channel APIs
- Integration tests with mocked agent responses

**Target Platform**: 
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile-first responsive design (minimum 320px width)
- iOS Safari and Chrome on Android

**Project Type**: Single-page Angular web application (existing)

**Performance Goals**: 
- Mode switch confirmation < 2 seconds (including network round-trip)
- Chat display maintains 60fps with 100+ messages
- Mode toggle debounced to 300ms
- OnPush change detection strategy for all components

**Constraints**: 
- Must not modify LiveKit agent implementation (agent-side complete)
- No new third-party dependencies beyond existing stack
- Data channel message format fixed by agent specification
- Must maintain compatibility with existing LiveKitConnectionService and TranscriptionService
- Zoneless change detection architecture (Angular 20)

**Scale/Scope**: 
- Single-user voice chat sessions
- Chat history: session-only, no persistence across reconnections
- Expected message volume: <500 messages per session
- Mobile-optimized for touch interfaces (44x44px minimum touch targets)


## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- ✅ **Angular-First Architecture**: Uses standalone components exclusively with Angular Signals for state management. ResponseModeService will use `signal()`, `computed()`, and `effect()`. Components will use `input()` and `output()` functions instead of decorators. Smart/presentational component pattern enforced.

- ✅ **Type Safety**: TypeScript strict mode enabled. All data channel messages, state models, and service interfaces will have explicit TypeScript interfaces. Discriminated unions for message types ensure type-safe message handling.

- ✅ **Test-First Development**: TDD approach with unit tests for ResponseModeService (message encoding/decoding, state transitions), ModeToggleButtonComponent (states, debouncing), and ChatMessageDisplayComponent (rendering, auto-scroll). Minimum 80% code coverage target. Integration tests for end-to-end mode switching.

- ✅ **Performance & Scalability**: OnPush change detection for all components. Virtual scrolling (Angular CDK ScrollingModule) for chat messages when count > 100. Debouncing (RxJS debounceTime) for mode toggle clicks (300ms). Efficient trackBy functions in ngFor loops. Computed signals for derived state.

- ✅ **Accessibility & Standards**: WCAG 2.1 Level AA compliance. Mode toggle button with ARIA labels (`aria-label`, `aria-pressed`). Screen reader announcements using Angular CDK LiveAnnouncer. Keyboard navigation support (Space/Enter). Sufficient color contrast (4.5:1 minimum). Semantic HTML with proper heading structure in chat messages. Touch targets minimum 44x44 pixels.

**Re-evaluation after Phase 1 Design**: ✅ All constitutional requirements validated against detailed design in data-model.md and service contracts.


## Project Structure

### Documentation (this feature)

```text
specs/003-voice-chat-mode/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output - LiveKit data channel patterns, debouncing, virtual scrolling
├── data-model.md        # Phase 1 output - TypeScript interfaces and state models
├── quickstart.md        # Phase 1 output - Developer implementation guide
├── contracts/           # Phase 1 output - Service contracts and message schemas
│   └── service-contracts.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/app/
├── models/
│   ├── connection-state.model.ts          # Existing - connection state types
│   ├── transcription-message.model.ts     # Existing - transcription types
│   ├── response-mode.model.ts             # NEW - ResponseMode type and data channel messages
│   └── chat-message.model.ts              # NEW - Chat message state models
│
├── services/
│   ├── livekit-connection.service.ts      # Existing - to be extended for data channel access
│   ├── transcription.service.ts           # Existing - no changes needed
│   ├── response-mode.service.ts           # NEW - Data channel communication and mode management
│   ├── response-mode.service.spec.ts      # NEW - Unit tests for response mode service
│   └── chat-storage.service.ts            # NEW - Chat message history and localStorage
│
├── components/
│   ├── voice-chat/                        # Existing - parent component
│   │   ├── voice-chat.component.ts        # Modified - integrate mode toggle and chat display
│   │   ├── voice-chat.component.html      # Modified - add mode toggle and chat UI
│   │   └── voice-chat.component.scss      # Modified - layout for new components
│   │
│   ├── mode-toggle-button/                # NEW - Presentational component
│   │   ├── mode-toggle-button.component.ts
│   │   ├── mode-toggle-button.component.html
│   │   ├── mode-toggle-button.component.scss
│   │   └── mode-toggle-button.component.spec.ts
│   │
│   └── chat-message-display/              # NEW - Presentational component
│       ├── chat-message-display.component.ts
│       ├── chat-message-display.component.html
│       ├── chat-message-display.component.scss
│       └── chat-message-display.component.spec.ts
│
└── utils/                                  # NEW directory
    └── debounce.util.ts                   # NEW - RxJS debouncing utilities

tests/
├── integration/
│   └── response-mode-integration.spec.ts  # NEW - End-to-end mode switching tests
└── unit/                                  # Existing unit tests extended with new components
```

**Structure Decision**: Single-page web application structure (Option 1) selected. This is an existing Angular application, so we're extending the current `src/app/` structure with new models, services, and components. The feature integrates into the existing voice-chat component as the parent smart component that orchestrates mode toggle and chat display presentational components.

**Key Architectural Decisions**:
- **ResponseModeService**: New service dedicated to data channel message handling, separate from LiveKitConnectionService to maintain single responsibility
- **Smart/Presentational Pattern**: VoiceChatComponent (smart) manages state and service injection; ModeToggleButtonComponent and ChatMessageDisplayComponent (presentational) are pure UI with inputs/outputs
- **Minimal Changes to Existing Code**: LiveKitConnectionService extended only to expose Room instance for data channel access; TranscriptionService requires no changes

---

## Planning Summary

### Phase 0 Completion ✅

**Research Documentation** ([research.md](./research.md)):
- LiveKit data channel communication pattern (Room.publishData with RELIABLE delivery)
- Angular Signal-based state management (signal, computed, effect)
- Message encoding/decoding strategy (TextEncoder/TextDecoder with JSON)
- Debouncing mode toggle clicks (RxJS debounceTime 300ms)
- Chat message display with virtual scrolling (Angular CDK)
- LocalStorage preference persistence
- Timeout handling for mode confirmations (5 seconds)
- Accessibility implementation (WCAG 2.1 AA with Angular CDK A11yModule)
- Error handling strategy (graceful degradation)
- Mobile touch target optimization (44x44px minimum)

**All technical unknowns resolved** ✅

### Phase 1 Completion ✅

**Data Models** ([data-model.md](./data-model.md)):
- ResponseMode type definition
- Data channel message types (SetResponseModeMessage, ResponseModeUpdatedMessage, AgentChatMessage)
- Chat message state models (ChatMessageState, ChatHistoryState)
- Response mode service state (ResponseModeState, ModeToggleButtonState)
- Storage models (StoredModePreference)
- Error models (ResponseModeError with error codes)
- Event models (ResponseModeEvent union type)
- Configuration models (ResponseModeConfig with defaults)
- Type guards and factory functions for all types
- State transition and data flow diagrams

**Service Contracts** ([contracts/service-contracts.md](./contracts/service-contracts.md)):
- IResponseModeService interface with signal-based API
- IChatStorageService interface for message history and persistence
- IModeToggleButtonComponent interface (presentational)
- IChatMessageDisplayComponent interface (presentational)
- ILiveKitConnectionServiceExtension for Room access
- Data channel message protocol specification
- Integration patterns and dependency injection setup
- Testing contracts and examples

**Developer Guide** ([quickstart.md](./quickstart.md)):
- Phase-by-phase implementation guide (A-E)
- Complete code examples for all components and services
- Step-by-step integration instructions
- Testing strategy and verification checklist
- Troubleshooting guide
- Estimated completion time: 6.5-7 hours

**Agent Context Updated** ✅:
- TypeScript 5.9.2 with Angular 20.0.0 added to copilot-instructions.md

### Constitutional Re-Evaluation ✅

After Phase 1 design completion, all constitutional requirements verified:

- ✅ **Angular-First Architecture**: Standalone components, Angular Signals, smart/presentational pattern
- ✅ **Type Safety**: Strict TypeScript with discriminated unions and type guards
- ✅ **Test-First Development**: TDD approach with 80%+ coverage target, comprehensive test contracts
- ✅ **Performance & Scalability**: OnPush change detection, virtual scrolling, debouncing, computed signals
- ✅ **Accessibility & Standards**: WCAG 2.1 AA compliance, ARIA labels, keyboard navigation, screen reader support

**No constitutional violations** - All requirements met within established guidelines.

---

## Artifacts Created

```
specs/003-voice-chat-mode/
├── spec.md                          ✅ Feature specification
├── plan.md                          ✅ This implementation plan
├── research.md                      ✅ Phase 0: Research findings
├── data-model.md                    ✅ Phase 1: TypeScript data models
├── quickstart.md                    ✅ Phase 1: Developer guide
├── contracts/
│   └── service-contracts.md         ✅ Phase 1: Service interfaces
└── checklists/
    └── requirements.md              ✅ Quality validation (all passed)
```

---

## Next Steps

The planning phase is **COMPLETE**. Ready for implementation:

1. **Review Planning Artifacts**: Ensure team understands architecture and approach
2. **Begin Implementation**: Follow [quickstart.md](./quickstart.md) Phase A-E guide
3. **TDD Approach**: Write tests first for each component and service
4. **Incremental Integration**: Integrate one component at a time
5. **Testing & Validation**: Run unit, integration, and accessibility tests
6. **Code Review**: Submit PR following Angular best practices

**Optional**: Run `/speckit.tasks` command to generate detailed task breakdown from this plan.

---

## Key Technical Decisions Summary

| Decision Area | Choice | Rationale |
|--------------|--------|-----------|
| **State Management** | Angular Signals | Zoneless change detection, fine-grained reactivity |
| **Data Channel** | LiveKit RELIABLE | Guaranteed message delivery and ordering |
| **Message Format** | JSON with TextEncoder | Human-readable, debuggable, type-safe |
| **Debouncing** | RxJS 300ms | Prevents double-clicks, feels responsive |
| **Virtual Scrolling** | Angular CDK | 60fps with 100+ messages, native integration |
| **Persistence** | localStorage | Simple, synchronous, sufficient for preference |
| **Timeout** | 5 seconds | Balances network latency with UX responsiveness |
| **Accessibility** | Angular CDK A11yModule | WCAG 2.1 AA compliance, screen reader support |
| **Error Handling** | Graceful degradation | Never crash, always inform user |
| **Touch Targets** | 44x44px minimum | Apple/Google guidelines, accessibility |

---

**Planning Completed**: 2025-10-24  
**Branch**: `003-voice-chat-mode`  
**Status**: Ready for Implementation Phase

