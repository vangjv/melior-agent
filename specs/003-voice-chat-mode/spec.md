# Feature Specification: Voice/Chat Response Mode Toggle

**Feature Branch**: `003-voice-chat-mode`  
**Created**: October 24, 2025  
**Status**: Draft  
**Input**: User description: "I've added the ability for my livekit agent to toggle back and forth between responding in voice and responding in chat/text message. I need you to create the specification for this to make changes to the angular app to add a toggle for chat and voice modes."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Toggle Response Mode (Priority: P1)

A user is in an active voice conversation with the agent and needs to switch to receiving text responses instead of voice (e.g., in a quiet environment or for accessibility). They want to toggle between voice and chat modes seamlessly without disconnecting.

**Why this priority**: This is the core value proposition of this feature. The ability to switch response modes is the minimum viable product that delivers immediate value to users who need flexibility in how they receive agent responses.

**Independent Test**: Can be fully tested by establishing a connection, clicking the mode toggle button, and verifying that the agent's response mode changes from voice to text (or vice versa). Delivers value by giving users control over response format.

**Acceptance Scenarios**:

1. **Given** the user is connected to the voice agent in voice mode, **When** the user clicks the mode toggle button to switch to chat mode, **Then** the UI updates to show "Chat Mode" and subsequent agent responses appear as text messages instead of audio
2. **Given** the user is connected in chat mode, **When** the user speaks, **Then** their speech is still transcribed and sent to the agent (input mode remains voice)
3. **Given** the user switches to chat mode, **When** the agent generates a response, **Then** the response appears as a text message in the chat display area
4. **Given** the user is in chat mode, **When** they toggle back to voice mode, **Then** the UI updates to show "Voice Mode" and subsequent agent responses are delivered as synthesized speech

---

### User Story 2 - View Mode Confirmation and Status (Priority: P1)

A user wants to know which response mode is currently active and receive confirmation when their mode change request is processed by the agent.

**Why this priority**: Essential for user confidence and preventing confusion about which mode is active. Users need immediate feedback to know their toggle action was successful, especially since there's a brief communication delay with the agent.

**Independent Test**: Can be tested by toggling modes and verifying that visual indicators clearly show the current mode and transition states. Delivers value through clear status communication.

**Acceptance Scenarios**:

1. **Given** the user clicks the mode toggle button, **When** the request is sent to the agent, **Then** the button shows a loading/pending state (e.g., "Switching...")
2. **Given** the mode change request is pending, **When** the agent confirms the mode change, **Then** the button returns to its normal state showing the new mode
3. **Given** the user is viewing the interface, **When** they look at the mode toggle, **Then** the current active mode is clearly indicated (e.g., icon, color, label)
4. **Given** a mode change request times out (no confirmation within 5 seconds), **When** the timeout occurs, **Then** the user sees an error message and the UI reverts to the last confirmed mode

---

### User Story 3 - Display Chat Messages (Priority: P2)

A user in chat mode wants to see a clear, readable display of the conversation with distinct visual separation between their transcribed speech and the agent's text responses.

**Why this priority**: Complements the mode toggle (P1) by providing the UI infrastructure for displaying text responses. Without this, chat mode would have no way to present responses to users. Depends on mode toggle being functional first.

**Independent Test**: Can be tested by switching to chat mode, having a conversation, and verifying messages display correctly with proper styling and scrolling. Delivers value by making text conversations readable and usable.

**Acceptance Scenarios**:

1. **Given** the user is in chat mode, **When** they speak and the agent responds, **Then** both the user's transcribed message and agent's text response appear in the chat display
2. **Given** multiple messages are displayed, **When** viewing the chat area, **Then** user messages and agent messages are visually distinguishable (e.g., different colors, alignments, or labels)
3. **Given** a long conversation is occurring, **When** new messages arrive, **Then** the chat display auto-scrolls to show the most recent message
4. **Given** messages include timestamps, **When** viewing the chat, **Then** each message shows when it was sent

