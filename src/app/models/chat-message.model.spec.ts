/**
 * Unit tests for chat-message.model.ts factory functions
 */
import {
  ChatMessageState,
  MessageSender,
  createUserMessage,
  createAgentMessage,
  createEmptyChatHistory,
} from './chat-message.model';

describe('ChatMessage Model', () => {
  describe('createUserMessage', () => {
    it('should create message with user as sender', () => {
      const message = createUserMessage('Hello');
      expect(message.sender).toBe('user');
    });

    it('should create message with provided content', () => {
      const content = 'Test message';
      const message = createUserMessage(content);
      expect(message.content).toBe(content);
    });

    it('should create message with current timestamp when not provided', () => {
      const before = new Date();
      const message = createUserMessage('Hello');
      const after = new Date();

      expect(message.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(message.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should create message with provided timestamp', () => {
      const timestamp = new Date('2025-01-01T12:00:00Z');
      const message = createUserMessage('Hello', timestamp);
      expect(message.timestamp).toBe(timestamp);
    });

    it('should create message with unique ID', () => {
      const message1 = createUserMessage('Hello');
      const message2 = createUserMessage('Hello');
      expect(message1.id).not.toBe(message2.id);
    });

    it('should create message with isLocal set to false', () => {
      const message = createUserMessage('Hello');
      expect(message.isLocal).toBe(false);
    });
  });

  describe('createAgentMessage', () => {
    it('should create message with agent as sender', () => {
      const message = createAgentMessage('Hello');
      expect(message.sender).toBe('agent');
    });

    it('should create message with provided content', () => {
      const content = 'Test response';
      const message = createAgentMessage(content);
      expect(message.content).toBe(content);
    });

    it('should create message with current timestamp when not provided', () => {
      const before = new Date();
      const message = createAgentMessage('Hello');
      const after = new Date();

      expect(message.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(message.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should create message with provided Date timestamp', () => {
      const timestamp = new Date('2025-01-01T12:00:00Z');
      const message = createAgentMessage('Hello', timestamp);
      expect(message.timestamp).toBe(timestamp);
    });

    it('should create message with provided number timestamp (Unix milliseconds)', () => {
      const unixTimestamp = 1704110400000; // 2024-01-01T12:00:00Z
      const message = createAgentMessage('Hello', unixTimestamp);
      expect(message.timestamp.getTime()).toBe(unixTimestamp);
    });

    it('should create message with unique ID', () => {
      const message1 = createAgentMessage('Hello');
      const message2 = createAgentMessage('Hello');
      expect(message1.id).not.toBe(message2.id);
    });

    it('should create message with isLocal set to false', () => {
      const message = createAgentMessage('Hello');
      expect(message.isLocal).toBe(false);
    });
  });

  describe('createEmptyChatHistory', () => {
    it('should create history with empty messages array', () => {
      const history = createEmptyChatHistory();
      expect(history.messages).toEqual([]);
      expect(history.messages.length).toBe(0);
    });

    it('should create history with null lastMessageAt', () => {
      const history = createEmptyChatHistory();
      expect(history.lastMessageAt).toBeNull();
    });
  });

  describe('MessageSender type', () => {
    it('should allow "user" and "agent" values', () => {
      const userSender: MessageSender = 'user';
      const agentSender: MessageSender = 'agent';
      expect(userSender).toBe('user');
      expect(agentSender).toBe('agent');
    });
  });

  describe('ChatMessageState interface', () => {
    it('should support all required properties', () => {
      const message: ChatMessageState = {
        id: '123',
        content: 'Test',
        timestamp: new Date(),
        sender: 'user',
        isLocal: false,
      };

      expect(message.id).toBe('123');
      expect(message.content).toBe('Test');
      expect(message.sender).toBe('user');
      expect(message.isLocal).toBe(false);
    });

    it('should allow isLocal to be optional', () => {
      const message: ChatMessageState = {
        id: '123',
        content: 'Test',
        timestamp: new Date(),
        sender: 'agent',
      };

      expect(message.isLocal).toBeUndefined();
    });
  });
});
