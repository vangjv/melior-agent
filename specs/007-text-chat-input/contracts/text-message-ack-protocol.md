# Data Channel Protocol: Text Message Acknowledgment

**Feature**: 007-text-chat-input  
**Version**: 1.0.0 (Optional)  
**Date**: 2025-10-30  
**Direction**: LiveKit Agent → Frontend

## Overview

This protocol defines an **optional** acknowledgment message sent from the LiveKit agent to the Angular frontend to confirm receipt of a text message. This is not required for basic functionality but can be used for delivery confirmation and error handling.

## Message Type

**Type Identifier**: `text_message_ack`

## JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["type", "messageId", "received", "timestamp"],
  "properties": {
    "type": {
      "type": "string",
      "const": "text_message_ack",
      "description": "Protocol discriminator for acknowledgments"
    },
    "messageId": {
      "type": "string",
      "format": "uuid",
      "description": "UUID of the text message being acknowledged",
      "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"
    },
    "received": {
      "type": "boolean",
      "description": "Whether the message was successfully received and processed"
    },
    "timestamp": {
      "type": "number",
      "minimum": 0,
      "description": "Unix timestamp in milliseconds when acknowledgment was sent"
    },
    "error": {
      "type": "string",
      "description": "Error message if received=false (optional)"
    }
  },
  "additionalProperties": false
}
```

## TypeScript Interface

```typescript
/**
 * Text message acknowledgment protocol (Agent → Frontend)
 */
export interface TextMessageAckProtocol {
  readonly type: 'text_message_ack';
  readonly messageId: string;
  readonly received: boolean;
  readonly timestamp: number;
  readonly error?: string;
}
```

## Wire Format Examples

### Success Acknowledgment

```json
{
  "type": "text_message_ack",
  "messageId": "550e8400-e29b-41d4-a716-446655440000",
  "received": true,
  "timestamp": 1730323201000
}
```

### Error Acknowledgment

```json
{
  "type": "text_message_ack",
  "messageId": "550e8400-e29b-41d4-a716-446655440000",
  "received": false,
  "timestamp": 1730323201000,
  "error": "Failed to process message: invalid content"
}
```

## Field Specifications

### type
- **Type**: String constant
- **Value**: `"text_message_ack"`
- **Required**: Yes
- **Description**: Discriminates acknowledgment from other data channel messages

### messageId
- **Type**: String (UUID v4)
- **Required**: Yes
- **Description**: Matches the `messageId` from the original `text_message` being acknowledged
- **Example**: `"550e8400-e29b-41d4-a716-446655440000"`

### received
- **Type**: Boolean
- **Required**: Yes
- **Values**: 
  - `true`: Message successfully received and added to conversation
  - `false`: Message rejected due to validation or processing error
- **Description**: Indicates whether message was successfully processed

### timestamp
- **Type**: Number (integer)
- **Required**: Yes
- **Format**: Unix timestamp in milliseconds
- **Description**: When the acknowledgment was sent by the agent
- **Example**: `1730323201000`

### error
- **Type**: String
- **Required**: No (only when `received: false`)
- **Description**: Human-readable error message explaining why message was rejected
- **Example**: `"Failed to process message: invalid content"`

## Agent Implementation

### Sending Success Acknowledgment

```typescript
// After successfully processing text message
const ack: TextMessageAckProtocol = {
  type: 'text_message_ack',
  messageId: message.messageId,
  received: true,
  timestamp: Date.now(),
};

const payload = new TextEncoder().encode(JSON.stringify(ack));
await ctx.room.localParticipant?.publishData(payload, { reliable: true });

