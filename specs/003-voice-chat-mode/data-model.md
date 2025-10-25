# Data Model: Voice/Chat Response Mode Toggle

**Feature**: 003-voice-chat-mode  
**Phase**: 1 - Data Model Design  
**Date**: 2025-10-24

## Purpose

Define all TypeScript interfaces, types, and data structures for the voice/chat response mode toggle feature. This document serves as the single source of truth for type definitions and ensures type safety across the implementation.

---

## 1. Response Mode Types

### ResponseMode

```typescript
/**
 * Agent response delivery mode
 * - voice: Agent responds with synthesized speech (TTS)
 * - chat: Agent responds with text messages via data channel
 */
export type ResponseMode = 'voice' | 'chat';

/**
 * Default response mode
 */
export const DEFAULT_RESPONSE_MODE: ResponseMode = 'voice';

/**
 * Type guard for ResponseMode
 */
export function isValidResponseMode(value: unknown): value is ResponseMode {
  return value === 'voice' || value === 'chat';
}
```

**Usage**: Primary type for tracking and communicating the current agent response mode.

---

## 2. Data Channel Message Types

### Base Message Interface

```typescript
/**
 * Base interface for all data channel messages
 * Uses discriminated union pattern for type-safe message handling
 */
export interface BaseDataChannelMessage {
  readonly type: string;
}
```

### Outgoing Messages (Frontend → Agent)

```typescript
/**
 * Request to change agent response mode
 * Sent from frontend to agent via data channel
 */
export interface SetResponseModeMessage extends BaseDataChannelMessage {
  readonly type: 'set_response_mode';
  readonly mode: ResponseMode;
}

/**
 * Factory function for creating mode change requests
 */
export function createSetResponseModeMessage(mode: ResponseMode): SetResponseModeMessage {
  return {
    type: 'set_response_mode',
    mode,
  };
}
```

### Incoming Messages (Agent → Frontend)

```typescript
/**
 * Confirmation that agent has changed response mode
 * Sent from agent to frontend via data channel
 */
export interface ResponseModeUpdatedMessage extends BaseDataChannelMessage {
  readonly type: 'response_mode_updated';
  readonly mode: ResponseMode;
}

/**
 * Chat message from agent in chat mode
 * Contains the agent's text response
 */
export interface AgentChatMessage extends BaseDataChannelMessage {
  readonly type: 'chat_message';
  readonly message: string;
  readonly timestamp: number; // Unix timestamp in milliseconds
}
```

### Message Union Types

```typescript
/**
 * Union of all messages that can be sent to agent
 */
export type OutgoingDataChannelMessage = SetResponseModeMessage;

/**
 * Union of all messages that can be received from agent
 */
export type IncomingDataChannelMessage = 
  | ResponseModeUpdatedMessage 
  | AgentChatMessage;

/**
 * Union of all data channel messages
 */
export type DataChannelMessage = 
  | OutgoingDataChannelMessage 
  | IncomingDataChannelMessage;
```

### Message Validation

```typescript
/**
 * Type guard for incoming messages
 */
export function isIncomingMessage(data: unknown): data is IncomingDataChannelMessage {
  if (!data || typeof data !== 'object') return false;
  
  const message = data as BaseDataChannelMessage;
  return message.type === 'response_mode_updated' || message.type === 'chat_message';
}

/**
 * Validates ResponseModeUpdatedMessage structure
 */
export function isResponseModeUpdatedMessage(
  message: BaseDataChannelMessage
): message is ResponseModeUpdatedMessage {
  return (
    message.type === 'response_mode_updated' &&
    'mode' in message &&
    isValidResponseMode((message as ResponseModeUpdatedMessage).mode)
  );
}

/**
 * Validates AgentChatMessage structure
 */
export function isAgentChatMessage(
  message: BaseDataChannelMessage
): message is AgentChatMessage {
  const chatMsg = message as AgentChatMessage;
  return (
    message.type === 'chat_message' &&
    typeof chatMsg.message === 'string' &&
    typeof chatMsg.timestamp === 'number'
  );
}
```

---

## 3. Chat Message State Models

### ChatMessageState

