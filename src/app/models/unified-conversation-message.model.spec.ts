/**
 * Unit Tests: Unified Conversation Message Model
 * Feature: 005-unified-conversation
 */

import {
  UnifiedConversationMessage,
  TranscriptionConversationMessage,
  ChatConversationMessage,
  MessageSender,
  isTranscriptionMessage,
  isChatMessage,
  isValidSender,
  createTranscriptionMessage,
  createChatMessage,
  validateMessageContent,
  validateConfidence
} from './unified-conversation-message.model';

describe('UnifiedConversationMessage Model', () => {
  describe('Type Guards', () => {
    it('should identify transcription messages', () => {
      const message: TranscriptionConversationMessage = {
        id: 'test-id',
        messageType: 'transcription',
        content: 'Hello world',
        timestamp: new Date(),
        sender: 'user',
        isFinal: true
      };

      expect(isTranscriptionMessage(message)).toBe(true);
      expect(isChatMessage(message)).toBe(false);
    });

    it('should identify chat messages', () => {
      const message: ChatConversationMessage = {
        id: 'test-id',
        messageType: 'chat',
        content: 'Hello world',
        timestamp: new Date(),
        sender: 'agent',
        deliveryMethod: 'data-channel'
      };

      expect(isChatMessage(message)).toBe(true);
      expect(isTranscriptionMessage(message)).toBe(false);
    });

    it('should validate message sender', () => {
      expect(isValidSender('user')).toBe(true);
      expect(isValidSender('agent')).toBe(true);
      expect(isValidSender('invalid')).toBe(false);
      expect(isValidSender(null)).toBe(false);
      expect(isValidSender(undefined)).toBe(false);
    });
  });

  describe('Factory Functions', () => {
    describe('createTranscriptionMessage', () => {
      it('should create transcription message with required fields', () => {
        const message = createTranscriptionMessage('user', 'Hello', true);

        expect(message.id).toBeTruthy();
        expect(message.messageType).toBe('transcription');
        expect(message.content).toBe('Hello');
        expect(message.sender).toBe('user');
        expect(message.isFinal).toBe(true);
        expect(message.timestamp).toBeInstanceOf(Date);
      });

      it('should create transcription message with optional fields', () => {
        const timestamp = new Date('2025-01-01');
        const message = createTranscriptionMessage(
          'agent',
          'Test message',
          false,
          0.95,
          'en-US',
          timestamp
        );

        expect(message.confidence).toBe(0.95);
        expect(message.language).toBe('en-US');
        expect(message.timestamp).toBe(timestamp);
        expect(message.isFinal).toBe(false);
      });

      it('should generate unique IDs for each message', () => {
        const msg1 = createTranscriptionMessage('user', 'Test 1', true);
        const msg2 = createTranscriptionMessage('user', 'Test 2', true);

        expect(msg1.id).not.toBe(msg2.id);
      });

      it('should handle interim transcriptions', () => {
        const message = createTranscriptionMessage('user', 'Partial text', false);

        expect(message.isFinal).toBe(false);
        expect(message.content).toBe('Partial text');
      });
    });

    describe('createChatMessage', () => {
      it('should create chat message with required fields', () => {
        const message = createChatMessage('user', 'Hello');

        expect(message.id).toBeTruthy();
        expect(message.messageType).toBe('chat');
        expect(message.content).toBe('Hello');
        expect(message.sender).toBe('user');
        expect(message.deliveryMethod).toBe('data-channel');
        expect(message.timestamp).toBeInstanceOf(Date);
      });

      it('should accept Date object for timestamp', () => {
        const timestamp = new Date('2025-01-01');
        const message = createChatMessage('agent', 'Test', timestamp);

        expect(message.timestamp).toBe(timestamp);
      });

      it('should accept number for timestamp', () => {
        const timestampMs = Date.now();
        const message = createChatMessage('agent', 'Test', timestampMs);

        expect(message.timestamp.getTime()).toBe(timestampMs);
      });

      it('should generate unique IDs for each message', () => {
        const msg1 = createChatMessage('user', 'Test 1');
        const msg2 = createChatMessage('user', 'Test 2');

        expect(msg1.id).not.toBe(msg2.id);
      });
    });
  });

  describe('Validation Functions', () => {
    describe('validateMessageContent', () => {
      it('should accept valid content', () => {
        expect(validateMessageContent('Hello')).toBe(true);
        expect(validateMessageContent('a')).toBe(true);
        expect(validateMessageContent('Long message content')).toBe(true);
      });

      it('should reject empty content', () => {
        expect(validateMessageContent('')).toBe(false);
      });

      it('should reject non-string content', () => {
        expect(validateMessageContent(null as any)).toBe(false);
        expect(validateMessageContent(undefined as any)).toBe(false);
        expect(validateMessageContent(123 as any)).toBe(false);
      });
    });

    describe('validateConfidence', () => {
      it('should accept valid confidence values', () => {
        expect(validateConfidence(0)).toBe(true);
        expect(validateConfidence(0.5)).toBe(true);
        expect(validateConfidence(1)).toBe(true);
        expect(validateConfidence(undefined)).toBe(true);
      });

      it('should reject out-of-range values', () => {
        expect(validateConfidence(-0.1)).toBe(false);
        expect(validateConfidence(1.1)).toBe(false);
        expect(validateConfidence(2)).toBe(false);
      });

      it('should reject non-number values', () => {
        expect(validateConfidence('0.5' as any)).toBe(false);
        expect(validateConfidence(null as any)).toBe(false);
      });
    });
  });

  describe('Message Type Discrimination', () => {
    it('should narrow type for transcription messages', () => {
      const message: UnifiedConversationMessage = createTranscriptionMessage(
        'user',
        'Test',
        true,
        0.9,
        'en-US'
      );

      if (isTranscriptionMessage(message)) {
        // TypeScript should know this is TranscriptionConversationMessage
        expect(message.confidence).toBe(0.9);
        expect(message.language).toBe('en-US');
        expect(message.isFinal).toBe(true);
      } else {
        fail('Should be transcription message');
      }
    });

    it('should narrow type for chat messages', () => {
      const message: UnifiedConversationMessage = createChatMessage('agent', 'Test');

      if (isChatMessage(message)) {
        // TypeScript should know this is ChatConversationMessage
        expect(message.deliveryMethod).toBe('data-channel');
      } else {
        fail('Should be chat message');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty transcription text', () => {
      const message = createTranscriptionMessage('user', '', false);

      expect(message.content).toBe('');
      expect(validateMessageContent(message.content)).toBe(false);
    });

    it('should handle zero confidence', () => {
      const message = createTranscriptionMessage('user', 'Test', true, 0);

      expect(message.confidence).toBe(0);
      expect(validateConfidence(message.confidence)).toBe(true);
    });

    it('should handle very long messages', () => {
      const longText = 'a'.repeat(10000);
      const message = createChatMessage('user', longText);

      expect(message.content.length).toBe(10000);
      expect(validateMessageContent(message.content)).toBe(true);
    });
  });
});
