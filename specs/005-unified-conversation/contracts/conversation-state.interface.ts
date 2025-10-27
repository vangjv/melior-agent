/**
 * Conversation State Interface
 * Feature: 005-unified-conversation
 * 
 * Defines the state structure for the unified conversation feed
 */

import { UnifiedConversationMessage } from './unified-message.interface';
import { ResponseMode } from './unified-message.interface';

/**
 * Complete conversation feed state
 * Manages all messages and conversation metadata
 */
export interface ConversationFeedState {
  readonly messages: readonly UnifiedConversationMessage[];  // All messages in feed
  readonly currentMode: ResponseMode;                         // 'voice' | 'chat'
  readonly sessionId: string;                                 // Unique session identifier
  readonly lastMessageAt: Date | null;                        // Timestamp of last message
  readonly messageCount: number;                              // Total message count
}

/**
 * Serializable conversation feed state (for sessionStorage)
 * Dates are converted to ISO strings for JSON serialization
 */
export interface SerializedConversationFeedState {
  readonly version: string;                        // Schema version (e.g., '1.0.0')
  readonly sessionId: string;                      // Session identifier
  readonly currentMode: ResponseMode;              // Current response mode
  readonly messages: SerializedMessage[];          // Messages with date strings
  readonly lastMessageAt: string | null;           // ISO 8601 date string
  readonly messageCount: number;                   // Total message count
}

/**
 * Serialized message (dates as strings)
 */
interface SerializedMessage {
  readonly id: string;
  readonly messageType: 'transcription' | 'chat';
  readonly content: string;
  readonly timestamp: string;  // ISO 8601 date string
  readonly sender: 'user' | 'agent';
  readonly confidence?: number;
  readonly isFinal?: boolean;
  readonly language?: string;
  readonly deliveryMethod?: 'data-channel';
}

/**
 * Factory: Create empty conversation feed state
 */
export function createEmptyConversationFeed(
  sessionId: string,
  currentMode: ResponseMode = 'voice'
): ConversationFeedState {
  return {
    messages: [],
    currentMode,
    sessionId,
    lastMessageAt: null,
    messageCount: 0
  };
}

/**
 * Serialize conversation feed state to JSON
 */
export function serializeConversationFeed(
  state: ConversationFeedState
): string {
  const serialized: SerializedConversationFeedState = {
    version: '1.0.0',
    sessionId: state.sessionId,
    currentMode: state.currentMode,
    messages: state.messages.map(msg => ({
      ...msg,
      timestamp: msg.timestamp.toISOString()
    })),
    lastMessageAt: state.lastMessageAt?.toISOString() || null,
    messageCount: state.messageCount
  };
  
  return JSON.stringify(serialized);
}

/**
 * Deserialize conversation feed state from JSON
 * Returns null if deserialization fails
 */
export function deserializeConversationFeed(
  json: string
): ConversationFeedState | null {
  try {
    const data: SerializedConversationFeedState = JSON.parse(json);
    
    // Validate version
    if (data.version !== '1.0.0') {
      console.warn('Unknown conversation feed version:', data.version);
      return null;
    }
    
    // Convert date strings to Date objects
    const messages: UnifiedConversationMessage[] = data.messages.map((msg: any) => ({
      ...msg,
      timestamp: new Date(msg.timestamp)
    }));
    
    return {
      messages,
      currentMode: data.currentMode,
      sessionId: data.sessionId,
      lastMessageAt: data.lastMessageAt ? new Date(data.lastMessageAt) : null,
      messageCount: data.messageCount
    };
  } catch (error) {
    console.error('Failed to deserialize conversation feed:', error);
    return null;
  }
}

/**
 * Validate conversation feed state
 * Throws error if invalid
 */
export function validateConversationFeed(
  state: ConversationFeedState
): void {
  if (!state.sessionId) {
    throw new Error('Session ID is required');
  }
  
  if (state.messageCount !== state.messages.length) {
    throw new Error('Message count mismatch');
  }
  
  if (!['voice', 'chat'].includes(state.currentMode)) {
    throw new Error(`Invalid response mode: ${state.currentMode}`);
  }
  
  // Validate messages are sorted by timestamp
  for (let i = 1; i < state.messages.length; i++) {
    const prev = state.messages[i - 1];
    const curr = state.messages[i];
    if (prev.timestamp.getTime() > curr.timestamp.getTime()) {
      throw new Error('Messages must be sorted by timestamp');
    }
  }
}