```typescript
/**
 * Chat message for UI display
 * Represents both user (transcribed speech) and agent (text response) messages
 */
export interface ChatMessageState {
  readonly id: string;
  readonly content: string;
  readonly timestamp: Date;
  readonly sender: MessageSender;
  readonly isLocal?: boolean; // True if message is being sent (pending)
}

/**
 * Message sender type
 */
export type MessageSender = 'user' | 'agent';

/**
 * Factory function for creating user messages from transcription
 */
export function createUserMessage(
  content: string,
  timestamp: Date = new Date()
): ChatMessageState {
  return {
    id: crypto.randomUUID(),
    content,
    timestamp,
    sender: 'user',
  };
}

/**
 * Factory function for creating agent messages from data channel
 */
export function createAgentMessage(
  content: string,
  timestamp: number
): ChatMessageState {
  return {
    id: crypto.randomUUID(),
    content,
    timestamp: new Date(timestamp),
    sender: 'agent',
  };
}
```

### ChatHistoryState

```typescript
/**
 * Complete chat history state
 * Managed by ChatStorageService
 */
export interface ChatHistoryState {
  readonly messages: readonly ChatMessageState[];
  readonly totalCount: number;
  readonly oldestTimestamp: Date | null;
  readonly newestTimestamp: Date | null;
}

/**
 * Empty chat history state
 */
export const EMPTY_CHAT_HISTORY: ChatHistoryState = {
  messages: [],
  totalCount: 0,
  oldestTimestamp: null,
  newestTimestamp: null,
};

/**
 * Factory function for creating chat history from messages
 */
export function createChatHistory(messages: ChatMessageState[]): ChatHistoryState {
  if (messages.length === 0) {
    return EMPTY_CHAT_HISTORY;
  }
  
  const sortedMessages = [...messages].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );
  
  return {
    messages: sortedMessages,
    totalCount: sortedMessages.length,
    oldestTimestamp: sortedMessages[0].timestamp,
    newestTimestamp: sortedMessages[sortedMessages.length - 1].timestamp,
  };
}
```

---

## 4. Response Mode Service State

### ResponseModeState

```typescript
/**
 * Complete state of response mode feature
 * Managed by ResponseModeService
 */
export interface ResponseModeState {
  readonly currentMode: ResponseMode;
  readonly isConfirmed: boolean;
  readonly pendingMode: ResponseMode | null;
  readonly errorMessage: string | null;
  readonly isDataChannelAvailable: boolean;
}

/**
 * Initial response mode state
 */
export const INITIAL_RESPONSE_MODE_STATE: ResponseModeState = {
  currentMode: 'voice',
  isConfirmed: true,
  pendingMode: null,
  errorMessage: null,
  isDataChannelAvailable: false,
};
```

### Mode Toggle UI State

```typescript
/**
 * Derived state for mode toggle button
 */
export interface ModeToggleButtonState {
  readonly label: string;
  readonly disabled: boolean;
  readonly loading: boolean;
  readonly ariaLabel: string;
  readonly ariaPressed: boolean;
  readonly icon: string;
}

/**
 * Derives button state from response mode state
 */
export function deriveModeToggleButtonState(
  state: ResponseModeState
): ModeToggleButtonState {
  const { currentMode, isConfirmed, isDataChannelAvailable } = state;
  
  // Button disabled if data channel unavailable or mode change pending
  const disabled = !isDataChannelAvailable || !isConfirmed;
  const loading = !isConfirmed;
  
  // Button label
  const label = currentMode === 'voice' ? 'Voice Mode' : 'Chat Mode';
  const loadingLabel = 'Switching...';
  
  // ARIA attributes
  const nextMode = currentMode === 'voice' ? 'chat' : 'voice';
  const ariaLabel = disabled
    ? `Response mode unavailable`
    : loading
    ? loadingLabel
    : `Response mode: ${currentMode}. Click to switch to ${nextMode} mode.`;
  const ariaPressed = currentMode === 'chat';
  
  // Icon
  const icon = currentMode === 'voice' ? '🔊' : '💬';
  
  return {
    label: loading ? loadingLabel : label,
    disabled,
    loading,
    ariaLabel,
    ariaPressed,
    icon,
  };
}
```

---

## 5. Storage Models

### StoredPreference

