# Feature Specification: Unified Conversation Experience

**Feature Branch**: `005-unified-conversation`  
**Created**: October 26, 2025  
**Status**: Draft  
**Input**: User description: "I want to unify the conversation experience. Currently the chat window is separate from the voice/conversation window even though it's the same conversation. I want the transcription of the chat and the response to exist in the same conversation window whether the response is voice and transcribed or chat. The user should be able to toggle and the only difference is the response from the agent is voice or chat."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Unified Conversation Feed (Priority: P1)

A user wants to see all conversation exchanges (both their spoken words and the agent's responses) in a single chronological message feed, regardless of whether responses are delivered via voice or text chat.

**Why this priority**: This is the core value proposition of the feature. Users need a single source of truth for the conversation history. Without this, the feature cannot be validated.

**Independent Test**: Can be fully tested by initiating a conversation, speaking to the agent, receiving a response (in any mode), and verifying that both the user's transcribed speech and the agent's response appear in a single unified message list. Delivers immediate value by consolidating conversation history.

**Acceptance Scenarios**:

1. **Given** the user is connected to the agent in voice mode, **When** the user speaks and the agent responds with voice, **Then** both the user's transcribed speech and the agent's transcribed voice response appear in the unified conversation feed
2. **Given** the user is connected to the agent in chat mode, **When** the user speaks and the agent responds with text, **Then** both the user's transcribed speech and the agent's text response appear in the unified conversation feed
3. **Given** multiple conversation turns have occurred, **When** viewing the conversation feed, **Then** all messages are displayed in chronological order with clear visual distinction between user and agent messages
4. **Given** a conversation is in progress, **When** new messages arrive, **Then** the conversation feed auto-scrolls to show the most recent message

---

### User Story 2 - Toggle Response Mode Mid-Conversation (Priority: P1)

A user wants to switch between voice and chat response modes during an active conversation without losing conversation history or context.

**Why this priority**: This enables the core use case of seamless mode switching. Users must be able to change their preference dynamically based on their environment (e.g., moving from a private space to a public space).

**Independent Test**: Can be tested by starting a conversation in voice mode, toggling to chat mode, continuing the conversation, and verifying that all previous messages remain visible and new responses arrive via chat. Delivers value by providing flexibility without disrupting the conversation flow.

**Acceptance Scenarios**:

1. **Given** the user is in an active conversation in voice mode, **When** the user toggles to chat mode, **Then** all previous conversation history remains visible in the unified feed
2. **Given** the user switches from voice to chat mode, **When** the agent sends the next response, **Then** the response appears as text in the conversation feed (not as transcribed audio)
3. **Given** the user switches from chat to voice mode, **When** the agent sends the next response, **Then** the response is delivered as audio and also transcribed in the conversation feed
4. **Given** the user toggles mode, **When** the mode change completes, **Then** a visual indicator shows the current active mode (e.g., button label or icon)

---

### User Story 3 - Distinguish Message Types Visually (Priority: P2)

A user wants to easily identify which messages are from them vs. the agent, and understand whether an agent response was delivered via voice or text.

**Why this priority**: Essential for conversation clarity and user orientation. Helps users understand the conversation flow and current mode. Can be tested independently of core message delivery.

**Independent Test**: Can be tested by examining the conversation feed with mixed message types and verifying that visual styling clearly distinguishes user messages from agent messages, and optionally indicates the delivery method. Delivers value by improving conversation readability.

**Acceptance Scenarios**:

1. **Given** the conversation feed contains both user and agent messages, **When** viewing the feed, **Then** user messages and agent messages have distinct visual styling (e.g., different background colors, alignment, or icons)
2. **Given** an agent message was delivered via voice (transcribed), **When** viewing the message, **Then** an optional visual indicator (icon or badge) shows it was a voice response
3. **Given** an agent message was delivered via text chat, **When** viewing the message, **Then** an optional visual indicator shows it was a text response
4. **Given** the conversation feed has many messages, **When** scrolling through history, **Then** visual distinctions remain clear and accessible

---

### User Story 4 - Preserve Conversation History Across Sessions (Priority: P3)

A user wants their conversation history to persist when disconnecting and reconnecting, so they can review previous exchanges without losing context.

**Why this priority**: Important for long-term usability and user confidence, but not critical for the initial unified conversation experience. Builds on top of core conversation display.

**Independent Test**: Can be tested by having a conversation, disconnecting, reconnecting, and verifying that previous conversation history is restored. Delivers value by maintaining context across sessions.

**Acceptance Scenarios**:

1. **Given** the user has had a conversation with the agent, **When** the user disconnects and then reconnects, **Then** the previous conversation history is displayed in the unified feed
2. **Given** the user reconnects to a new session, **When** viewing the conversation feed, **Then** a visual separator or timestamp indicates the boundary between old and new session messages
3. **Given** the conversation history is persisted, **When** the user clears their browser data or explicitly clears history, **Then** the conversation feed starts fresh
4. **Given** the user has very long conversation history, **When** loading the conversation feed, **Then** older messages load efficiently (e.g., via virtual scrolling or pagination)

---

### Edge Cases

- What happens when the user speaks while the agent is still delivering a voice response?
- How does the system handle rapid mode toggling (switching back and forth quickly)?
- What occurs if a transcription arrives out of order (delayed transcription for an earlier utterance)?
- How does the unified feed handle very long agent responses (streaming text or extended audio)?
- What happens when the connection drops mid-conversation - how is history preserved?
- How does the system handle simultaneous user and agent speech (overlapping transcriptions)?
- What occurs if transcription confidence is very low - should the message still appear?
- How does the feed behave when the user switches between devices mid-conversation?

## Constitutional Compliance *(mandatory)*

**Angular Architecture**: 
- Use standalone components exclusively
- Create a new unified conversation display component that replaces separate transcription and chat displays
- Implement Angular Signals for state management of conversation messages, response mode, and UI state
- Use smart/presentational pattern: smart component manages conversation state, presentational component renders unified feed
- All components must use OnPush change detection strategy

**Type Safety**: 
Define strict TypeScript interfaces for:
- Unified conversation message model (combines transcription and chat message types)
- Message metadata (delivery method, speaker, timestamp, confidence)
- Conversation state (message list, current mode, connection status)
- Mode toggle state (current mode, pending transition)
- Message rendering configuration (visual styling, icons, badges)

**Testing Strategy**: 
- TDD approach for unified conversation component
- Unit test coverage target: 80% minimum
- Test scenarios:
  - Message rendering for both user and agent messages
  - Message ordering and chronological display
  - Mode toggle effects on message delivery and display
  - Auto-scroll behavior on new messages
  - Virtual scrolling performance with large message lists
  - Session history persistence and restoration
- Integration tests:
  - End-to-end conversation flow with mode switching
  - LiveKit integration with unified message display
  - Data channel message handling in unified feed

**Performance Requirements**: 
- Use OnPush change detection for all components
- Implement virtual scrolling (CDK) when conversation exceeds 100 messages
- Minimize re-renders by using signals and computed values
- Optimize trackBy functions for message lists
- Lazy load conversation history (if needed for very long conversations)
- Bundle size: stay within existing budget (500KB warning, 1MB error)

**Accessibility Standards**: 
- WCAG 2.1 AA compliance minimum
- Semantic HTML: use `<article>` or `<section>` for message containers
- ARIA labels for message sender, timestamp, and delivery method
- Screen reader announcements for new messages using LiveAnnouncer
- Keyboard navigation support for scrolling through conversation history
- Color contrast ratios meet WCAG AA standards (4.5:1 for normal text)
- Focus indicators for interactive elements (mode toggle button)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST merge transcription messages and chat messages into a single unified conversation feed
- **FR-002**: System MUST display all conversation messages in chronological order based on timestamp
- **FR-003**: System MUST visually distinguish user messages from agent messages in the unified feed
- **FR-004**: System MUST preserve conversation history when toggling between voice and chat response modes
- **FR-005**: System MUST display agent voice responses as transcribed text in the unified conversation feed
- **FR-006**: System MUST display agent chat responses as text messages in the unified conversation feed
- **FR-007**: System MUST auto-scroll to the most recent message when new messages arrive
- **FR-008**: System MUST persist conversation history in browser storage (sessionStorage or localStorage)
- **FR-009**: System MUST restore conversation history when reconnecting to a session
- **FR-010**: System MUST handle interim transcriptions without duplicating messages in the feed
- **FR-011**: System MUST use virtual scrolling when conversation exceeds 100 messages for performance
- **FR-012**: Users MUST be able to toggle between voice and chat modes using the existing mode toggle button
- **FR-013**: System MUST indicate the current response mode visually (via button state or other UI element)
- **FR-014**: System MUST update the conversation feed in real-time as messages arrive (via WebRTC or data channel)
- **FR-015**: System MUST maintain message ordering even when transcriptions arrive out of sequence
- **FR-016**: System MUST remove or consolidate the separate transcription-display and chat-message-display components into a single unified component

### Key Entities *(include if feature involves data)*

- **UnifiedConversationMessage**: Represents a single message in the conversation feed
  - Attributes: id, content, timestamp, sender (user/agent), deliveryMethod (voice/chat), confidence (optional), isFinal
  - Combines attributes from both TranscriptionMessage and ChatMessageState
  - Uses discriminated union pattern for type-safe message handling

- **ConversationFeed**: Collection of all messages in chronological order
  - Attributes: messages (array of UnifiedConversationMessage), currentMode (voice/chat), sessionId
  - Manages message ordering and deduplication
  - Persists to browser storage for session continuity

- **MessageMetadata**: Additional context for message display
  - Attributes: deliveryMethod, transcriptionConfidence, messageSource (WebRTC/DataChannel)
  - Used for visual indicators and debugging

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view their entire conversation history in a single unified feed, with both user speech and agent responses visible chronologically
- **SC-002**: Users can toggle between voice and chat response modes mid-conversation without losing any conversation history
- **SC-003**: 95% of messages appear in the correct chronological order within 500ms of arrival
- **SC-004**: Conversation feed loads and displays 500+ messages without performance degradation (no visible lag or jank)
- **SC-005**: Conversation history persists across disconnect/reconnect cycles for the duration of the browser session
- **SC-006**: Users can distinguish between user and agent messages at a glance (verified via accessibility and usability testing)
- **SC-007**: Auto-scroll to new messages works correctly 99% of the time without user intervention
- **SC-008**: Mode toggle completes within 1 second and immediately affects subsequent agent responses

## Context & Background *(optional)*

### Current State

The application currently has two separate display components:
- **TranscriptionDisplayComponent**: Shows real-time transcriptions of user speech and agent voice responses
- **ChatMessageDisplayComponent**: Shows text messages in chat mode

These components operate independently, creating a fragmented user experience where:
- Users cannot see the full conversation context
- Toggling between modes switches the entire display, hiding previous messages
- The same conversation appears in different UI elements depending on mode

### Desired State

A unified conversation experience where:
- All messages (transcribed speech and text chat) appear in a single feed
- Mode toggle only affects how the agent responds (voice TTS vs. text), not what the user sees
- Conversation history is preserved and visible regardless of current mode
- Users have a consistent mental model of "one conversation" rather than "two different interfaces"

### Related Features

- **001-voice-chat-transcription**: Established the transcription display component
- **003-voice-chat-mode**: Introduced the mode toggle functionality and separate chat display
- This feature unifies the work from both previous features into a cohesive experience

## Dependencies & Assumptions *(optional)*

### Technical Dependencies

- Existing LiveKit integration for WebRTC voice communication
- Existing data channel implementation for text chat messages
- Angular CDK ScrollingModule for virtual scrolling
- Browser storage APIs (sessionStorage/localStorage) for history persistence
- Angular Signals for reactive state management

### Assumptions

- Transcription messages and chat messages have compatible timestamp formats (can be sorted chronologically)
- Message IDs are unique across both transcription and chat message sources
- The existing mode toggle button component can be reused or minimally modified
- Browser storage has sufficient capacity for reasonable conversation lengths (assume max 5MB per session)
- Network latency does not cause significant message ordering issues (timestamps are sufficient)
- Users primarily access the app from a single device per session (no multi-device sync required in v1)

### Constraints

- Must maintain backward compatibility with existing LiveKit agent communication patterns
- Must not break existing authentication flow (004-entra-external-id-auth)
- Must stay within bundle size budget (500KB warning threshold)
- Must maintain 80%+ unit test coverage
- Must meet WCAG 2.1 AA accessibility standards

## Out of Scope *(optional)*

The following are explicitly NOT included in this feature:

- **Multi-device conversation sync**: Conversation history will not sync across different browsers or devices
- **Message editing or deletion**: Users cannot edit or delete messages from conversation history
- **Conversation search or filtering**: No search functionality within conversation history
- **Export or sharing**: Cannot export conversation transcripts or share with others
- **Rich media messages**: Only text-based messages; no images, files, or formatted content
- **Message reactions or threading**: No emoji reactions, replies, or threaded conversations
- **Conversation analytics**: No metrics, word counts, or sentiment analysis
- **Custom styling themes**: Users cannot customize message appearance beyond default light/dark mode
- **Message read receipts**: No indicators for whether messages have been read
- **Typing indicators**: No "agent is typing" or "user is speaking" indicators (covered by existing transcription interim state)

## Migration & Rollout *(optional)*

### Migration Strategy

**Phase 1: Component Consolidation**
1. Create new `UnifiedConversationDisplayComponent` that combines functionality from:
   - `TranscriptionDisplayComponent`
   - `ChatMessageDisplayComponent`
2. Create unified `ConversationMessage` model that encompasses both message types
3. Update `ChatStorageService` to handle unified message format

**Phase 2: Service Integration**
1. Modify `LiveKitConnectionService` to emit unified messages
2. Update data channel message handlers to use unified format
3. Implement message deduplication and ordering logic

**Phase 3: UI Integration**
1. Replace separate display components with unified component in main app template
2. Update routing and component composition
3. Ensure mode toggle button correctly updates display state

**Phase 4: Testing & Validation**
1. Run full test suite with unified components
2. Perform accessibility audit
3. Performance testing with large message counts
4. User acceptance testing

**Phase 5: Cleanup**
1. Remove deprecated `TranscriptionDisplayComponent` and `ChatMessageDisplayComponent`
2. Clean up unused models and service methods
3. Update documentation

### Rollout Approach

- **Feature flag**: None required (direct replacement)
- **A/B testing**: Not applicable (single-user experience)
- **Gradual rollout**: Deploy to staging environment first, then production after validation
- **Rollback plan**: Maintain previous components in codebase temporarily; can revert by switching component references if critical issues arise

### Data Migration

- **Existing session data**: Current sessionStorage format may need transformation
- **Migration script**: Create utility function to convert legacy message format to unified format on first load
- **Fallback**: If migration fails, clear session storage and start fresh (acceptable loss for beta users)

## Open Questions *(optional)*

None at this time. All requirements are sufficiently defined for planning phase.
