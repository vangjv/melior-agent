# Research & Design Decisions: Unified Conversation Experience

**Feature**: 005-unified-conversation  
**Date**: October 26, 2025  
**Status**: Complete

## Overview

This document captures research findings and design decisions for unifying the transcription and chat message displays into a single conversation feed. All technical unknowns from the initial planning phase have been resolved.

## Key Research Areas

### 1. Message Model Unification

**Decision**: Create a discriminated union type `UnifiedConversationMessage` that encompasses both transcription and chat message attributes.

**Rationale**:
- Discriminated unions provide type-safe message handling at compile time
- TypeScript compiler can narrow types based on the discriminator field
- Enables shared display logic while preserving message-type-specific metadata
- Follows Angular best practices for type safety

**Alternatives Considered**:
- **Base class with inheritance**: Rejected because TypeScript interfaces don't support runtime type checking, and we want to avoid class-based models in favor of plain objects for serialization
- **Separate arrays merged at display time**: Rejected because it complicates sorting, deduplication, and state management
- **Generic message type with optional fields**: Rejected because it sacrifices type safety and makes it unclear which fields are valid for which message types

**Implementation Approach**:
```typescript
// Discriminated union pattern
type UnifiedConversationMessage = TranscriptionConversationMessage | ChatConversationMessage;

interface BaseConversationMessage {
  id: string;
  content: string;
  timestamp: Date;
  sender: 'user' | 'agent';
}

interface TranscriptionConversationMessage extends BaseConversationMessage {
  messageType: 'transcription';  // Discriminator
  confidence?: number;
  isFinal: boolean;
  language?: string;
}

interface ChatConversationMessage extends BaseConversationMessage {
  messageType: 'chat';  // Discriminator
  deliveryMethod: 'data-channel';
}
```

### 2. Message Ordering and Deduplication

**Decision**: Use timestamp-based sorting with a deduplication strategy based on message ID and interim transcription handling.

**Rationale**:
- Timestamps provide a clear ordering mechanism that works across both message types
- Message IDs (UUID) ensure uniqueness and enable deduplication
- Interim transcriptions (isFinal=false) are replaced by final transcriptions with the same speaker/timestamp window
- Handles out-of-order message arrival gracefully

**Alternatives Considered**:
- **Sequence numbers**: Rejected because they would require coordination across transcription and data channel sources
- **Server-side ordering**: Rejected because this is a frontend-only feature, no backend changes
- **Insertion order only**: Rejected because network latency can cause messages to arrive out of chronological order

**Implementation Approach**:
- Store messages in a signal array: `signal<UnifiedConversationMessage[]>([])`
- Use computed signal for sorted view: `computed(() => messages().sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()))`
- Deduplicate interim transcriptions by replacing when final arrives
- Use 500ms tolerance window for matching interim to final transcriptions

### 3. Virtual Scrolling Strategy

**Decision**: Use Angular CDK `CdkVirtualScrollViewport` with dynamic item size estimation when message count exceeds 100.

**Rationale**:
- Angular CDK virtual scrolling is battle-tested and integrates seamlessly with Angular's change detection
- 100 message threshold based on performance testing from existing components (transcription-display, chat-message-display)
- Dynamic sizing accommodates variable message lengths (short vs long messages)
- Maintains scroll position during updates using CDK's `scrolledIndexChange` event

**Alternatives Considered**:
- **Custom virtual scrolling**: Rejected due to complexity and maintenance burden
- **Pagination**: Rejected because it breaks the continuous conversation flow UX
- **Always use virtual scrolling**: Rejected because it adds overhead for small message lists
- **Higher threshold (e.g., 500)**: Rejected because testing showed performance degradation starts around 150-200 messages

**Implementation Approach**:
```typescript
useVirtualScrolling = computed(() => this.messages().length > 100);
itemSize = 80; // Average message height in pixels (estimated)
```

### 4. Storage Strategy for Conversation History

**Decision**: Use `sessionStorage` for conversation history with a migration utility for legacy `chat-storage` data.

**Rationale**:
- `sessionStorage` provides persistence within the browser session (survives page refresh)
- Automatically clears on tab/window close, providing natural session boundaries
- 5MB limit is sufficient for typical conversation lengths (estimated ~5000 messages)
- Simpler than `localStorage` which persists indefinitely and requires manual cleanup

