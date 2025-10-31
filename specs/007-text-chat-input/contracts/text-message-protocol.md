# Data Channel Protocol: Text Message

**Feature**: 007-text-chat-input  
**Version**: 1.0.0  
**Date**: 2025-10-30  
**Direction**: Frontend → LiveKit Agent

## Overview

This protocol defines the structure of text messages sent from the Angular frontend to the LiveKit agent via the data channel. Text messages bypass the speech-to-text pipeline and are injected directly into the agent's conversation flow.

## Message Type

**Type Identifier**: `text_message`

## JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["type", "messageId", "content", "timestamp"],
  "properties": {
    "type": {
      "type": "string",
      "const": "text_message",
      "description": "Protocol discriminator for text messages"
    },
    "messageId": {
      "type": "string",
      "format": "uuid",
      "description": "Unique identifier for message tracking (UUID v4)",
      "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"
    },
    "content": {
      "type": "string",
      "minLength": 1,
      "maxLength": 5000,
      "description": "User typed message content (trimmed, max 5000 characters)"
    },
    "timestamp": {
      "type": "number",
      "minimum": 0,
      "description": "Unix timestamp in milliseconds when message was created"
    }
  },
  "additionalProperties": false
}
```

## TypeScript Interface

```typescript
/**
 * Text message protocol (Frontend → Agent)
 */
export interface TextMessageProtocol {
  readonly type: 'text_message';
  readonly messageId: string;
  readonly content: string;
  readonly timestamp: number;
}
```

## Wire Format Example

```json
{
  "type": "text_message",
  "messageId": "550e8400-e29b-41d4-a716-446655440000",
  "content": "What is the weather like today?",
  "timestamp": 1730323200000
}
```

## Field Specifications

### type
- **Type**: String constant
- **Value**: `"text_message"`
- **Required**: Yes
- **Description**: Discriminates this protocol from other data channel message types (`set_response_mode`, `chat_chunk`, etc.)

### messageId
- **Type**: String (UUID v4)
- **Required**: Yes
- **Format**: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx` (where x is [0-9a-f], y is [89ab])
- **Generation**: `crypto.randomUUID()` on frontend
- **Description**: Unique identifier for tracking message delivery and acknowledgment
- **Example**: `"550e8400-e29b-41d4-a716-446655440000"`

### content
- **Type**: String
- **Required**: Yes
- **Minimum Length**: 1 character (after trim)
- **Maximum Length**: 5000 characters (after trim)
- **Validation**: 
  - Must not be empty or whitespace-only
  - Control characters removed (U+0000-U+001F, U+007F-U+009F)
  - Normalized whitespace (multiple spaces → single space)
- **Description**: The user's typed message text
- **Example**: `"What is the weather like today?"`

### timestamp
- **Type**: Number (integer)
- **Required**: Yes
- **Format**: Unix timestamp in milliseconds
- **Range**: Must be positive (>= 0)
- **Generation**: `Date.now()` on frontend when message is sent
- **Description**: Creation time in milliseconds since Unix epoch
- **Example**: `1730323200000` (Oct 30, 2025 12:00:00 PM UTC)

## Transmission

### Transport
- **Medium**: LiveKit data channel
- **Encoding**: UTF-8 JSON
- **Reliability**: `reliable: true` (guaranteed delivery, in-order)
- **Serialization**: `TextEncoder().encode(JSON.stringify(message))`

### Frontend Send Example

```typescript
// Create message
const message: TextMessageProtocol = {
  type: 'text_message',
  messageId: crypto.randomUUID(),
  content: userInput.trim(),
  timestamp: Date.now(),
};

// Serialize and send
const payload = new TextEncoder().encode(JSON.stringify(message));
await room.localParticipant?.publishData(payload, { reliable: true });
```

## Agent Handling

### Reception

```typescript
// In agent.md entry function
ctx.room.on('dataReceived', async (payload: Uint8Array) => {
  try {
    const decoder = new TextDecoder();
    const messageText = decoder.decode(payload);
    const message = JSON.parse(messageText);

    // Handle text message
    if (message.type === 'text_message') {
      await handleTextMessage(message as TextMessageProtocol);
    }
  } catch (error) {
    console.error('Error processing data channel message:', error);
  }
});
```

### Processing