console.log(`✅ Sent acknowledgment for message [${message.messageId}]`);
```

### Sending Error Acknowledgment

```typescript
// When text message processing fails
try {
  session.conversation.item.create({ /* ... */ });
} catch (error) {
  const errorAck: TextMessageAckProtocol = {
    type: 'text_message_ack',
    messageId: message.messageId,
    received: false,
    timestamp: Date.now(),
    error: error instanceof Error ? error.message : 'Unknown error',
  };

  const payload = new TextEncoder().encode(JSON.stringify(errorAck));
  await ctx.room.localParticipant?.publishData(payload, { reliable: true });

  console.error(`❌ Sent error acknowledgment for message [${message.messageId}]:`, error);
}
```

## Frontend Handling

### Reception

```typescript
// In LiveKit connection service
room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
  const decoder = new TextDecoder();
  const messageText = decoder.decode(payload);
  const message = JSON.parse(messageText);

  if (message.type === 'text_message_ack') {
    handleTextMessageAck(message as TextMessageAckProtocol);
  }
});
```

### Processing

```typescript
function handleTextMessageAck(ack: TextMessageAckProtocol): void {
  console.log(`Received ack for message [${ack.messageId}]: ${ack.received}`);

  if (ack.received) {
    // Success: update UI to show message delivered
    updateSendButtonState({ status: 'success' });
    
    // Transition back to idle after brief delay
    setTimeout(() => {
      updateSendButtonState({ status: 'idle', canSend: false });
    }, 200);
  } else {
    // Error: show error state and allow retry
    updateSendButtonState({
      status: 'error',
      errorMessage: ack.error || 'Failed to send message',
    });
  }
}
```

## Use Cases

### Use Case 1: Delivery Confirmation
**Scenario**: User wants to know their message was received by the agent

**Flow**:
1. Frontend sends `text_message`
2. Frontend shows "sending" state on send button
3. Agent receives, processes, and sends `text_message_ack` with `received: true`
4. Frontend receives ack and shows brief "success" state
5. Send button returns to idle state

### Use Case 2: Error Recovery
**Scenario**: Agent cannot process message due to validation error

**Flow**:
1. Frontend sends `text_message` with invalid content
2. Agent validation fails
3. Agent sends `text_message_ack` with `received: false` and error message
4. Frontend displays error message to user
5. User corrects message and retries

### Use Case 3: Fire-and-Forget (No Ack)
**Scenario**: Simplified implementation without acknowledgments

**Flow**:
1. Frontend sends `text_message`
2. Frontend optimistically shows message in conversation
3. Agent receives and processes (no ack sent)
4. Agent responds via voice or chat
5. Frontend relies on agent response as implicit confirmation

## Implementation Status

**Phase 1 (MVP)**: Fire-and-forget approach (no acks required)
- Simpler implementation
- Lower latency (no waiting for ack)
- Relies on data channel reliability guarantee
- Implicitly confirmed by agent response

**Phase 2 (Future Enhancement)**: Optional acknowledgment support
- Explicit delivery confirmation
- Better error handling and retry logic
- Required for mission-critical applications
- Can be enabled via configuration flag

## Timeout Handling

If acknowledgments are enabled, implement timeout logic:

```typescript
const ACK_TIMEOUT_MS = 5000; // 5 seconds

async function sendTextMessageWithAck(content: string): Promise<void> {
  const messageId = crypto.randomUUID();
  
  // Create promise that resolves when ack received
  const ackPromise = new Promise<TextMessageAckProtocol>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Acknowledgment timeout'));
    }, ACK_TIMEOUT_MS);

    // Listen for ack (pseudo-code)
    onAckReceived(messageId, (ack) => {
      clearTimeout(timeout);
      resolve(ack);
    });
  });

  // Send message
  await sendTextMessage(messageId, content);

  // Wait for ack or timeout
  try {
    const ack = await ackPromise;
    if (!ack.received) {
      throw new Error(ack.error || 'Message rejected');
    }
  } catch (error) {
    console.error('Failed to send message:', error);
    throw error;
  }
}
```

## Sequence Diagram

```
Frontend                          LiveKit Agent
   |                                     |
   |  text_message                       |
   |  messageId: "abc123"                |
   | ----------------------------------> |
   |                                     |
   |  [Show sending state]               | [Validate message]
   |                                     | [Process message]
   |                                     |
   |  text_message_ack                   |
   |  messageId: "abc123"                |
   |  received: true                     |
   | <---------------------------------- |
   |                                     |
   |  [Show success state]               |
   |  [Return to idle after 200ms]       |
   |                                     |
```

## Error Codes

Common error messages in `error` field:

| Error | Description |
|-------|-------------|
| `"Empty message content"` | Message content was empty or whitespace-only |
| `"Message too long"` | Message exceeded 5000 character limit |
| `"Invalid message format"` | JSON parsing or schema validation failed |
| `"Agent session not ready"` | Agent conversation session not initialized |
| `"Processing failed"` | Generic processing error |

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-10-30 | Initial acknowledgment protocol (optional) |

## References

- **Text Message Protocol**: See `text-message-protocol.md` for the request format
- **LiveKit Data Channel**: https://docs.livekit.io/client-sdk-js/interfaces/RoomEvent.html#DataReceived
- **Feature 003**: Uses similar acknowledgment pattern for mode changes
