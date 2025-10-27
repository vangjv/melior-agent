/**
 * Activity Event Types
 * Feature: 006-auto-disconnect-idle
 */

/**
 * Transcription activity that resets the idle timer
 */
export interface TranscriptionActivityEvent {
  type: 'transcription';
  timestamp: Date;
  isFinal: boolean;
}

/**
 * Chat message activity that resets the idle timer
 */
export interface ChatMessageActivityEvent {
  type: 'chat-message';
  timestamp: Date;
  sender: 'user' | 'agent';
}

/**
 * Discriminated union of all activity event types
 */
export type ActivityEvent = TranscriptionActivityEvent | ChatMessageActivityEvent;

/**
 * Type guard for transcription events
 */
export function isTranscriptionEvent(event: ActivityEvent): event is TranscriptionActivityEvent {
  return event.type === 'transcription';
}

/**
 * Type guard for chat message events
 */
export function isChatMessageEvent(event: ActivityEvent): event is ChatMessageActivityEvent {
  return event.type === 'chat-message';
}