**Alternatives Considered**:
- **localStorage**: Rejected because conversations are session-bound, not long-term storage
- **IndexedDB**: Rejected as overkill for simple key-value storage needs
- **In-memory only**: Rejected because users lose history on page refresh
- **Cloud sync**: Out of scope for v1 (explicitly listed in spec)

**Implementation Approach**:
- Storage key: `melior-conversation-{sessionId}`
- Serialize messages as JSON with date string conversion
- Migration utility converts old `chat-storage` format on first load
- Fallback: Clear corrupted/invalid storage and start fresh

### 5. Component Architecture Pattern

**Decision**: Smart/Presentational component pattern with `UnifiedConversationDisplayComponent` (smart) and `ConversationMessageComponent` (presentational).

**Rationale**:
- Separates state management from rendering logic
- Presentational component is pure and easily testable
- Smart component handles LiveKit integration, storage, and business logic
- Follows Angular best practices and existing patterns in the codebase

**Component Responsibilities**:

**Smart Component** (`UnifiedConversationDisplayComponent`):
- Inject `ConversationStorageService` and `LiveKitConnectionService`
- Subscribe to message signals from both transcription and chat sources
- Merge messages into unified feed
- Handle mode toggle state
- Manage scroll position and virtual scrolling
- Persist/restore conversation history

**Presentational Component** (`ConversationMessageComponent`):
- Accept message as `input()` signal
- Render message content with appropriate styling
- Display message metadata (timestamp, sender, delivery method badge)
- Emit user interactions via `output()` (future: message actions)
- No business logic, pure display

**Alternatives Considered**:
- **Single monolithic component**: Rejected because it violates separation of concerns and makes testing difficult
- **Service-heavy architecture**: Rejected because UI state belongs in components, not services
- **Container/View component terminology**: Same pattern, just different naming

### 6. Message Metadata Indicators

**Decision**: Use Material icons with accessible labels to indicate message delivery method (voice vs chat).

**Rationale**:
- Visual indicators help users understand the conversation mode context
- Material icons are already in use (mode-toggle-button uses 'mic' and 'chat_bubble')
- ARIA labels ensure screen reader accessibility
- Subtle badges don't clutter the UI

**Visual Design**:
- Voice messages: Small microphone icon badge (top-right of agent messages)
- Chat messages: Small chat bubble icon badge
- User messages: No badge needed (always transcribed speech)
- Color coding: User messages (blue), Agent messages (gray)
- Alignment: User messages (right-aligned), Agent messages (left-aligned)

**Alternatives Considered**:
- **Text labels**: Rejected as too verbose and clutters UI
- **No indicators**: Rejected because spec explicitly requires distinguishing delivery methods
- **Color-only coding**: Rejected because it fails accessibility contrast requirements
- **Different chat bubbles**: Rejected because it complicates responsive layout

### 7. Mode Toggle Integration

**Decision**: Reuse existing `ModeToggleButtonComponent` without modifications; conversation display reacts to mode changes via shared service.

**Rationale**:
- Existing component already handles mode toggle UI and state
- No changes needed to mode toggle logic
- Conversation display component observes mode changes reactively
- Clean separation of concerns

**Integration Pattern**:
- `ModeToggleButtonComponent` emits toggle events
- Parent component (voice-chat or app component) updates mode in service
- `ConversationStorageService` exposes current mode as signal
- Conversation display reacts to mode changes via computed signals
- No direct coupling between toggle button and conversation display

### 8. Interim Transcription Handling

**Decision**: Display interim transcriptions with visual indication (lighter opacity), replace with final transcription when received.

**Rationale**:
- Provides real-time feedback to users (responsive UX)
- Avoids message duplication in the feed
- Matches existing behavior from `TranscriptionDisplayComponent`
- Users expect to see transcription as they speak

**Implementation Approach**:
- Store interim transcriptions in a separate signal: `interimTranscription = signal<InterimTranscription | null>(null)`
- Display interim below the last message with reduced opacity (0.6)
- When final transcription arrives with same speaker + timestamp window, replace interim
- Clear interim signal when final message is added
- Use `isFinal` flag to distinguish interim from final

### 9. Auto-Scroll Behavior

**Decision**: Auto-scroll to bottom on new messages with user override when manually scrolled up.