---

### User Story 4 - Maintain Mode Across Connection Lifecycle (Priority: P2)

A user sets their preferred response mode (chat or voice) and experiences a connection interruption. They want the system to handle mode state consistently across disconnections and reconnections.

**Why this priority**: Important for user experience quality but builds upon the core toggle functionality (P1). Handles edge cases around connection stability without being critical to the basic feature.

**Independent Test**: Can be tested by setting a mode preference, disconnecting, reconnecting, and verifying mode state handling. Delivers value through predictable behavior during connection issues.

**Acceptance Scenarios**:

1. **Given** the user has selected chat mode, **When** they disconnect from the voice agent, **Then** the mode preference is retained in the UI
2. **Given** the user reconnects to the agent after disconnecting, **When** the connection is re-established, **Then** the system defaults to voice mode (agent default behavior)
3. **Given** the user has a preferred mode saved locally, **When** reconnecting, **Then** the system can automatically request the saved preferred mode after connection
4. **Given** the connection is lost unexpectedly, **When** the user reconnects, **Then** the mode state is reset to a known good state (voice mode) to prevent desync

---

### User Story 5 - Mobile-Optimized Mode Toggle (Priority: P3)

A user primarily accessing the app on their phone wants the mode toggle to be easily accessible and usable on small screens and touch interfaces.

**Why this priority**: Enhances the mobile experience which is the primary use case per the original app design, but not critical to the core functionality. Can be implemented after basic toggle works.

**Independent Test**: Can be tested by using the toggle on various mobile devices and screen sizes to verify accessibility and usability. Delivers value through improved mobile UX.

**Acceptance Scenarios**:

1. **Given** the user is on a mobile device, **When** they tap the mode toggle button, **Then** the button is large enough for comfortable touch interaction (minimum 44x44 pixels)
2. **Given** the user is viewing the app in portrait mode on a phone, **When** the mode toggle is displayed, **Then** it's positioned in a prominent, easily reachable location
3. **Given** the user switches to landscape mode, **When** viewing the toggle, **Then** it remains accessible without layout breaking
4. **Given** the user has large text accessibility settings enabled, **When** viewing the toggle, **Then** the mode labels scale appropriately while maintaining usability


### Edge Cases

- What happens when the mode change request is sent but the agent never responds with confirmation?
- How does the system handle rapid successive mode toggle clicks?
- What occurs if the user toggles mode while the agent is currently speaking?
- What happens when the connection is lost mid-mode-change?
- How does the system handle if the agent sends a chat message while in voice mode (desync scenario)?
- What occurs if the data channel becomes unavailable but the voice connection remains active?
- How does the UI behave if multiple chat messages arrive in rapid succession?
- What happens when the user toggles modes during transcription of their own speech?

## Constitutional Compliance *(mandatory)*

**Angular Architecture**: Use standalone components exclusively. Implement Angular Signals for state management of response mode (`voice` | `chat`), mode confirmation status, and chat message history. Create a dedicated service for managing data channel communication with the LiveKit agent. Follow the smart/presentational component pattern: smart components inject services and manage state, presentational components use `input()` and `output()` for data flow.

**Type Safety**: Define strict TypeScript interfaces for:
- Response mode types (`ResponseMode = 'voice' | 'chat'`)
- Data channel message schemas (SetResponseModeMessage, ResponseModeUpdatedMessage, ChatMessage)
- Agent data message union types
- Chat message state models (id, content, timestamp, sender)
- Mode toggle component state

**Testing Strategy**: 
- TDD approach for all new components and services
- Unit test coverage target: 80% minimum
- Test mode toggle component with various states (voice, chat, pending, error)
- Test data channel service message encoding/decoding and state transitions
- Test chat display component rendering and auto-scroll behavior
- Mock LiveKit Room and data channel APIs for isolated testing
- Integration tests for end-to-end mode switching with mocked agent responses

