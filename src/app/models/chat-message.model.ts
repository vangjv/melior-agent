/**
 * Chat Message Model
 * Type definitions for chat message state and display
 */

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
    isLocal: false,
  };
}

/**
 * Factory function for creating agent messages from data channel
 */
export function createAgentMessage(
  content: string,
  timestamp: Date | number = new Date()
): ChatMessageState {
  return {
    id: crypto.randomUUID(),
    content,
    timestamp: typeof timestamp === 'number' ? new Date(timestamp) : timestamp,
    sender: 'agent',
    isLocal: false,
  };
}

/**
 * Chat history state
 * Contains all messages in the current session
 */
export interface ChatHistoryState {
  readonly messages: readonly ChatMessageState[];
  readonly lastMessageAt: Date | null;
}

/**
 * Factory function for empty chat history
 */
export function createEmptyChatHistory(): ChatHistoryState {
  return {
    messages: [],
    lastMessageAt: null,
  };
}