```typescript
/**
 * User's preferred response mode stored in localStorage
 */
export interface StoredModePreference {
  readonly mode: ResponseMode;
  readonly savedAt: string; // ISO 8601 timestamp
}

/**
 * LocalStorage key for mode preference
 */
export const MODE_PREFERENCE_STORAGE_KEY = 'melior-agent-response-mode';

/**
 * Serializes mode preference for localStorage
 */
export function serializeModePreference(mode: ResponseMode): string {
  const preference: StoredModePreference = {
    mode,
    savedAt: new Date().toISOString(),
  };
  return JSON.stringify(preference);
}

/**
 * Deserializes mode preference from localStorage
 */
export function deserializeModePreference(json: string): ResponseMode | null {
  try {
    const preference = JSON.parse(json) as StoredModePreference;
    
    if (!isValidResponseMode(preference.mode)) {
      console.warn('Invalid stored mode preference:', preference);
      return null;
    }
    
    return preference.mode;
  } catch (error) {
    console.error('Failed to deserialize mode preference:', error);
    return null;
  }
}
```

---

## 6. Error Models

### ResponseModeError

```typescript
/**
 * Errors specific to response mode operations
 */
export interface ResponseModeError {
  readonly code: ResponseModeErrorCode;
  readonly message: string;
  readonly timestamp: Date;
  readonly originalError?: unknown;
}

/**
 * Error codes for response mode operations
 */
export type ResponseModeErrorCode =
  | 'TIMEOUT'
  | 'DATA_CHANNEL_UNAVAILABLE'
  | 'INVALID_MESSAGE'
  | 'ENCODING_ERROR'
  | 'DECODING_ERROR'
  | 'STORAGE_ERROR'
  | 'UNKNOWN';

/**
 * User-friendly error messages
 */
export const RESPONSE_MODE_ERROR_MESSAGES: Record<ResponseModeErrorCode, string> = {
  TIMEOUT: 'Mode change timed out. Please try again.',
  DATA_CHANNEL_UNAVAILABLE: 'Chat mode is currently unavailable.',
  INVALID_MESSAGE: 'Received invalid message from agent.',
  ENCODING_ERROR: 'Failed to send mode change request.',
  DECODING_ERROR: 'Failed to process agent response.',
  STORAGE_ERROR: 'Failed to save your preference.',
  UNKNOWN: 'An unexpected error occurred.',
};

/**
 * Factory function for creating response mode errors
 */
export function createResponseModeError(
  code: ResponseModeErrorCode,
  originalError?: unknown
): ResponseModeError {
  return {
    code,
    message: RESPONSE_MODE_ERROR_MESSAGES[code],
    timestamp: new Date(),
    originalError,
  };
}
```

---

## 7. Event Models

### ResponseModeEvent

```typescript
/**
 * Events emitted by ResponseModeService
 */
export type ResponseModeEvent =
  | ModeChangeRequestedEvent
  | ModeChangeConfirmedEvent
  | ModeChangeTimeoutEvent
  | ChatMessageReceivedEvent
  | DataChannelStateChangedEvent;

/**
 * Mode change requested by user
 */
export interface ModeChangeRequestedEvent {
  readonly type: 'mode_change_requested';
  readonly requestedMode: ResponseMode;
  readonly timestamp: Date;
}

/**
 * Mode change confirmed by agent
 */
export interface ModeChangeConfirmedEvent {
  readonly type: 'mode_change_confirmed';
  readonly confirmedMode: ResponseMode;
  readonly timestamp: Date;
}

/**
 * Mode change request timed out
 */
export interface ModeChangeTimeoutEvent {
  readonly type: 'mode_change_timeout';
  readonly requestedMode: ResponseMode;
  readonly timestamp: Date;
}

/**
 * Chat message received from agent
 */
export interface ChatMessageReceivedEvent {
  readonly type: 'chat_message_received';
  readonly message: ChatMessageState;
  readonly timestamp: Date;
}

/**
 * Data channel availability changed
 */
export interface DataChannelStateChangedEvent {
  readonly type: 'data_channel_state_changed';
  readonly isAvailable: boolean;
  readonly timestamp: Date;
}
```

---

## 8. Configuration Models

### ResponseModeConfig

