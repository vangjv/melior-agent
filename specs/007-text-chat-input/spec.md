# Feature Specification: Text Chat Input

**Feature Branch**: `007-text-chat-input`  
**Created**: October 30, 2025  
**Status**: Draft  
**Input**: User description: "Implement a new feature to enable the user to chat via text instead of voice. The user experience should be like any other messaging app where there is a text box at the bottom of the history that the user can type in and send the message. This option should always be available whether in chat mode or voice mode. When the user sends the message, the agent should bypass the speech to text capability and either response via speech or text based on voice/text mode."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Send Text Message (Priority: P1)

A user wants to type a message and send it directly to the agent without using voice input, regardless of whether they're in voice mode or chat mode.

**Why this priority**: This is the core value proposition of the feature. Users need the ability to input text as an alternative to speaking. Without this, the feature cannot deliver any value.

**Independent Test**: Can be fully tested by typing a message in the text input field, clicking send, and verifying that the message appears in the conversation history and the agent receives and responds to it. Delivers immediate value by providing a text input alternative.

**Acceptance Scenarios**:

1. **Given** the user is viewing the conversation interface, **When** they look at the bottom of the screen, **Then** they see a text input field with a send button
2. **Given** the user types a message in the text input field, **When** they click the send button or press Enter, **Then** the message appears in the conversation history as a user message
3. **Given** the user sends a text message in voice mode, **When** the agent receives the message, **Then** the agent responds via synthesized speech (which is also transcribed in the conversation)
4. **Given** the user sends a text message in chat mode, **When** the agent receives the message, **Then** the agent responds with text that appears in the conversation history
5. **Given** the user has typed a message, **When** they send it, **Then** the text input field clears and is ready for the next message

---

### User Story 2 - Text Input Always Available (Priority: P1)

A user wants the text input to be available at all times, whether they're in voice mode, chat mode, connected, or disconnected.

**Why this priority**: Essential for feature usability. The text input must be persistent and accessible in all application states. Without this, users can't rely on text input as a consistent interaction method.

**Independent Test**: Can be tested by verifying the text input is visible and functional across all application states (voice mode, chat mode, connected, disconnected). Delivers value through consistent availability.

**Acceptance Scenarios**:

1. **Given** the user is connected in voice mode, **When** viewing the interface, **Then** the text input field is visible and functional
2. **Given** the user is connected in chat mode, **When** viewing the interface, **Then** the text input field is visible and functional
3. **Given** the user is disconnected from the agent, **When** viewing the interface, **Then** the text input field is visible but disabled with a message indicating connection is required
4. **Given** the user switches between voice and chat modes, **When** the mode changes, **Then** the text input remains visible and maintains any text in progress

---

### User Story 3 - Bypass Speech-to-Text for Typed Messages (Priority: P1)

A user types and sends a text message and expects the agent to receive it immediately as text, without any speech-to-text processing delay or transcription step.

**Why this priority**: Critical for performance and accuracy. Text messages should bypass the STT pipeline entirely to avoid unnecessary latency and potential transcription errors.

**Independent Test**: Can be tested by sending a text message and verifying it appears instantly in the conversation without waiting for STT processing. Delivers value through faster, more accurate message delivery for typed input.

**Acceptance Scenarios**:

1. **Given** the user types and sends a text message, **When** the message is sent, **Then** it appears in the conversation immediately without STT processing delay
2. **Given** the user sends a text message, **When** the agent receives it, **Then** the message content matches exactly what was typed (no transcription errors)
3. **Given** the user is currently speaking (voice input active), **When** they send a text message, **Then** the text message takes priority and is sent without waiting for speech to complete
4. **Given** the LiveKit agent receives the message, **When** processing it, **Then** the agent treats it as a direct text input bypassing VAD and STT components

---

### User Story 4 - Text Input Enhancements (Priority: P2)

A user wants basic text input features like multi-line support, keyboard shortcuts, and visual feedback to make typing messages feel like a modern messaging app.

**Why this priority**: Improves usability and user experience but builds upon the core text input functionality (P1). These enhancements make the feature more polished but aren't required for basic functionality.

**Independent Test**: Can be tested by using various keyboard shortcuts and text input features to verify they work as expected. Delivers value through improved text input UX.

**Acceptance Scenarios**:

1. **Given** the user is typing a message, **When** they press Enter alone, **Then** the message is sent
2. **Given** the user is typing a message, **When** they press Shift+Enter, **Then** a new line is added within the message (multi-line support)
3. **Given** the user has typed nothing in the text input, **When** viewing the send button, **Then** it is disabled to prevent sending empty messages
4. **Given** the user is typing a message, **When** the text input field is active, **Then** a visual indicator (border color, shadow) shows it has focus
5. **Given** the user has long message text, **When** typing, **Then** the text input field expands vertically (up to a maximum height) before scrolling

---

### User Story 5 - Mobile Text Input Optimization (Priority: P2)

A user on a mobile device wants to use the text input with an optimized keyboard experience and proper layout handling.