**Performance Requirements**: 
- Use OnPush change detection strategy for all components
- Implement virtual scrolling (Angular CDK) for chat message display if message count exceeds 100
- Debounce rapid mode toggle clicks (300ms) to prevent message flooding
- Use `computed()` signals for derived state (e.g., current mode status, button labels)
- Efficient message rendering: track messages by unique ID in templates

**Accessibility Standards**: 
- WCAG 2.1 Level AA compliance
- Mode toggle button includes ARIA labels indicating current mode
- Screen reader announcements when mode changes
- Keyboard navigation support for toggle button (Space/Enter)
- Sufficient color contrast for mode indicators
- Focus states clearly visible on toggle button
- Chat messages include semantic HTML with proper heading structure

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a mode toggle UI control that allows users to switch between voice and chat response modes during an active connection
- **FR-002**: System MUST send a `set_response_mode` message via the LiveKit data channel when the user changes modes, including the desired mode (`voice` or `chat`)
- **FR-003**: System MUST listen for `response_mode_updated` confirmation messages from the agent and update UI state accordingly
- **FR-004**: System MUST listen for `chat_message` data channel messages from the agent and display them in the UI when in chat mode
- **FR-005**: System MUST visually indicate the current response mode to the user at all times (voice or chat)
- **FR-006**: System MUST show a loading/pending state on the mode toggle button while waiting for agent confirmation
- **FR-007**: System MUST implement a timeout (5 seconds) for mode change confirmations and handle timeout with user feedback
- **FR-008**: System MUST display chat messages in a dedicated UI area with visual distinction between user (transcribed) and agent (text response) messages
- **FR-009**: System MUST auto-scroll the chat display to the newest message when new content arrives
- **FR-010**: System MUST prevent multiple concurrent mode change requests (disable toggle during pending state)
- **FR-011**: System MUST encode data channel messages as UTF-8 JSON with reliable delivery
- **FR-012**: System MUST decode incoming data channel messages and handle parsing errors gracefully
- **FR-013**: System MUST validate incoming message structure (required `type` field and type-specific fields)
- **FR-014**: System MUST default to voice mode when initially connecting to the agent
- **FR-015**: System MUST maintain chat message history during the active session
- **FR-016**: System MUST clear chat history when disconnecting from the agent
- **FR-017**: System MUST handle unknown or malformed data channel messages without crashing (log and continue)
- **FR-018**: System MUST persist user's preferred mode to browser storage (localStorage) for future sessions
- **FR-019**: System MUST debounce rapid toggle clicks to prevent message flooding
- **FR-020**: System MUST include timestamps on all chat messages (both user and agent)

### Key Entities *(include if feature involves data)*

- **ResponseMode**: Enumeration representing the current agent response delivery mode - either `voice` (synthesized audio) or `chat` (text message via data channel)
- **DataChannelMessage**: Base structure for all messages exchanged via LiveKit data channel, containing a `type` discriminator field
- **SetResponseModeMessage**: Message sent from frontend to agent requesting a mode change, containing `type: 'set_response_mode'` and `mode: ResponseMode`
- **ResponseModeUpdatedMessage**: Confirmation message sent from agent to frontend, containing `type: 'response_mode_updated'` and the confirmed `mode: ResponseMode`
- **ChatMessage**: Text response message sent from agent to frontend in chat mode, containing `type: 'chat_message'`, `message: string`, and `timestamp: number`
- **ChatMessageState**: UI state representation of a chat message for display, containing `id`, `content`, `timestamp`, and `sender` ('user' | 'agent')
- **ModeToggleState**: UI state tracking mode change status, containing `currentMode`, `isConfirmed`, and optional `pendingMode`

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can switch between voice and chat modes within 2 seconds of clicking the toggle button (includes network round-trip and agent confirmation)
- **SC-002**: Mode toggle accurately reflects the current mode with 100% consistency (no desyncs between UI and agent state)
- **SC-003**: Chat messages display correctly with proper sender attribution and timestamps in 100% of test scenarios
- **SC-004**: System handles network interruptions gracefully with mode state reset and clear user feedback in 100% of disconnection scenarios
- **SC-005**: Mode toggle button meets WCAG 2.1 Level AA accessibility standards with screen reader compatibility verified
- **SC-006**: Chat display can render and scroll 100+ messages without performance degradation (60fps maintained)
- **SC-007**: All data channel messages parse successfully with error handling preventing crashes in 100% of malformed data scenarios
- **SC-008**: Users can complete a full conversation in chat mode and switch back to voice mode without any errors in 95% of test sessions
- **SC-009**: Mode preference persistence works correctly across browser sessions in 100% of test cases
- **SC-010**: Mobile users can successfully use the mode toggle on screens as small as 320px width with touch targets meeting minimum size requirements

