/**
 * Text Input Protocol Models
 * Feature: 007-text-chat-input
 * Defines data channel protocol for text message communication
 */

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
 * Sanitize input text to prevent XSS attacks (T072)
 * Removes potentially dangerous HTML/script tags and normalizes whitespace
 */
export function sanitizeTextInput(content: string): string {
  // Remove HTML tags and script content
  let sanitized = content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');

  // Normalize whitespace but preserve line breaks
  sanitized = sanitized
    .replace(/\t/g, ' ')
    .replace(/ +/g, ' ');

  // Trim leading/trailing whitespace
  return sanitized.trim();
}

/**
 * Validate text input length
 */
export function validateTextLength(content: string, maxLength: number = 5000): boolean {
  return content.length <= maxLength;
}

/**
 * Factory: Create text message protocol object
 */
export function createTextMessageProtocol(
  content: string,
  messageId: string = crypto.randomUUID(),
  timestamp: number = Date.now()
): TextMessageProtocol {
  // Sanitize input for security (T072)
  const sanitizedContent = sanitizeTextInput(content);

  // Validate length
  if (!validateTextLength(sanitizedContent)) {
    throw new Error(`Text message exceeds maximum length of 5000 characters`);
  }

  return {
    type: 'text_message',
    messageId,
    content: sanitizedContent,
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