**Why this priority**: Enhances mobile experience which is critical for a messaging app, but builds on core text input functionality. Mobile users need special considerations for keyboard and layout.

**Independent Test**: Can be tested by using the text input on various mobile devices and verifying keyboard behavior and layout responsiveness. Delivers value through improved mobile UX.

**Acceptance Scenarios**:

1. **Given** the user is on a mobile device, **When** they tap the text input field, **Then** the device keyboard appears and the input field scrolls into view above the keyboard
2. **Given** the mobile keyboard is open, **When** the user types, **Then** the text input field remains visible and not covered by the keyboard
3. **Given** the user is typing on mobile, **When** they tap outside the text input, **Then** the keyboard dismisses and the layout returns to normal
4. **Given** the text input is at the bottom of the screen, **When** the keyboard opens, **Then** the conversation history remains scrollable above the input area
5. **Given** the user rotates their device, **When** the orientation changes, **Then** the text input layout adapts appropriately without losing typed content

---

### User Story 6 - Send Indicator and Error Handling (Priority: P3)

A user wants to know when their message is being sent and receive clear feedback if the message fails to send.

**Why this priority**: Important for user confidence and error recovery but not critical for basic functionality. Users should know message delivery status but this is lower priority than core sending capability.

**Independent Test**: Can be tested by monitoring UI state changes during message sending and simulating network failures. Delivers value through better user feedback.

**Acceptance Scenarios**:

1. **Given** the user clicks send, **When** the message is being transmitted, **Then** the send button shows a sending state (e.g., loading spinner)
2. **Given** the message is successfully delivered, **When** the agent acknowledges receipt, **Then** the send button returns to normal state
3. **Given** the message fails to send due to network error, **When** the failure occurs, **Then** the user sees an error message with an option to retry
4. **Given** the user is disconnected, **When** they attempt to send a message, **Then** they receive immediate feedback that sending is not possible until reconnected

---

### Edge Cases

- What happens when the user sends a very long text message (several paragraphs)?
- How does the system handle rapid successive message sending (spam prevention)?
- What occurs if the user types a message, loses connection, then reconnects - should the typed message persist?
- How does text input behave when the user is simultaneously receiving a voice response?
- What happens if special characters, emojis, or non-Latin scripts are typed?
- How does the input handle paste operations with formatted text or large content?
- What occurs when the agent is processing a previous message and the user sends another text message?
- How does the system handle the user switching from typing mid-message to using voice input?

## Constitutional Compliance *(mandatory)*

**Angular Architecture**: 
- Use standalone components exclusively
- Create a new text input component as a presentational component
- Integrate text input with existing conversation state management using Angular Signals
- Use smart/presentational pattern: smart component manages message sending logic, presentational component handles input UI
- All components must use OnPush change detection strategy
- Text input component should emit output events for message sending

**Type Safety**: 
Define strict TypeScript interfaces for:
- Text message model that distinguishes between voice transcription and typed text input
- Input state (focused, disabled, sending, error)
- Message source type (voice vs. typed)
- Send button state (idle, sending, error)

**Testing Strategy**: 
- Unit tests for text input component (rendering, user interactions, state changes)
- Unit tests for message sending service methods
- Integration tests for text message flow from input to conversation display
- Test keyboard event handling (Enter, Shift+Enter, focus/blur)
- Test mobile keyboard behavior and viewport adjustments
- Test message validation (empty, too long, special characters)
- Test state transitions (idle → sending → success/error)

**Performance Requirements**: 
- Text input component must use OnPush change detection
- Debounce any expensive operations like character counting
- Virtual scrolling for conversation history must accommodate text input at bottom
- No performance degradation when rapidly typing or pasting large content

**Accessibility Standards**: 
- Text input must have proper ARIA labels and roles
- Send button must be keyboard accessible and have clear focus indicators
- Error messages must be announced to screen readers
- Support for high contrast mode and custom text sizing
- Proper semantic HTML (textarea, button, form structure)
- Focus management when keyboard appears/disappears on mobile

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a text input field visible at the bottom of the conversation interface at all times
- **FR-002**: Text input field MUST support multi-line text entry (expandable textarea up to maximum 5 lines)
- **FR-003**: System MUST provide a send button adjacent to the text input field
- **FR-004**: Send button MUST be disabled when text input is empty (no whitespace-only messages)
- **FR-005**: System MUST send text message when user clicks send button or presses Enter key
- **FR-006**: System MUST insert a new line when user presses Shift+Enter
- **FR-007**: System MUST clear text input field after successfully sending a message
- **FR-008**: Text messages MUST bypass speech-to-text processing and be sent directly to the agent
- **FR-009**: System MUST indicate message source (typed text vs. voice transcription) in the message model
- **FR-010**: Text input MUST remain available and visible when switching between voice and chat modes
- **FR-011**: When disconnected, text input MUST be disabled with clear visual indication
- **FR-012**: System MUST provide visual feedback during message sending (loading state on send button)
- **FR-013**: System MUST handle send failures gracefully with error messages and retry options
- **FR-014**: On mobile devices, text input MUST remain visible above the keyboard when keyboard is active
- **FR-015**: System MUST support standard text input operations (copy, paste, cut, undo, redo)
- **FR-016**: System MUST preserve text input focus after sending a message (cursor ready for next message)
- **FR-017**: LiveKit agent MUST receive text messages via data channel and process them as user input
- **FR-018**: Agent response mode (voice or chat) MUST be respected for text input messages same as voice input

