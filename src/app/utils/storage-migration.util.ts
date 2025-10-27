/**
 * Storage Migration Utility
 * Feature: 005-unified-conversation
 *
 * Converts legacy chat-storage format to unified conversation format
 */

import { UnifiedConversationMessage, createChatMessage } from '../models/unified-conversation-message.model';
import {
  ConversationFeedState,
  createEmptyConversationFeed,
  serializeConversationFeed,
  deserializeConversationFeed
} from '../models/conversation-feed-state.model';
import { ChatMessageState } from '../models/chat-message.model';

/**
 * Legacy chat storage format interface
 */
interface LegacyChatStorage {
  messages: ChatMessageState[];
}

/**
 * Check if sessionStorage contains legacy chat data
 */
export function hasLegacyChatData(): boolean {
  try {
    const data = sessionStorage.getItem('chat-storage');
    return data !== null;
  } catch {
    return false;
  }
}

/**
 * Migrate legacy chat message to unified format
 */
export function migrateLegacyMessage(
  legacyMessage: ChatMessageState
): UnifiedConversationMessage {
  return createChatMessage(
    legacyMessage.sender,
    legacyMessage.content,
    legacyMessage.timestamp
  );
}

/**
 * Migrate legacy chat storage to unified conversation format
 *
 * @param sessionId - Session ID for the new unified format
 * @returns Migrated ConversationFeedState or null if migration fails
 */
export function migrateLegacyChatStorage(
  sessionId: string
): ConversationFeedState | null {
  try {
    const legacyData = sessionStorage.getItem('chat-storage');

    if (!legacyData) {
      return null;
    }

    const parsed: LegacyChatStorage = JSON.parse(legacyData);

    if (!parsed.messages || !Array.isArray(parsed.messages)) {
      console.warn('Legacy chat storage has invalid format');
      return null;
    }

    // Convert legacy messages to unified format
    const messages: UnifiedConversationMessage[] = parsed.messages.map(legacyMsg => {
      // Handle legacy messages that might have timestamp as string
      const timestamp = typeof legacyMsg.timestamp === 'string'
        ? new Date(legacyMsg.timestamp)
        : legacyMsg.timestamp;

      return createChatMessage(
        legacyMsg.sender,
        legacyMsg.content,
        timestamp
      );
    });

    // Determine last message timestamp
    const lastMessageAt = messages.length > 0
      ? messages[messages.length - 1].timestamp
      : null;

    // Create unified conversation feed state
    const feedState: ConversationFeedState = {
      sessionId,
      currentMode: 'chat', // Legacy was chat-only
      messages,
      messageCount: messages.length,
      lastMessageAt
    };

    return feedState;
  } catch (error) {
    console.error('Failed to migrate legacy chat storage:', error);
    return null;
  }
}

/**
 * Migrate and remove legacy storage
 * Saves migrated data to new format and removes old format
 *
 * @param storageKey - Key for the new unified storage
 * @param sessionId - Session ID for the new format
 * @returns True if migration was successful
 */
export function migrateAndCleanup(
  storageKey: string,
  sessionId: string
): boolean {
  try {
    const migrated = migrateLegacyChatStorage(sessionId);

    if (!migrated) {
      return false;
    }

    // Save to new format
    const serialized = serializeConversationFeed(migrated);
    sessionStorage.setItem(storageKey, serialized);

    // Remove legacy storage
    sessionStorage.removeItem('chat-storage');

    console.log(`Migrated ${migrated.messageCount} messages from legacy storage`);
    return true;
  } catch (error) {
    console.error('Migration and cleanup failed:', error);
    return false;
  }
}

/**
 * Get storage key for unified conversation
 */
export function getUnifiedStorageKey(sessionId: string): string {
  return `melior-conversation-${sessionId}`;
}

/**
 * Check if unified storage exists for session
 */
export function hasUnifiedStorage(sessionId: string): boolean {
  try {
    const key = getUnifiedStorageKey(sessionId);
    const data = sessionStorage.getItem(key);
    return data !== null;
  } catch {
    return false;
  }
}

/**
 * Attempt to load data with fallback to legacy migration
 *
 * @param sessionId - Current session ID
 * @returns ConversationFeedState or null
 */
export function loadWithMigrationFallback(
  sessionId: string
): ConversationFeedState | null {
  const key = getUnifiedStorageKey(sessionId);

  // Try loading unified format first
  try {
    const data = sessionStorage.getItem(key);

    if (data) {
      return deserializeConversationFeed(data);
    }
  } catch (error) {
    console.warn('Failed to load unified storage:', error);
  }

  // Fall back to legacy migration
  if (hasLegacyChatData()) {
    console.log('No unified storage found, attempting legacy migration');
    const migrated = migrateLegacyChatStorage(sessionId);

    if (migrated) {
      // Save migrated data
      try {
        const serialized = serializeConversationFeed(migrated);
        sessionStorage.setItem(key, serialized);
        sessionStorage.removeItem('chat-storage');
      } catch (error) {
        console.error('Failed to save migrated data:', error);
      }
    }

    return migrated;
  }

  return null;
}
