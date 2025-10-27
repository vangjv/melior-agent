/**
 * Unit Tests: Message Merger Utility
 * Feature: 005-unified-conversation
 */

import {
  sortMessagesByTimestamp,
  deduplicateMessages,
  replaceInterimWithFinal,
  mergeMessages,
  addMessage,
  filterOutInterim,
  getMessagesInRange,
  groupMessagesBySender
} from './message-merger.util';
import { createTranscriptionMessage, createChatMessage } from '../models/unified-conversation-message.model';

describe('Message Merger Utility', () => {
  describe('sortMessagesByTimestamp', () => {
    it('should sort messages in ascending order', () => {
      const msg1 = createTranscriptionMessage('user', 'First', true, undefined, undefined, new Date('2025-01-01T10:00:00Z'));
      const msg2 = createChatMessage('agent', 'Second', new Date('2025-01-01T10:01:00Z'));
      const msg3 = createTranscriptionMessage('user', 'Third', true, undefined, undefined, new Date('2025-01-01T10:02:00Z'));

      const unsorted = [msg3, msg1, msg2];
      const sorted = sortMessagesByTimestamp(unsorted);

      expect(sorted[0]).toBe(msg1);
      expect(sorted[1]).toBe(msg2);
      expect(sorted[2]).toBe(msg3);
    });

    it('should not mutate original array', () => {
      const msg1 = createChatMessage('user', 'Test1', new Date('2025-01-01T10:01:00Z'));
      const msg2 = createChatMessage('user', 'Test2', new Date('2025-01-01T10:00:00Z'));

      const original = [msg1, msg2];
      const sorted = sortMessagesByTimestamp(original);

      expect(original[0]).toBe(msg1);
      expect(sorted[0]).toBe(msg2);
    });

    it('should handle empty array', () => {
      const sorted = sortMessagesByTimestamp([]);

      expect(sorted).toEqual([]);
    });

    it('should handle single message', () => {
      const msg = createChatMessage('user', 'Test');
      const sorted = sortMessagesByTimestamp([msg]);

      expect(sorted).toEqual([msg]);
    });

    it('should preserve order for same timestamps', () => {
      const timestamp = new Date('2025-01-01T10:00:00Z');
      const msg1 = createChatMessage('user', 'First', timestamp);
      const msg2 = createChatMessage('agent', 'Second', timestamp);

      const sorted = sortMessagesByTimestamp([msg1, msg2]);

      expect(sorted.length).toBe(2);
      // Order should be stable
      expect(sorted[0]).toBe(msg1);
      expect(sorted[1]).toBe(msg2);
    });
  });

  describe('deduplicateMessages', () => {
    it('should remove duplicate IDs', () => {
      const msg1 = createChatMessage('user', 'Test');
      const msg2 = { ...msg1 }; // Same ID
      const msg3 = createChatMessage('agent', 'Different');

      const messages = [msg1, msg2, msg3];
      const deduplicated = deduplicateMessages(messages);

      expect(deduplicated.length).toBe(2);
      expect(deduplicated).toContain(msg1);
      expect(deduplicated).toContain(msg3);
    });

    it('should keep first occurrence', () => {
      const msg = createChatMessage('user', 'Original');
      const duplicate = { ...msg, content: 'Modified' };

      const messages = [msg, duplicate];
      const deduplicated = deduplicateMessages(messages);

      expect(deduplicated.length).toBe(1);
      expect(deduplicated[0].content).toBe('Original');
    });

    it('should handle empty array', () => {
      const deduplicated = deduplicateMessages([]);

      expect(deduplicated).toEqual([]);
    });

    it('should handle no duplicates', () => {
      const msg1 = createChatMessage('user', 'Test1');
      const msg2 = createChatMessage('user', 'Test2');
      const msg3 = createChatMessage('user', 'Test3');

      const messages = [msg1, msg2, msg3];
      const deduplicated = deduplicateMessages(messages);

      expect(deduplicated.length).toBe(3);
    });
  });

  describe('replaceInterimWithFinal', () => {
    it('should replace interim with final transcription', () => {
      const interim = createTranscriptionMessage('user', 'Partial', false, undefined, undefined, new Date('2025-01-01T10:00:00.000Z'));
      const final = createTranscriptionMessage('user', 'Complete text', true, undefined, undefined, new Date('2025-01-01T10:00:00.200Z'));

      const messages = [interim];
      const updated = replaceInterimWithFinal(messages, final);

      expect(updated.length).toBe(1);
      expect(updated[0]).toBe(final);
      expect(updated[0].content).toBe('Complete text');
      expect(updated[0].messageType).toBe('transcription');
    });

    it('should match within 500ms tolerance', () => {
      const interim = createTranscriptionMessage('user', 'Partial', false, undefined, undefined, new Date('2025-01-01T10:00:00.000Z'));
      const final = createTranscriptionMessage('user', 'Complete', true, undefined, undefined, new Date('2025-01-01T10:00:00.499Z'));

      const messages = [interim];
      const updated = replaceInterimWithFinal(messages, final);

      expect(updated.length).toBe(1);
      expect(updated[0]).toBe(final);
    });

    it('should not replace if beyond tolerance', () => {
      const interim = createTranscriptionMessage('user', 'Partial', false, undefined, undefined, new Date('2025-01-01T10:00:00.000Z'));
      const final = createTranscriptionMessage('user', 'Complete', true, undefined, undefined, new Date('2025-01-01T10:00:00.501Z'));

      const messages = [interim];
      const updated = replaceInterimWithFinal(messages, final);

      expect(updated.length).toBe(2);
      expect(updated).toContain(interim);
      expect(updated).toContain(final);
    });

    it('should not replace if sender differs', () => {
      const interim = createTranscriptionMessage('user', 'Partial', false, undefined, undefined, new Date('2025-01-01T10:00:00.000Z'));
      const final = createTranscriptionMessage('agent', 'Complete', true, undefined, undefined, new Date('2025-01-01T10:00:00.100Z'));

      const messages = [interim];
      const updated = replaceInterimWithFinal(messages, final);

      expect(updated.length).toBe(2);
    });

    it('should add message if not final transcription', () => {
      const msg1 = createChatMessage('user', 'Test1');
      const msg2 = createChatMessage('agent', 'Test2');

      const messages = [msg1];
      const updated = replaceInterimWithFinal(messages, msg2);

      expect(updated.length).toBe(2);
      expect(updated).toContain(msg1);
      expect(updated).toContain(msg2);
    });

    it('should add if no interim found', () => {
      const msg1 = createChatMessage('user', 'Test1');
      const final = createTranscriptionMessage('user', 'Test2', true);

      const messages = [msg1];
      const updated = replaceInterimWithFinal(messages, final);

      expect(updated.length).toBe(2);
    });
  });

  describe('mergeMessages', () => {
    it('should merge and sort messages', () => {
      const msg1 = createChatMessage('user', 'Test1', new Date('2025-01-01T10:00:00Z'));
      const msg2 = createChatMessage('agent', 'Test2', new Date('2025-01-01T10:02:00Z'));
      const msg3 = createChatMessage('user', 'Test3', new Date('2025-01-01T10:01:00Z'));

      const existing = [msg1];
      const newMessages = [msg2, msg3];
      const merged = mergeMessages(existing, newMessages);

      expect(merged.length).toBe(3);
      expect(merged[0]).toBe(msg1);
      expect(merged[1]).toBe(msg3);
      expect(merged[2]).toBe(msg2);
    });

    it('should deduplicate merged messages', () => {
      const msg1 = createChatMessage('user', 'Test1');
      const msg2 = createChatMessage('agent', 'Test2');
      const msg1Duplicate = { ...msg1 };

      const existing = [msg1, msg2];
      const newMessages = [msg1Duplicate];
      const merged = mergeMessages(existing, newMessages);

      expect(merged.length).toBe(2);
    });

    it('should handle empty arrays', () => {
      const msg = createChatMessage('user', 'Test');

      expect(mergeMessages([], [])).toEqual([]);
      expect(mergeMessages([msg], [])).toEqual([msg]);
      expect(mergeMessages([], [msg])).toEqual([msg]);
    });
  });

  describe('addMessage', () => {
    it('should add and sort message', () => {
      const msg1 = createChatMessage('user', 'Test1', new Date('2025-01-01T10:00:00Z'));
      const msg2 = createChatMessage('agent', 'Test2', new Date('2025-01-01T10:02:00Z'));
      const msg3 = createChatMessage('user', 'Test3', new Date('2025-01-01T10:01:00Z'));

      const messages = [msg1, msg2];
      const updated = addMessage(messages, msg3);

      expect(updated[0]).toBe(msg1);
      expect(updated[1]).toBe(msg3);
      expect(updated[2]).toBe(msg2);
    });

    it('should handle interim replacement', () => {
      const interim = createTranscriptionMessage('user', 'Partial', false, undefined, undefined, new Date('2025-01-01T10:00:00.000Z'));
      const final = createTranscriptionMessage('user', 'Complete', true, undefined, undefined, new Date('2025-01-01T10:00:00.100Z'));

      const messages = [interim];
      const updated = addMessage(messages, final);

      expect(updated.length).toBe(1);
      expect(updated[0]).toBe(final);
    });

    it('should deduplicate when adding', () => {
      const msg = createChatMessage('user', 'Test');
      const duplicate = { ...msg };

      const messages = [msg];
      const updated = addMessage(messages, duplicate);

      expect(updated.length).toBe(1);
    });
  });

  describe('filterOutInterim', () => {
    it('should remove interim transcriptions', () => {
      const final = createTranscriptionMessage('user', 'Final', true);
      const interim = createTranscriptionMessage('user', 'Interim', false);
      const chat = createChatMessage('agent', 'Chat');

      const messages = [final, interim, chat];
      const filtered = filterOutInterim(messages);

      expect(filtered.length).toBe(2);
      expect(filtered).toContain(final);
      expect(filtered).toContain(chat);
      expect(filtered).not.toContain(interim);
    });

    it('should keep all chat messages', () => {
      const msg1 = createChatMessage('user', 'Test1');
      const msg2 = createChatMessage('agent', 'Test2');

      const filtered = filterOutInterim([msg1, msg2]);

      expect(filtered.length).toBe(2);
    });

    it('should handle empty array', () => {
      const filtered = filterOutInterim([]);

      expect(filtered).toEqual([]);
    });
  });

  describe('getMessagesInRange', () => {
    it('should return messages within time range', () => {
      const msg1 = createChatMessage('user', 'Test1', new Date('2025-01-01T10:00:00Z'));
      const msg2 = createChatMessage('agent', 'Test2', new Date('2025-01-01T10:01:00Z'));
      const msg3 = createChatMessage('user', 'Test3', new Date('2025-01-01T10:02:00Z'));

      const messages = [msg1, msg2, msg3];
      const start = new Date('2025-01-01T09:59:00Z');
      const end = new Date('2025-01-01T10:01:30Z');

      const inRange = getMessagesInRange(messages, start, end);

      expect(inRange.length).toBe(2);
      expect(inRange).toContain(msg1);
      expect(inRange).toContain(msg2);
    });

    it('should handle empty results', () => {
      const msg = createChatMessage('user', 'Test', new Date('2025-01-01T10:00:00Z'));
      const start = new Date('2025-01-01T11:00:00Z');
      const end = new Date('2025-01-01T12:00:00Z');

      const inRange = getMessagesInRange([msg], start, end);

      expect(inRange).toEqual([]);
    });
  });

  describe('groupMessagesBySender', () => {
    it('should group consecutive messages from same sender', () => {
      const msg1 = createChatMessage('user', 'Test1');
      const msg2 = createChatMessage('user', 'Test2');
      const msg3 = createChatMessage('agent', 'Test3');
      const msg4 = createChatMessage('user', 'Test4');

      const groups = groupMessagesBySender([msg1, msg2, msg3, msg4]);

      expect(groups.length).toBe(3);
      expect(groups[0]).toEqual([msg1, msg2]);
      expect(groups[1]).toEqual([msg3]);
      expect(groups[2]).toEqual([msg4]);
    });

    it('should handle single message', () => {
      const msg = createChatMessage('user', 'Test');
      const groups = groupMessagesBySender([msg]);

      expect(groups.length).toBe(1);
      expect(groups[0]).toEqual([msg]);
    });

    it('should handle empty array', () => {
      const groups = groupMessagesBySender([]);

      expect(groups).toEqual([]);
    });
  });
});