## Assumptions *(optional)*

- The LiveKit agent is already configured with the voice/chat mode toggle feature and will respond correctly to `set_response_mode` messages
- The LiveKit data channel is established and available when the room connection is active
- Users have granted microphone permissions as required by the existing voice chat functionality
- The existing transcription service will continue to capture user speech regardless of the selected response mode (only agent response delivery changes)
- Network conditions are generally stable enough for data channel messages to be delivered within the 5-second timeout window
- Users understand that switching to chat mode affects only how the agent responds, not how they input (voice input continues)
- Browser localStorage is available and accessible for storing user preferences

## Constraints *(optional)*

- Must maintain compatibility with existing LiveKit connection service and transcription service implementations
- Cannot modify the LiveKit agent implementation (agent-side behavior is already defined)
- Must work within the existing Angular 20 application architecture with standalone components and zoneless change detection
- Data channel message format is defined by the agent specification and cannot be changed
- Must maintain the existing responsive mobile-first design approach
- Cannot introduce new third-party dependencies beyond livekit-client SDK (already in use)
- Must not impact the performance of existing voice transcription features

## Dependencies *(optional)*

### Internal Dependencies
- Existing LiveKitConnectionService for room management and connection lifecycle
- Existing TranscriptionService for displaying user speech transcription
- LiveKit Room instance and data channel availability
- Existing Angular Material components for UI consistency

### External Dependencies
- LiveKit Client SDK v2.x data channel APIs (RoomEvent.DataReceived, publishData)
- LiveKit agent implementation with voice/chat mode toggle support (already implemented)
- Browser Web APIs: TextEncoder/TextDecoder for message encoding, localStorage for preferences

### Temporal Dependencies
- Must complete after the core voice chat connection feature (001-voice-chat-transcription) is stable
- Should integrate with any existing chat/message display components if they exist, otherwise create new ones
- Mode toggle UI should be added to the existing voice-chat component structure

## Out of Scope *(optional)*

### Explicitly Excluded
- Modifying the LiveKit agent implementation or behavior (agent changes are already complete)
- Adding text input for users to type messages (voice input only, per original requirement)
- Implementing message persistence across sessions (chat history is session-only)
- Adding message editing, deletion, or moderation features
- Implementing read receipts or typing indicators
- Supporting multiple simultaneous conversations or chat rooms
- Adding rich text formatting or emoji support in chat messages
- Implementing message search or filtering capabilities
- Creating admin controls for managing response modes
- Adding analytics or logging of mode usage patterns

### Future Considerations
- Enhanced chat features (typing indicators, read receipts)
- Message export functionality for saving conversations
- Rich text or markdown support in chat messages
- Voice and chat mode simultaneously (hybrid mode)
- User-initiated text input in addition to voice input
- Conversation history persistence and retrieval

## Related Features *(optional)*

- **001-voice-chat-transcription**: Core voice chat and transcription functionality that this feature extends
- **002-livekit-token-api**: Token generation service required for LiveKit connections
- Future potential feature: Enhanced chat UI with threading or message reactions
- Future potential feature: Conversation analytics and insights based on mode usage
