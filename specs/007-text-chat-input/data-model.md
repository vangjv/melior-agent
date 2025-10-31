# Data Model: Text Chat Input

**Feature**: 007-text-chat-input  
**Date**: 2025-10-30

## Overview

This document defines the TypeScript data models for the text chat input feature. The models extend the existing unified conversation message system (feature 005) to support text messages sent via typing rather than voice transcription. All models follow TypeScript strict mode conventions with readonly properties, discriminated unions, and type guards.

## 1. Message Source Extension

### 1.1 Message Source Type

Extends the existing `UnifiedConversationMessage` model to distinguish between voice transcription and typed text input sources.

```typescript
/**
 * Message input source type
 * Distinguishes how the user message was created
 */
export type MessageSource = 'voice' | 'text';
```

**Rationale**: While the existing model distinguishes between 'transcription' (voice) and 'chat' (data channel) message types, we need to also track the source of user messages specifically. Agent chat messages come via data channel but originate from LLM, while user text messages come via data channel but originate from typed input.

### 1.2 Extended User Message Model

We will extend the existing `ChatConversationMessage` to include source information for user messages:

```typescript
/**
 * User text message (typed input sent via data channel)
 * Extends ChatConversationMessage with source tracking
 */
export interface UserTextMessage extends ChatConversationMessage {
  readonly sender: 'user';          // Always 'user' for typed messages
  readonly source: 'text';          // Discriminates from voice transcription
}

/**
 * Type guard for user text messages
 */
export function isUserTextMessage(
  message: UnifiedConversationMessage
): message is UserTextMessage {
  return message.messageType === 'chat' && 
         message.sender === 'user';
}
```

**Rationale**: Builds upon existing model structure without breaking changes. User text messages are a specialization of chat messages with explicit source indication.

### 1.3 Message Factory Extension

```typescript
/**
 * Factory: Create user text message from typed input
 */
export function createUserTextMessage(
  content: string,
  timestamp: Date = new Date()
): UserTextMessage {
  return {
    id: crypto.randomUUID(),
    messageType: 'chat',
    content,
    timestamp,
    sender: 'user',
    source: 'text',
    deliveryMethod: 'data-channel'
  };
}
```

**Validation Rules**:
- `content`: Must be non-empty string, max 5000 characters, trimmed
- `timestamp`: Must be valid Date object
- `id`: Auto-generated UUID using `crypto.randomUUID()`

## 2. Text Input State Model

### 2.1 TextInputState Interface

Represents the complete state of the text input component.

```typescript
/**
 * Text input component state
 */
export interface TextInputState {
  readonly value: string;              // Current text content
  readonly isFocused: boolean;         // Whether input has focus
  readonly isDisabled: boolean;        // Whether input is disabled
  readonly placeholder: string;        // Placeholder text
  readonly characterCount: number;     // Current character count
  readonly maxCharacters: number;      // Maximum allowed characters (default 5000)
}

/**
 * Default text input state
 */
export const DEFAULT_TEXT_INPUT_STATE: TextInputState = {
  value: '',
  isFocused: false,
  isDisabled: false,
  placeholder: 'Type a message...',
  characterCount: 0,
  maxCharacters: 5000,
};
```

**State Transitions**:
- `value`: Updated on every keystroke (two-way binding)
- `isFocused`: `true` on focus event, `false` on blur
- `isDisabled`: `true` when disconnected or sending, `false` when connected and idle
- `characterCount`: Computed from `value.length`

**Validation Rules**:
- `value`: Cannot exceed `maxCharacters`
- `characterCount`: Must be non-negative integer
- `maxCharacters`: Must be positive integer (typically 5000)

### 2.2 TextInputConfig Interface

Configuration options for text input component behavior.

```typescript
/**
 * Text input component configuration
 */
export interface TextInputConfig {
  readonly minRows: number;           // Minimum textarea rows (default 1)
  readonly maxRows: number;           // Maximum textarea rows before scroll (default 5)
  readonly maxCharacters: number;     // Character limit (default 5000)
  readonly showCharacterCount: boolean; // Show count when approaching limit (default true)
  readonly characterCountThreshold: number; // Show count at % of max (default 0.9)
  readonly autoFocus: boolean;        // Auto-focus after sending (default true)
  readonly enterToSend: boolean;      // Enter key sends message (default true)
}

/**
 * Default text input configuration
 */
export const DEFAULT_TEXT_INPUT_CONFIG: TextInputConfig = {
  minRows: 1,
  maxRows: 5,
  maxCharacters: 5000,
  showCharacterCount: true,
  characterCountThreshold: 0.9,
  autoFocus: true,
  enterToSend: true,
};
```

## 3. Send Button State Model

