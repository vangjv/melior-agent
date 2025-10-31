# Implementation Plan: Text Chat Input

**Branch**: `007-text-chat-input` | **Date**: 2025-10-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-text-chat-input/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement a text input field at the bottom of the conversation interface to enable users to send messages via typing as an alternative to voice input. The text input will bypass speech-to-text processing and send messages directly to the LiveKit agent via data channel. The feature will support multi-line input, keyboard shortcuts (Enter to send, Shift+Enter for new line), mobile keyboard optimization, and visual feedback during message sending. Text input will be available in both voice and chat modes, allowing users to mix text and voice input in the same conversation.

## Technical Context

**Language/Version**: TypeScript 5.9.2, Angular 20.0.0  
**Primary Dependencies**: Angular Material 20.0.0 (form components), Angular CDK 20.0.0 (overlay/layout), LiveKit Client 2.x (data channel), RxJS 7.x (async state management)  
**Storage**: Browser sessionStorage for conversation history (inherited from feature 005)  
**Testing**: Jasmine/Karma for unit tests with Zone.js polyfills, integration tests for data channel communication  
**Target Platform**: Web browsers (desktop + mobile), requires LiveKit WebRTC connection
**Project Type**: Web application (Angular SPA with Azure Functions backend)  
**Performance Goals**: <100ms text input response time, <50ms send button state transition, no frame drops during typing  
**Constraints**: Must integrate with existing unified conversation display (feature 005), must work on mobile with virtual keyboard overlay, text input must not block voice input pipeline  
**Scale/Scope**: Single new presentational component (TextInputComponent), integration with existing ConversationService, new data channel message protocol extension

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- ✅ **Angular-First Architecture**: TextInputComponent will be a standalone presentational component using `input()` and `output()` signal-based APIs. State management via Angular Signals (`signal()`, `computed()`) in ConversationService. Follows smart/presentational pattern.
- ✅ **Type Safety**: All new interfaces (TextInputState, SendButtonState, TextMessage source type) will be explicitly typed. Data channel protocol will use TypeScript discriminated unions. Strict mode enabled throughout.
- ✅ **Test-First Development**: Spec defines clear acceptance criteria. Unit tests for TextInputComponent written before implementation. Integration tests for text message flow through data channel. Minimum 80% coverage required.
- ✅ **Performance & Scalability**: TextInputComponent uses OnPush change detection strategy. Text input operations debounced where needed. No impact on existing virtual scrolling for conversation history. Lightweight data channel message protocol.
- ✅ **Accessibility & Standards**: Text input uses semantic HTML (`<textarea>`, `<button>`). Proper ARIA labels and roles defined. Keyboard navigation support (Enter, Shift+Enter, Tab). Screen reader announcements for send states. High contrast mode compatible.

**Constitutional Compliance**: PASS - No violations. Feature fully aligns with Angular-first principles, type safety, TDD, performance optimization, and accessibility standards.

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
├── components/
│   ├── text-input/
│   │   ├── text-input.component.ts        # NEW: Presentational component for text input UI
│   │   ├── text-input.component.html      # NEW: Template with textarea + send button
│   │   ├── text-input.component.scss      # NEW: Component styles with mobile optimization
│   │   └── text-input.component.spec.ts   # NEW: Unit tests for text input component
│   └── conversation/
│       └── conversation.component.html     # MODIFY: Add <app-text-input> at bottom
├── models/
│   ├── message.model.ts                   # MODIFY: Extend with text message source type
│   └── text-input.model.ts                # NEW: TextInputState, SendButtonState interfaces
├── services/
│   ├── conversation.service.ts            # MODIFY: Add sendTextMessage() method
│   └── livekit.service.ts                 # MODIFY: Add sendTextMessageToAgent() method
└── utils/
    └── data-channel-protocol.ts           # NEW: Define text message protocol types

agent/
└── agent.md                               # MODIFY: Add text message handling via data channel

tests/
├── integration/
│   └── text-chat-input.spec.ts           # NEW: Integration tests for text message flow
└── unit/
    └── text-input.component.spec.ts      # COVERED: Component unit tests
```

**Structure Decision**: This is a web application with Angular frontend and LiveKit agent backend. The text input feature primarily involves frontend changes (new component, service methods, models) with minimal agent modifications to handle the new data channel message type. The structure follows Angular best practices with feature-based organization and clear separation of concerns.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No violations**: This feature fully complies with all constitutional principles.

## Phase Summary

### Phase 0: Research ✅ COMPLETE

**Deliverable**: `research.md`

**Key Findings**:
- Use Angular Material `matInput` with `matTextareaAutosize` for textarea component
- Extend existing LiveKit data channel protocol with `text_message` type
- Use CSS `dvh` units and Angular CDK Layout for mobile keyboard handling
- Implement Enter-to-send with Shift+Enter for new lines (industry standard)
- Extend unified message model with discriminated union for message source
- Character limit of 5000 characters with visual feedback

### Phase 1: Design & Contracts ✅ COMPLETE

**Deliverables**:
- `data-model.md` - Complete TypeScript type definitions
- `contracts/text-message-protocol.md` - Data channel protocol specification
- `contracts/text-message-ack-protocol.md` - Optional acknowledgment protocol
- `quickstart.md` - Developer implementation guide
- Updated `.github/copilot-instructions.md` - Added text chat input technologies

**Key Artifacts**:
1. **Models Defined**:
   - `TextInputState` - Component state management
   - `TextInputConfig` - Configuration options
   - `SendButtonState` - Discriminated union for button states
   - `TextMessageProtocol` - Data channel message format
   - `UserTextMessage` - Extends unified conversation message model
   - `TextMessageError` - Error types and codes

2. **Protocol Contracts**:
   - Text message format (Frontend → Agent)
   - Optional acknowledgment format (Agent → Frontend)
   - JSON schema validation
   - Wire format examples

3. **Implementation Guide**:
   - 8-step quickstart with code examples
   - Testing checklist aligned with user stories
   - Common issues and solutions
   - Performance benchmarks

### Re-Evaluated Constitution Check ✅ PASS

All constitutional principles remain satisfied after detailed design:
- ✅ **Angular-First Architecture**: TextInputComponent as standalone presentational component with signal-based APIs
- ✅ **Type Safety**: All interfaces explicitly typed with readonly properties and discriminated unions
- ✅ **Test-First Development**: Clear acceptance criteria, test coverage requirements documented
- ✅ **Performance & Scalability**: OnPush change detection, debounced operations, lightweight protocol
- ✅ **Accessibility & Standards**: Semantic HTML, ARIA labels, keyboard navigation, screen reader support

**No additional concerns identified**.

## Next Steps (Phase 2)

The `/speckit.plan` command stops here as specified. The next phase involves:

1. Run `/speckit.tasks` to generate task breakdown from this plan
2. Implement features following the quickstart guide
3. Write tests before implementation (TDD)
4. Execute tasks in priority order (P1 user stories first)

## Branch & Artifacts

**Branch**: `007-text-chat-input`

**Generated Files**:
```
specs/007-text-chat-input/
├── plan.md              ✅ This file
├── research.md          ✅ Phase 0 output
├── data-model.md        ✅ Phase 1 output
├── quickstart.md        ✅ Phase 1 output
└── contracts/
    ├── text-message-protocol.md      ✅ Phase 1 output
    └── text-message-ack-protocol.md  ✅ Phase 1 output
```

**Updated Files**:
- `.github/copilot-instructions.md` ✅ Agent context updated