```typescript
/**
 * Configuration for response mode feature
 */
export interface ResponseModeConfig {
  readonly timeoutMs: number;
  readonly debounceMs: number;
  readonly virtualScrollThreshold: number;
  readonly enablePersistence: boolean;
  readonly enableAutoScroll: boolean;
}

/**
 * Default configuration
 */
export const DEFAULT_RESPONSE_MODE_CONFIG: ResponseModeConfig = {
  timeoutMs: 5000,           // 5 second timeout for mode confirmations
  debounceMs: 300,           // 300ms debounce for toggle clicks
  virtualScrollThreshold: 100, // Enable virtual scroll after 100 messages
  enablePersistence: true,   // Save mode preference to localStorage
  enableAutoScroll: true,    // Auto-scroll to latest chat message
};
```

---

## 9. Type Relationships Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Response Mode Feature                        │
└─────────────────────────────────────────────────────────────────┘
                                 │
                ┌────────────────┼────────────────┐
                │                │                │
                ▼                ▼                ▼
    ┌─────────────────┐  ┌──────────────┐  ┌──────────────┐
    │  ResponseMode   │  │  Messages    │  │  UI State    │
    │   (type)        │  │              │  │              │
    └─────────────────┘  └──────────────┘  └──────────────┘
            │                    │                 │
            │                    │                 │
            ▼                    ▼                 ▼
    ┌─────────────────┐  ┌──────────────┐  ┌──────────────┐
    │ • voice         │  │ Outgoing:    │  │ Button:      │
    │ • chat          │  │ • SetMode    │  │ • label      │
    └─────────────────┘  │              │  │ • disabled   │
                         │ Incoming:    │  │ • loading    │
                         │ • Updated    │  └──────────────┘
                         │ • ChatMsg    │
                         └──────────────┘
                                 │
                                 ▼
                         ┌──────────────┐
                         │  Validation  │
                         │              │
                         │ • Type guards│
                         │ • Factories  │
                         └──────────────┘
```

---

## 10. State Transition Diagram

```
                    ┌──────────────────────┐
                    │   Initial State      │
                    │  mode: voice         │
                    │  confirmed: true     │
                    └──────────────────────┘
                              │
                              │ User clicks toggle
                              ▼
                    ┌──────────────────────┐
                    │   Pending State      │
                    │  mode: voice         │
                    │  confirmed: false    │
                    │  pending: chat       │
                    └──────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                │                           │
                │ Confirmation              │ Timeout (5s)
                │ received                  │
                ▼                           ▼
    ┌──────────────────────┐    ┌──────────────────────┐
    │  Confirmed State     │    │   Error State        │
    │  mode: chat          │    │   mode: voice        │
    │  confirmed: true     │    │   confirmed: true    │
    │  pending: null       │    │   error: TIMEOUT     │
    └──────────────────────┘    └──────────────────────┘
```

---

## 11. Data Flow Diagram

```
┌─────────────────┐
│  User Action    │ (Click toggle button)
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  ModeToggleButtonComponent      │
│  • Debounce click (300ms)       │
│  • Emit onModeToggle event      │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  VoiceChatComponent (Smart)     │
│  • Call service.setMode()       │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  ResponseModeService            │
│  • Update state to pending      │
│  • Encode message to JSON       │
│  • Send via data channel        │
│  • Start timeout timer          │
└────────┬────────────────────────┘
         │
         │ LiveKit Data Channel
         │ (RELIABLE delivery)
         ▼
┌─────────────────────────────────┐
│  LiveKit Agent                  │
│  • Process mode change          │
│  • Send confirmation            │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  ResponseModeService            │
│  • Receive DataReceived event   │
│  • Decode message from JSON     │
│  • Validate message type        │
│  • Update state to confirmed    │
│  • Clear timeout timer          │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  VoiceChatComponent             │
│  • Signal updates UI            │
│  • Button shows new mode        │
└─────────────────────────────────┘
```

---

## Summary

All data models defined with:
- ✅ TypeScript interfaces with strict typing
- ✅ Discriminated unions for type-safe message handling
- ✅ Type guards for runtime validation
- ✅ Factory functions for object creation
- ✅ Default constants for initial states
- ✅ Error models with user-friendly messages
- ✅ Configuration models with sensible defaults
- ✅ State transition and data flow diagrams

**File Locations** (to be created in implementation):
- `src/app/models/response-mode.model.ts` - ResponseMode and message types
- `src/app/models/chat-message.model.ts` - Chat message state types
- `src/app/models/response-mode-state.model.ts` - Service state types
- `src/app/models/response-mode-error.model.ts` - Error types

**Next**: Create service contracts and API documentation
