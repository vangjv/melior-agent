/**
 * Message Merger Utility
 * Feature: 005-unified-conversation
 *
 * Provides functions for sorting, deduplicating, and merging conversation messages
 */

import { UnifiedConversationMessage, isTranscriptionMessage } from '../models/unified-conversation-message.model';

/**
 * Sort messages by timestamp in ascending order (oldest first)
 */
export function sortMessagesByTimestamp(
  messages: UnifiedConversationMessage[]
): UnifiedConversationMessage[] {
  return [...messages].sort((a, b) =>
    a.timestamp.getTime() - b.timestamp.getTime()
  );
}

/**
 * Deduplicate messages by ID
 * Keeps first occurrence of each unique ID
 */
export function deduplicateMessages(
  messages: UnifiedConversationMessage[]
): UnifiedConversationMessage[] {
  const seen = new Set<string>();
  return messages.filter(msg => {
    if (seen.has(msg.id)) {
      return false;
    }
    seen.add(msg.id);
    return true;
  });
}

/**
 * Replace interim transcription with final transcription
 * Matches based on speaker and timestamp window (±500ms)
 *
 * @param messages - Current message array
 * @param finalMessage - Final transcription message to add
 * @returns Updated message array with interim replaced by final
 */
export function replaceInterimWithFinal(
  messages: UnifiedConversationMessage[],
  finalMessage: UnifiedConversationMessage
): UnifiedConversationMessage[] {
  if (!isTranscriptionMessage(finalMessage) || !finalMessage.isFinal) {
    // Not a final transcription, just add it
    return [...messages, finalMessage];
  }

  const TOLERANCE_MS = 500;
  const finalTimestamp = finalMessage.timestamp.getTime();

  // Find interim message to replace
  const interimIndex = messages.findIndex(msg => {
    if (!isTranscriptionMessage(msg) || msg.isFinal) {
      return false;
    }

    // Check if sender matches
    if (msg.sender !== finalMessage.sender) {
      return false;
    }

    // Check if within time window
    const timeDiff = Math.abs(msg.timestamp.getTime() - finalTimestamp);
    return timeDiff <= TOLERANCE_MS;
  });

  if (interimIndex === -1) {
    // No interim found, just add final
    return [...messages, finalMessage];
  }

  // Replace interim with final
  const updated = [...messages];
  updated[interimIndex] = finalMessage;
  return updated;
}

/**
 * Merge new messages into existing array
 * Handles deduplication and sorting
 *
 * @param existing - Current message array
 * @param newMessages - New messages to merge
 * @returns Merged and sorted message array
 */
export function mergeMessages(
  existing: UnifiedConversationMessage[],
  newMessages: UnifiedConversationMessage[]
): UnifiedConversationMessage[] {
  const combined = [...existing, ...newMessages];
  const deduplicated = deduplicateMessages(combined);
  return sortMessagesByTimestamp(deduplicated);
}

/**
 * Add single message to array with deduplication and sorting
 * Handles interim transcription replacement
 *
 * @param messages - Current message array
 * @param newMessage - New message to add
 * @returns Updated message array
 */
export function addMessage(
  messages: UnifiedConversationMessage[],
  newMessage: UnifiedConversationMessage
): UnifiedConversationMessage[] {
  // Check if it's a final transcription that might replace an interim
  if (isTranscriptionMessage(newMessage) && newMessage.isFinal) {
    const withReplacement = replaceInterimWithFinal(messages, newMessage);
    return sortMessagesByTimestamp(withReplacement);
  }

  // For other messages, just add and sort
  const updated = [...messages, newMessage];
  return sortMessagesByTimestamp(deduplicateMessages(updated));
}

/**
 * Filter out interim transcriptions
 * Used when displaying only final messages
 */
export function filterOutInterim(
  messages: UnifiedConversationMessage[]
): UnifiedConversationMessage[] {
  return messages.filter(msg => {
    if (!isTranscriptionMessage(msg)) {
      return true; // Keep non-transcription messages
    }
    return msg.isFinal; // Keep only final transcriptions
  });
}

/**
 * Get messages within time range
 * Useful for pagination or time-based filtering
 */
export function getMessagesInRange(
  messages: UnifiedConversationMessage[],
  startTime: Date,
  endTime: Date
): UnifiedConversationMessage[] {
  const startMs = startTime.getTime();
  const endMs = endTime.getTime();

  return messages.filter(msg => {
    const msgTime = msg.timestamp.getTime();
    return msgTime >= startMs && msgTime <= endMs;
  });
}

/**
 * Group messages by sender for conversation threading
 * Returns array of message groups where consecutive messages from same sender are grouped
 */
export function groupMessagesBySender(
  messages: UnifiedConversationMessage[]
): UnifiedConversationMessage[][] {
  if (messages.length === 0) {
    return [];
  }

  const groups: UnifiedConversationMessage[][] = [];
  let currentGroup: UnifiedConversationMessage[] = [messages[0]];

  for (let i = 1; i < messages.length; i++) {
    if (messages[i].sender === currentGroup[0].sender) {
      currentGroup.push(messages[i]);
    } else {
      groups.push(currentGroup);
      currentGroup = [messages[i]];
    }
  }

  groups.push(currentGroup);
  return groups;
}
