/**
 * Text Message Error Models
 * Feature: 007-text-chat-input
 * Defines error types and handling for text message sending
 */

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