### 3.1 SendButtonState Type

Represents the possible states of the send button using discriminated union.

```typescript
/**
 * Send button state discriminated union
 */
export type SendButtonState =
  | { status: 'idle'; canSend: boolean }
  | { status: 'sending' }
  | { status: 'success' }
  | { status: 'error'; errorMessage: string };

/**
 * Type guards for send button states
 */
export function isSendIdle(state: SendButtonState): state is { status: 'idle'; canSend: boolean } {
  return state.status === 'idle';
}

export function isSendSending(state: SendButtonState): state is { status: 'sending' } {
  return state.status === 'sending';
}

export function isSendSuccess(state: SendButtonState): state is { status: 'success' } {
  return state.status === 'success';
}

export function isSendError(state: SendButtonState): state is { status: 'error'; errorMessage: string } {
  return state.status === 'error';
}
```

**State Transitions**:
```
idle (canSend=false) → [user types text] → idle (canSend=true)
idle (canSend=true) → [user clicks send] → sending
sending → [success] → success → [200ms delay] → idle
sending → [error] → error → [user clicks retry] → sending
error → [user edits text] → idle
```

**Validation Rules**:
- `canSend`: `true` only if text is non-empty, connected, and not currently sending
- `errorMessage`: Must be non-empty string when status is 'error'

## 4. Data Channel Protocol Models

### 4.1 Text Message Protocol (Frontend → Agent)

```typescript
/**
 * Text message sent from frontend to LiveKit agent
 * Sent via LiveKit data channel with reliable delivery
 */
export interface TextMessageProtocol {
  readonly type: 'text_message';     // Protocol discriminator
  readonly messageId: string;        // UUID for tracking
  readonly content: string;          // User typed text (max 5000 chars)
  readonly timestamp: number;        // Unix timestamp (ms)
}

/**
 * Factory: Create text message protocol object
 */
export function createTextMessageProtocol(
  content: string,
  messageId: string = crypto.randomUUID(),
  timestamp: number = Date.now()
): TextMessageProtocol {
  return {
    type: 'text_message',
    messageId,
    content: content.trim(),
    timestamp,
  };
}

/**
 * Serialize text message for data channel transmission
 */
export function serializeTextMessage(message: TextMessageProtocol): Uint8Array {
  const json = JSON.stringify(message);
  return new TextEncoder().encode(json);
}
```

**Wire Format Example**:
```json
{
  "type": "text_message",
  "messageId": "550e8400-e29b-41d4-a716-446655440000",
  "content": "What is the weather today?",
  "timestamp": 1730323200000
}
```

**Validation Rules**:
- `type`: Must be exactly 'text_message'
- `messageId`: Must be valid UUID v4 format
- `content`: Non-empty, trimmed, max 5000 characters
- `timestamp`: Must be valid Unix timestamp in milliseconds

### 4.2 Text Message Acknowledgment (Agent → Frontend)

```typescript
/**
 * Acknowledgment sent from agent to frontend upon receiving text message
 * Optional - used for delivery confirmation
 */
export interface TextMessageAckProtocol {
  readonly type: 'text_message_ack';  // Protocol discriminator
  readonly messageId: string;         // UUID of received message
  readonly received: boolean;         // Whether message was successfully received
  readonly timestamp: number;         // Unix timestamp (ms)
}

/**
 * Deserialize acknowledgment from data channel
 */
export function deserializeTextMessageAck(data: Uint8Array): TextMessageAckProtocol {
  const json = new TextDecoder().decode(data);
  return JSON.parse(json) as TextMessageAckProtocol;
}
```

**Wire Format Example**:
```json
{
  "type": "text_message_ack",
  "messageId": "550e8400-e29b-41d4-a716-446655440000",
  "received": true,
  "timestamp": 1730323201000
}
```

## 5. Keyboard Event Models

### 5.1 KeyboardEventHandler Type

```typescript
/**
 * Keyboard event handler for text input
 */
export type TextInputKeyboardEvent = KeyboardEvent & {
  readonly key: 'Enter' | 'Escape' | string;
  readonly shiftKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
};

/**
 * Keyboard action result
 */
export type KeyboardActionResult =
  | { action: 'send' }
  | { action: 'newline' }
  | { action: 'none' };

/**
 * Determine keyboard action from event
 */
export function getKeyboardAction(event: KeyboardEvent): KeyboardActionResult {
  // Enter without shift = send
  if (event.key === 'Enter' && !event.shiftKey) {
    return { action: 'send' };
  }
  // Shift+Enter = new line (default behavior)
  if (event.key === 'Enter' && event.shiftKey) {
    return { action: 'newline' };
  }
  // All other keys = no action
  return { action: 'none' };
}
```