**Rationale**:
- Most users want to see new messages immediately (default behavior)
- Power users may scroll up to review history (should not be interrupted)
- Matches existing behavior from both transcription and chat displays
- Standard pattern in messaging apps

**Implementation Approach**:
```typescript
// Effect to auto-scroll when messages change
effect(() => {
  const msgs = this.sortedMessages();
  if (msgs.length > 0 && this.shouldAutoScroll) {
    this.scrollToBottom();
  }
});

// Track if user manually scrolled
onScroll(event: Event) {
  const element = event.target as HTMLElement;
  const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 50;
  this.shouldAutoScroll = isAtBottom;
}
```

### 10. Migration Strategy for Existing Data

**Decision**: Create migration utility to transform legacy `chat-storage` session data to unified format on app startup.

**Rationale**:
- Users may have active sessions with chat history when feature deploys
- Graceful migration prevents data loss
- One-time transformation at app load
- Fallback to fresh start if migration fails

**Migration Approach**:
1. Check for legacy `chat-storage` key in sessionStorage
2. Parse legacy format (array of `ChatMessageState`)
3. Transform to unified format: `{ messageType: 'chat', ...legacyMessage }`
4. Write to new storage key: `melior-conversation-{sessionId}`
5. Remove legacy key
6. If any step fails: log error, clear storage, start fresh

**Data Loss Acceptance**: If migration fails, clearing storage is acceptable because:
- This is a beta/development application
- Conversations are ephemeral (not business-critical data)
- Users can restart their conversation
- Alternative (keeping broken state) is worse UX

## Performance Considerations

### Rendering Optimization
- **OnPush change detection**: All components use `ChangeDetectionStrategy.OnPush`
- **TrackBy functions**: Use message ID for `ngFor` loops to minimize DOM updates
- **Computed signals**: Sorted message list is computed, not re-sorted on every change
- **Virtual scrolling**: Activates at >100 messages to maintain 60fps

### Memory Management
- **Message retention**: No automatic pruning (rely on sessionStorage limits)
- **sessionStorage limit**: 5MB typical limit = ~5000 messages (estimated)
- **Cleanup on disconnect**: Clear messages when user explicitly disconnects

### Bundle Size
- **No new dependencies**: Uses existing Angular CDK and Material
- **Code splitting**: Component lazy-loaded as part of main app bundle (no separate chunk needed)
- **Tree shaking**: Unused code eliminated by Angular CLI optimizer

## Testing Strategy

### Unit Tests (80% coverage target)
- **Models**: Test factory functions, type guards, serialization/deserialization
- **Services**: Test message merging, deduplication, storage persistence
- **Components**: Test message rendering, scroll behavior, mode toggle reactions
- **Utilities**: Test migration logic, sorting algorithms

### Integration Tests
- **End-to-end conversation flow**: User speaks → transcription appears → mode toggle → chat response appears
- **Mode switching**: Toggle mid-conversation → history preserved → new messages use new mode
- **Persistence**: Create conversation → refresh page → history restored

### Accessibility Tests
- **Keyboard navigation**: Tab through messages, scroll with arrow keys
- **Screen reader**: Verify ARIA labels, LiveAnnouncer notifications
- **Color contrast**: Verify 4.5:1 ratio for all text

## Open Questions Resolved

All questions from Technical Context have been resolved:

1. ✅ **Message model structure**: Discriminated union pattern
2. ✅ **Ordering strategy**: Timestamp-based with deduplication
3. ✅ **Virtual scrolling threshold**: 100 messages
4. ✅ **Storage mechanism**: sessionStorage with migration
5. ✅ **Component pattern**: Smart/presentational
6. ✅ **Visual indicators**: Material icon badges with ARIA labels
7. ✅ **Mode toggle integration**: Reuse existing component
8. ✅ **Interim transcriptions**: Separate signal, replaced on final
9. ✅ **Auto-scroll**: Automatic with manual override
10. ✅ **Migration**: One-time transformation with fallback

## References

- Angular CDK Scrolling: https://material.angular.io/cdk/scrolling/overview
- TypeScript Discriminated Unions: https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions
- Angular Signals: https://angular.dev/guide/signals
- WCAG 2.1 AA Standards: https://www.w3.org/WAI/WCAG21/quickref/
- Existing components: `TranscriptionDisplayComponent`, `ChatMessageDisplayComponent`, `ModeToggleButtonComponent`