```typescript
async function handleTextMessage(message: TextMessageProtocol): Promise<void> {
  console.log(`📝 Received text message [${message.messageId}]: "${message.content}"`);

  // Validate message
  if (!message.content || message.content.length === 0) {
    console.error('Invalid text message: empty content');
    return;
  }

  // Bypass STT - inject directly into conversation
  // Note: This assumes LiveKit Agents v0.8+ API
  session.conversation.item.create({
    type: 'message',
    role: 'user',
    content: [{ type: 'input_text', text: message.content }]
  });

  // Agent will process and respond based on current responseMode (voice or chat)
}
```

## Error Handling

### Frontend Validation Errors

| Error Code | Condition | User Message |
|------------|-----------|--------------|
| `EMPTY_MESSAGE` | `content.trim().length === 0` | "Cannot send empty message." |
| `MESSAGE_TOO_LONG` | `content.length > 5000` | "Message exceeds maximum length of 5000 characters." |
| `DISCONNECTED` | `room.state !== 'connected'` | "Cannot send message. Please connect first." |
| `INVALID_CONTENT` | Content validation fails | "Message contains invalid content." |

### Agent Error Handling

```typescript
try {
  // Process text message
  session.conversation.item.create({ /* ... */ });
} catch (error) {
  console.error(`Failed to process text message [${message.messageId}]:`, error);
  
  // Optionally send error acknowledgment back to frontend
  const errorAck = JSON.stringify({
    type: 'text_message_ack',
    messageId: message.messageId,
    received: false,
    error: 'Failed to process message',
    timestamp: Date.now(),
  });
  
  await ctx.room.localParticipant?.publishData(
    new TextEncoder().encode(errorAck),
    { reliable: true }
  );
}
```

## Integration Points

### Existing Data Channel Messages

The text message protocol coexists with existing data channel message types:

| Type | Direction | Purpose |
|------|-----------|---------|
| `set_response_mode` | Frontend → Agent | Change agent response mode (voice/chat) |
| `response_mode_updated` | Agent → Frontend | Confirm mode change |
| `chat_chunk` | Agent → Frontend | Stream chat response chunks |
| `text_message` | Frontend → Agent | **NEW: Send typed text message** |
| `text_message_ack` | Agent → Frontend | **OPTIONAL: Acknowledge receipt** |

### Discriminated Union Pattern

```typescript
type DataChannelMessage =
  | { type: 'set_response_mode'; mode: 'voice' | 'chat' }
  | { type: 'response_mode_updated'; mode: 'voice' | 'chat' }
  | { type: 'chat_chunk'; messageId: string; chunk: string; isComplete: boolean }
  | { type: 'text_message'; messageId: string; content: string; timestamp: number }
  | { type: 'text_message_ack'; messageId: string; received: boolean; timestamp: number };
```

## Sequence Diagram

```
Frontend                          LiveKit Agent
   |                                     |
   |  [User types message]               |
   |                                     |
   |  TextMessageProtocol                |
   |  {                                  |
   |    type: "text_message",            |
   |    messageId: "uuid",               |
   |    content: "Hello",                |
   |    timestamp: 1730323200000         |
   |  }                                  |
   | ----------------------------------> |
   |         (data channel)              |
   |                                     |
   |                                     | [Validate message]
   |                                     | [Bypass STT]
   |                                     | [Inject into conversation]
   |                                     | [Process via LLM]
   |                                     |
   |                                     | [Respond via voice or chat]
   |                                     | (based on responseMode)
   |                                     |
   |  (optional acknowledgment)          |
   | <---------------------------------- |
   |                                     |
```

## Backward Compatibility

This protocol extension is **fully backward compatible**:
- Does not modify existing data channel message structures
- Agent safely ignores unknown message types
- Frontend does not require agent acknowledgment (fire-and-forget)
- Existing features (voice mode, chat mode) continue to work unchanged

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-10-30 | Initial protocol definition |

## References

- **LiveKit Data Channel API**: https://docs.livekit.io/client-sdk-js/Room.html#publishData
- **Feature 003 (Voice/Chat Mode)**: Uses similar data channel protocol pattern
- **Feature 005 (Unified Conversation)**: Extends message model to include text messages
- **Data Model Documentation**: See `../data-model.md` for TypeScript type definitions
