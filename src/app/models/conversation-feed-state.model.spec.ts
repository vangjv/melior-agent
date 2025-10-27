/**
 * Unit Tests: Conversation Feed State Model
 * Feature: 005-unified-conversation
 */

import {
  ConversationFeedState,
  createEmptyConversationFeed,
  serializeConversationFeed,
  deserializeConversationFeed,
  validateConversationFeed
} from './conversation-feed-state.model';
import { createTranscriptionMessage, createChatMessage } from './unified-conversation-message.model';

describe('ConversationFeedState Model', () => {
  describe('createEmptyConversationFeed', () => {
    it('should create empty feed with default mode', () => {
      const feed = createEmptyConversationFeed('session-123');

      expect(feed.sessionId).toBe('session-123');
      expect(feed.currentMode).toBe('voice');
      expect(feed.messages).toEqual([]);
      expect(feed.messageCount).toBe(0);
      expect(feed.lastMessageAt).toBeNull();
    });

    it('should create empty feed with specified mode', () => {
      const feed = createEmptyConversationFeed('session-123', 'chat');

      expect(feed.currentMode).toBe('chat');
    });
  });

  describe('serializeConversationFeed', () => {
    it('should serialize empty feed', () => {
      const feed = createEmptyConversationFeed('session-123');
      const json = serializeConversationFeed(feed);
      const parsed = JSON.parse(json);

      expect(parsed.version).toBe('1.0.0');
      expect(parsed.sessionId).toBe('session-123');
      expect(parsed.currentMode).toBe('voice');
      expect(parsed.messages).toEqual([]);
      expect(parsed.messageCount).toBe(0);
      expect(parsed.lastMessageAt).toBeNull();
    });

    it('should serialize feed with messages', () => {
      const timestamp = new Date('2025-01-01T12:00:00.000Z');
      const message1 = createTranscriptionMessage('user', 'Hello', true, 0.95, 'en-US', timestamp);
      const message2 = createChatMessage('agent', 'Hi there', timestamp);

      const feed: ConversationFeedState = {
        sessionId: 'session-123',
        currentMode: 'chat',
        messages: [message1, message2],
        messageCount: 2,
        lastMessageAt: timestamp
      };

      const json = serializeConversationFeed(feed);
      const parsed = JSON.parse(json);

      expect(parsed.messages.length).toBe(2);
      expect(parsed.messages[0].timestamp).toBe('2025-01-01T12:00:00.000Z');
      expect(parsed.messages[0].messageType).toBe('transcription');
      expect(parsed.messages[0].confidence).toBe(0.95);
      expect(parsed.messages[1].messageType).toBe('chat');
      expect(parsed.lastMessageAt).toBe('2025-01-01T12:00:00.000Z');
    });

    it('should preserve all message properties', () => {
      const message = createTranscriptionMessage('agent', 'Test', false, 0.8, 'fr-FR');
      const feed: ConversationFeedState = {
        sessionId: 'session-123',
        currentMode: 'voice',
        messages: [message],
        messageCount: 1,
        lastMessageAt: message.timestamp
      };

      const json = serializeConversationFeed(feed);
      const parsed = JSON.parse(json);

      expect(parsed.messages[0].id).toBe(message.id);
      expect(parsed.messages[0].content).toBe('Test');
      expect(parsed.messages[0].sender).toBe('agent');
      expect(parsed.messages[0].isFinal).toBe(false);
      expect(parsed.messages[0].confidence).toBe(0.8);
      expect(parsed.messages[0].language).toBe('fr-FR');
    });
  });

  describe('deserializeConversationFeed', () => {
    it('should deserialize empty feed', () => {
      const original = createEmptyConversationFeed('session-123');
      const json = serializeConversationFeed(original);
      const deserialized = deserializeConversationFeed(json);

      expect(deserialized).not.toBeNull();
      expect(deserialized!.sessionId).toBe('session-123');
      expect(deserialized!.currentMode).toBe('voice');
      expect(deserialized!.messages).toEqual([]);
      expect(deserialized!.messageCount).toBe(0);
      expect(deserialized!.lastMessageAt).toBeNull();
    });

    it('should deserialize feed with messages', () => {
      const timestamp = new Date('2025-01-01T12:00:00.000Z');
      const message1 = createTranscriptionMessage('user', 'Hello', true, undefined, undefined, timestamp);
      const message2 = createChatMessage('agent', 'Hi', timestamp);

      const original: ConversationFeedState = {
        sessionId: 'session-123',
        currentMode: 'chat',
        messages: [message1, message2],
        messageCount: 2,
        lastMessageAt: timestamp
      };

      const json = serializeConversationFeed(original);
      const deserialized = deserializeConversationFeed(json);

      expect(deserialized).not.toBeNull();
      expect(deserialized!.messages.length).toBe(2);
      expect(deserialized!.messages[0].content).toBe('Hello');
      expect(deserialized!.messages[0].timestamp).toBeInstanceOf(Date);
      expect(deserialized!.messages[0].timestamp.getTime()).toBe(timestamp.getTime());
      expect(deserialized!.lastMessageAt).toBeInstanceOf(Date);
      expect(deserialized!.lastMessageAt!.getTime()).toBe(timestamp.getTime());
    });

    it('should return null for invalid JSON', () => {
      const result = deserializeConversationFeed('invalid json');

      expect(result).toBeNull();
    });

    it('should return null for unknown version', () => {
      const json = JSON.stringify({
        version: '2.0.0',
        sessionId: 'test',
        currentMode: 'voice',
        messages: [],
        messageCount: 0,
        lastMessageAt: null
      });

      const result = deserializeConversationFeed(json);

      expect(result).toBeNull();
    });

    it('should convert date strings to Date objects', () => {
      const json = JSON.stringify({
        version: '1.0.0',
        sessionId: 'session-123',
        currentMode: 'voice',
        messages: [{
          id: 'test-id',
          messageType: 'chat',
          content: 'Test',
          timestamp: '2025-01-01T12:00:00.000Z',
          sender: 'user',
          deliveryMethod: 'data-channel'
        }],
        messageCount: 1,
        lastMessageAt: '2025-01-01T12:00:00.000Z'
      });

      const result = deserializeConversationFeed(json);

      expect(result).not.toBeNull();
      expect(result!.messages[0].timestamp).toBeInstanceOf(Date);
      expect(result!.lastMessageAt).toBeInstanceOf(Date);
    });
  });

  describe('validateConversationFeed', () => {
    it('should validate valid feed', () => {
      const feed = createEmptyConversationFeed('session-123');

      expect(() => validateConversationFeed(feed)).not.toThrow();
    });

    it('should validate feed with sorted messages', () => {
      const msg1 = createTranscriptionMessage('user', 'First', true, undefined, undefined, new Date('2025-01-01T10:00:00.000Z'));
      const msg2 = createChatMessage('agent', 'Second', new Date('2025-01-01T10:01:00.000Z'));

      const feed: ConversationFeedState = {
        sessionId: 'session-123',
        currentMode: 'voice',
        messages: [msg1, msg2],
        messageCount: 2,
        lastMessageAt: msg2.timestamp
      };

      expect(() => validateConversationFeed(feed)).not.toThrow();
    });

    it('should throw for missing sessionId', () => {
      const feed: ConversationFeedState = {
        sessionId: '',
        currentMode: 'voice',
        messages: [],
        messageCount: 0,
        lastMessageAt: null
      };

      expect(() => validateConversationFeed(feed)).toThrow('Session ID is required');
    });

    it('should throw for message count mismatch', () => {
      const feed: ConversationFeedState = {
        sessionId: 'session-123',
        currentMode: 'voice',
        messages: [],
        messageCount: 5,
        lastMessageAt: null
      };

      expect(() => validateConversationFeed(feed)).toThrow('Message count mismatch');
    });

    it('should throw for invalid response mode', () => {
      const feed: ConversationFeedState = {
        sessionId: 'session-123',
        currentMode: 'invalid' as any,
        messages: [],
        messageCount: 0,
        lastMessageAt: null
      };

      expect(() => validateConversationFeed(feed)).toThrow('Invalid response mode');
    });

    it('should throw for unsorted messages', () => {
      const msg1 = createTranscriptionMessage('user', 'First', true, undefined, undefined, new Date('2025-01-01T10:01:00.000Z'));
      const msg2 = createChatMessage('agent', 'Second', new Date('2025-01-01T10:00:00.000Z'));

      const feed: ConversationFeedState = {
        sessionId: 'session-123',
        currentMode: 'voice',
        messages: [msg1, msg2], // Out of order
        messageCount: 2,
        lastMessageAt: msg2.timestamp
      };

      expect(() => validateConversationFeed(feed)).toThrow('Messages must be sorted by timestamp');
    });
  });

  describe('Serialization Round-Trip', () => {
    it('should preserve data through serialize/deserialize cycle', () => {
      const timestamp1 = new Date('2025-01-01T10:00:00.000Z');
      const timestamp2 = new Date('2025-01-01T10:01:00.000Z');
      const msg1 = createTranscriptionMessage('user', 'Hello', true, 0.95, 'en-US', timestamp1);
      const msg2 = createChatMessage('agent', 'Hi there', timestamp2);

      const original: ConversationFeedState = {
        sessionId: 'session-123',
        currentMode: 'chat',
        messages: [msg1, msg2],
        messageCount: 2,
        lastMessageAt: timestamp2
      };

      const json = serializeConversationFeed(original);
      const restored = deserializeConversationFeed(json);

      expect(restored).not.toBeNull();
      expect(restored!.sessionId).toBe(original.sessionId);
      expect(restored!.currentMode).toBe(original.currentMode);
      expect(restored!.messageCount).toBe(original.messageCount);
      expect(restored!.messages.length).toBe(original.messages.length);
      expect(restored!.messages[0].id).toBe(msg1.id);
      expect(restored!.messages[1].id).toBe(msg2.id);
      expect(restored!.lastMessageAt!.getTime()).toBe(timestamp2.getTime());
    });
  });
});
