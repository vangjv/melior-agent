# Implementation Plan: Voice Chat Transcription App

**Branch**: `001-voice-chat-transcription` | **Date**: October 24, 2025 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-voice-chat-transcription/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Create a responsive mobile-first Angular application that enables verbal processors to engage in voice conversations with a LiveKit AI agent while viewing real-time transcriptions of both user and agent speech. The app features a simple connect/disconnect interface, obtains LiveKit access tokens via Azure Functions backend API, establishes WebRTC audio connections, and displays synchronized transcriptions with visual speaker distinction. Implementation uses Angular 20 standalone components with signals, LiveKit Client SDK for WebRTC, and integrates with the 002-livekit-token-api backend service for secure token acquisition.

## Technical Context

**Language/Version**: TypeScript 5.9.2 with Angular 20.0.0  
**Primary Dependencies**: Angular Material 20.0.0, LiveKit Client SDK 2.x, RxJS 7.x, Angular CDK  
**Storage**: Browser sessionStorage for temporary transcription history (no persistent backend storage)  
**Testing**: Jasmine/Karma with Zone.js polyfills for zoneless app, integration tests with mock LiveKit  
**Target Platform**: Modern mobile browsers (iOS Safari 15+, Chrome/Android 90+), responsive web app
**Project Type**: Web application (Angular frontend + Azure Functions backend)  
**Performance Goals**: <3s connection establishment, <500ms transcription latency, 60fps UI, <100MB memory  
**Constraints**: WebRTC browser support, microphone permissions, network bandwidth (min 100kbps), zoneless change detection  
**Scale/Scope**: Single-user sessions, 30min max session length, 1000 transcription messages per session, 5 concurrent components

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- ✅ **Angular-First Architecture**: Uses standalone components exclusively with signal-based inputs/outputs, computed state
- ✅ **Type Safety**: TypeScript strict mode enabled with explicit interfaces for all models (ConnectionState, TranscriptionMessage, Session)
- ✅ **Test-First Development**: TDD approach with Jasmine/Karma unit tests, LiveKit integration tests with mocks, >80% coverage target  
- ✅ **Performance & Scalability**: OnPush change detection, lazy loading, virtual scrolling for transcription list (>100 messages), signal-based reactivity
- ✅ **Accessibility & Standards**: WCAG 2.1 AA compliance with ARIA live regions for transcriptions, semantic HTML, Angular Material components, responsive design

**Notes**: All constitutional principles applicable to Angular frontend development are fully satisfied. Backend token API (002-livekit-token-api) is a separate feature with its own constitution check.

## Project Structure

### Documentation (this feature)

```text
specs/001-voice-chat-transcription/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── livekit-integration.interface.ts
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Frontend Angular Application
src/
├── app/
│   ├── components/
│   │   ├── voice-chat/                    # Smart component (main container)
│   │   │   ├── voice-chat.ts
│   │   │   ├── voice-chat.html
│   │   │   ├── voice-chat.scss
│   │   │   └── voice-chat.spec.ts
│   │   ├── connection-button/             # Presentational component
│   │   │   ├── connection-button.ts
│   │   │   ├── connection-button.html
│   │   │   ├── connection-button.scss
│   │   │   └── connection-button.spec.ts
│   │   └── transcription-display/         # Presentational component
│   │       ├── transcription-display.ts
│   │       ├── transcription-display.html
│   │       ├── transcription-display.scss
│   │       └── transcription-display.spec.ts
│   ├── services/
│   │   ├── livekit-connection.service.ts  # Manages LiveKit room connection
│   │   ├── livekit-connection.service.spec.ts
│   │   ├── transcription.service.ts       # Manages transcription state
│   │   ├── transcription.service.spec.ts
│   │   ├── token.service.ts               # Calls backend token API
│   │   └── token.service.spec.ts
│   ├── models/
│   │   ├── connection-state.model.ts      # ConnectionState type union
│   │   ├── transcription-message.model.ts # TranscriptionMessage interface
│   │   ├── session.model.ts               # UserSession interface
│   │   └── livekit-config.model.ts        # LiveKit configuration types
│   ├── app.config.ts                      # App configuration with zoneless
│   ├── app.routes.ts                      # Routing configuration
│   └── app.ts                             # Root component
├── environments/
│   ├── environment.ts                     # Production config
│   └── environment.development.ts         # Development config with local API
└── styles.scss                            # Global Material theme

# Backend API (separate feature - see 002-livekit-token-api)
api/
├── src/
│   ├── functions/
│   │   └── generateToken.ts              # Token generation endpoint
│   └── services/
│       └── LiveKitTokenService.ts        # Token generation logic
└── tests/
    ├── unit/
    │   └── LiveKitTokenService.test.ts
    └── integration/
        └── generateToken.test.ts

# Integration Tests
tests/
├── integration/
│   └── livekit-integration.spec.ts       # End-to-end LiveKit connection tests
└── e2e/
    ├── voice-chat.spec.ts                # User journey tests
    └── accessibility.spec.ts             # WCAG compliance tests
```