### Key Entities

- **TextInputState**: Represents the current state of the text input (value, focused, disabled, sending, error, placeholder)
- **TextMessage**: Represents a typed text message with source indicator, content, timestamp, and send status
- **SendButtonState**: Represents the send button state (idle, sending, success, error)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can compose and send a text message in under 5 seconds from focusing the input field
- **SC-002**: Text messages appear in the conversation history immediately upon clicking send (within 100ms)
- **SC-003**: Agent receives and responds to text messages with the same latency as voice messages (within 2 seconds)
- **SC-004**: 100% of typed text is delivered accurately without transcription errors (no STT processing)
- **SC-005**: Text input remains functional and responsive during simultaneous voice activity
- **SC-006**: Mobile users can type and send messages without keyboard obstructing the conversation view
- **SC-007**: Send button accurately reflects message sending state transitions in 100% of cases
- **SC-008**: Users can successfully send multi-line messages without confusion about Enter key behavior

## Assumptions

1. **Existing Infrastructure**: The application already has:
   - Unified conversation display from feature 005
   - LiveKit agent connection and data channel communication
   - Voice and chat mode toggle from feature 003
   - Message model supporting both user and agent messages

2. **Message Transport**: Text messages will be sent via LiveKit data channel (same mechanism currently used for mode toggle and chat chunks)

3. **Agent Message Protocol**: A new message type will be added to the data channel protocol to distinguish typed text input from voice transcription

4. **Input Placement**: Text input will be positioned at the bottom of the screen, above any navigation or status bars, below the scrollable conversation history

5. **Character Limits**: Text messages will have a reasonable maximum length (e.g., 5000 characters) to prevent abuse and ensure agent processing performance

6. **Network Handling**: Message sending will use the existing connection management and retry logic from the LiveKit service

7. **Focus Management**: The text input will automatically receive focus after sending a message to enable rapid message composition

8. **Mobile Keyboard**: The application will rely on CSS viewport units (vh, dvh) and Angular CDK to handle mobile keyboard overlay behavior

## Out of Scope

1. **Rich Text Formatting**: Bold, italic, links, or other text formatting (plain text only for initial implementation)
2. **File Attachments**: Sending images, documents, or other file types
3. **Message Editing**: Ability to edit or delete sent messages
4. **Draft Persistence**: Saving unsent message drafts across sessions or page refreshes
5. **Typing Indicators**: Showing when the user is typing to the agent
6. **Read Receipts**: Indicating when messages have been read or processed by the agent
7. **Message Threading**: Replying to specific messages or creating message threads
8. **Voice-to-Text Toggle**: Converting voice messages to text or vice versa after sending
9. **Autocomplete/Suggestions**: Predictive text or message suggestions while typing
10. **Offline Queueing**: Queueing messages to send when connection is restored (messages fail immediately if disconnected)

## Dependencies

1. **Feature 005 (Unified Conversation)**: Text messages must integrate with the unified conversation display and message model
2. **Feature 003 (Voice/Chat Mode Toggle)**: Agent response mode must be respected when responding to text messages
3. **LiveKit Data Channel**: Existing data channel infrastructure must support bidirectional message passing
4. **LiveKit Agent**: Agent code must be modified to receive and process text messages from data channel
5. **Angular Material**: Form components (textarea, button) will use Angular Material for consistent styling
6. **Angular CDK**: Overlay module may be needed for mobile keyboard handling

## Risks

1. **Message Ordering**: Text messages sent in rapid succession might arrive out of order or interleaved with voice transcriptions
   - **Mitigation**: Implement client-side message sequencing with timestamps

2. **Mobile Keyboard Layout**: Different mobile browsers handle keyboard overlays differently, potentially causing layout issues
   - **Mitigation**: Test across major mobile browsers (Safari iOS, Chrome Android) and implement CSS-based keyboard detection

3. **Agent Protocol Extension**: Adding new message type to data channel protocol may require careful version handling
   - **Mitigation**: Design protocol extension to be backward compatible and version-aware

4. **Focus Stealing**: Auto-focusing text input after sending might interfere with users trying to scroll conversation history
   - **Mitigation**: Make auto-focus configurable or detect user scroll intent

5. **Voice Interruption**: Unclear how text input should interact with active voice input (user currently speaking)
   - **Mitigation**: Define clear precedence rules (text message sends immediately and may interrupt voice input)

## Notes

- The text input provides an alternative input method but does not replace voice input
- Users can freely mix voice and text input in the same conversation
- The input method (voice vs. text) is independent of the response mode (voice vs. chat)
- Text input should feel as responsive and immediate as typing in any modern messaging app
- The send button should provide clear visual feedback for all state transitions
- Mobile experience is particularly important since this is a mobile-first application