## 6. Error Models

### 6.1 Text Message Error Type

```typescript
/**
 * Text message error codes
 */
export type TextMessageErrorCode =
  | 'DISCONNECTED'           // Not connected to LiveKit
  | 'EMPTY_MESSAGE'          // Message content is empty
  | 'MESSAGE_TOO_LONG'       // Exceeds character limit
  | 'SEND_FAILED'            // Data channel send failed
  | 'INVALID_CONTENT';       // Content validation failed

/**
 * Text message error
 */
export interface TextMessageError {
  readonly code: TextMessageErrorCode;
  readonly message: string;
  readonly timestamp: Date;
}

/**
 * Factory: Create text message error
 */
export function createTextMessageError(
  code: TextMessageErrorCode,
  message: string
): TextMessageError {
  return {
    code,
    message,
    timestamp: new Date(),
  };
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(code: TextMessageErrorCode): string {
  switch (code) {
    case 'DISCONNECTED':
      return 'Cannot send message. Please connect first.';
    case 'EMPTY_MESSAGE':
      return 'Cannot send empty message.';
    case 'MESSAGE_TOO_LONG':
      return 'Message exceeds maximum length of 5000 characters.';
    case 'SEND_FAILED':
      return 'Failed to send message. Please try again.';
    case 'INVALID_CONTENT':
      return 'Message contains invalid content.';
  }
}
```

## 7. Validation Functions

### 7.1 Content Validation

```typescript
/**
 * Validate text message content
 */
export function validateTextMessageContent(
  content: string,
  maxLength: number = 5000
): { valid: boolean; error?: TextMessageError } {
  // Empty check (after trim)
  const trimmed = content.trim();
  if (trimmed.length === 0) {
    return {
      valid: false,
      error: createTextMessageError('EMPTY_MESSAGE', 'Message cannot be empty'),
    };
  }

  // Length check
  if (trimmed.length > maxLength) {
    return {
      valid: false,
      error: createTextMessageError(
        'MESSAGE_TOO_LONG',
        `Message exceeds ${maxLength} characters`
      ),
    };
  }

  return { valid: true };
}

/**
 * Sanitize text input (prevent XSS, normalize whitespace)
 */
export function sanitizeTextInput(input: string): string {
  return input
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
    .replace(/\s+/g, ' ')                         // Normalize whitespace
    .trim();
}
```

## 8. Model Files Structure

### File Organization

```
src/app/models/
├── unified-conversation-message.model.ts    # EXTEND: Add UserTextMessage
├── text-input-state.model.ts               # NEW: TextInputState, TextInputConfig
├── text-input-protocol.model.ts            # NEW: TextMessageProtocol, Ack
├── text-message-error.model.ts             # NEW: Error types and codes
└── keyboard-event.model.ts                 # NEW: Keyboard event utilities
```

### Export Barrel

```typescript
// src/app/models/index.ts
export * from './unified-conversation-message.model';
export * from './text-input-state.model';
export * from './text-input-protocol.model';
export * from './text-message-error.model';
export * from './keyboard-event.model';
```

## 9. Type Safety Checklist

- ✅ All interfaces use `readonly` properties (immutability)
- ✅ Discriminated unions for state types (SendButtonState, KeyboardActionResult)
- ✅ Type guards for safe type narrowing
- ✅ Factory functions for object creation (prevents invalid state)
- ✅ Validation functions return typed results
- ✅ String literal types for enums (MessageSource, TextMessageErrorCode)
- ✅ No `any` types used
- ✅ Full TypeScript strict mode compliance

## 10. Testing Considerations

### Unit Test Coverage Required

- ✅ Factory functions create valid objects
- ✅ Type guards correctly identify types
- ✅ Validation functions catch invalid input
- ✅ State transitions are valid
- ✅ Serialization/deserialization maintains data integrity
- ✅ Error messages are user-friendly
- ✅ Character count calculations are accurate

### Test Data Examples

```typescript
// Valid user text message
const validMessage = createUserTextMessage('Hello, agent!');

// Text input state with text
const activeInputState: TextInputState = {
  ...DEFAULT_TEXT_INPUT_STATE,
  value: 'Test message',
  characterCount: 12,
  isFocused: true,
};

// Send button in sending state
const sendingState: SendButtonState = { status: 'sending' };

// Error state with message
const errorState: SendButtonState = {
  status: 'error',
  errorMessage: 'Failed to send message',
};
```

## Summary

This data model provides a type-safe, immutable foundation for the text chat input feature. It extends the existing unified conversation message system without breaking changes, uses discriminated unions for state management, and includes comprehensive validation and error handling. All models follow Angular and TypeScript best practices with strict typing and readonly properties.