**Structure Decision**: Using Angular 20 feature-based structure with smart/presentational component pattern. The `voice-chat` smart component orchestrates services and manages application state using signals. Presentational components (`connection-button`, `transcription-display`) receive inputs via `input()` and emit events via `output()`. Services use dependency injection with interface-based contracts for testability. Backend token API is implemented as part of the 002-livekit-token-api feature in the `api/` directory using Azure Functions TypeScript v4.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No violations requiring justification.** All constitutional principles are satisfied:
- Angular-first architecture with standalone components and signals
- TypeScript strict mode with full type safety
- TDD approach with comprehensive test coverage
- OnPush change detection and performance optimizations
- WCAG 2.1 AA accessibility compliance

---

## Phase 0 Complete: Research Findings

All technical unknowns have been resolved. See [research.md](./research.md) for details:

- ✅ LiveKit Client SDK integration with Angular Signals (service wrapper pattern)
- ✅ Backend token API integration via HttpClient (002-livekit-token-api feature)
- ✅ LiveKit agent-based transcription using data channel messages
- ✅ Mobile browser audio permission handling with feature detection
- ✅ WebRTC testing strategy using interface-based mocks

**Key Decision**: Frontend obtains LiveKit tokens by calling the Azure Functions backend API at `/api/token`. This ensures API credentials remain secure and enables future authentication layer integration.

---

## Phase 1 Complete: Design Artifacts

### Data Model
See [data-model.md](./data-model.md) for complete TypeScript interfaces:
- `ConnectionState` - Discriminated union for connection lifecycle
- `ConnectionError` - Categorized error types with recovery flags
- `TranscriptionMessage` - Message entity with speaker, text, and metadata
- `VoiceSession` - Session container with transcription history
- `LiveKitConfig` - Configuration for LiveKit service connection
- `TokenRequest` / `TokenResponse` - Models for backend token API integration
- `ConnectionButtonState` / `TranscriptionDisplayState` - Derived UI states

### API Contract
See [contracts/livekit-integration.interface.ts](./contracts/livekit-integration.interface.ts) for service interfaces:
- `ILiveKitConnectionService` - Connection management contract
- `ITranscriptionService` - Transcription state management contract  
- `ITokenService` - Token acquisition contract (calls backend API)
- Mock implementations for testing

### Developer Guide
See [quickstart.md](./quickstart.md) for local development setup:
- Prerequisites and installation
- Environment configuration (frontend + backend API)
- Running development server
- Testing with backend token API
- Troubleshooting guide

### Agent Context Updated
GitHub Copilot instructions updated with:
- Angular 20.0.0 with standalone components and zoneless change detection
- LiveKit Client 2.x for WebRTC voice communication
- Angular Signals for reactive state management
- Integration with 002-livekit-token-api backend service

---

## Post-Design Constitution Re-Check

*Re-evaluated after Phase 1 design completion*

- ✅ **Angular-First Architecture**: All components use standalone architecture with signal-based inputs/outputs, service contracts defined
- ✅ **Type Safety**: Complete TypeScript interfaces with strict mode, discriminated unions for state management, type guards for narrowing
- ✅ **Test-First Development**: Mock interfaces designed for unit testing, integration test strategy with backend API mocking planned
- ✅ **Performance & Scalability**: OnPush change detection strategy, virtual scrolling for >100 messages, signal-based reactivity, lazy loading ready
- ✅ **Accessibility & Standards**: ARIA live regions for transcriptions, semantic HTML structure, keyboard navigation patterns, WCAG 2.1 AA compliance

**Design validates all constitutional principles. No violations detected.**

---

## Next Steps

**Phase 2**: Run `/speckit.tasks` command to generate task breakdown in `tasks.md`

The implementation phase will follow TDD approach:
1. Write failing tests for each user story
2. Implement minimal code to pass tests  
3. Refactor with confidence

**Branch**: `001-voice-chat-transcription` is ready for implementation to begin.

**Critical Dependency**: Backend token API (002-livekit-token-api) must be running and configured. See `specs/002-livekit-token-api/quickstart.md` for setup instructions.
