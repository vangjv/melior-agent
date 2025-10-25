/**
 * Unit tests for response-mode.model.ts type guards and factory functions
 */
import {
  ResponseMode,
  DEFAULT_RESPONSE_MODE,
  isValidResponseMode,
  createSetResponseModeMessage,
  isResponseModeUpdatedMessage,
  isAgentChatMessage,
  isIncomingMessage,
  BaseDataChannelMessage,
} from './response-mode.model';

describe('ResponseMode Model', () => {
  describe('isValidResponseMode', () => {
    it('should return true for "voice"', () => {
      expect(isValidResponseMode('voice')).toBe(true);
    });

    it('should return true for "chat"', () => {
      expect(isValidResponseMode('chat')).toBe(true);
    });

    it('should return false for invalid strings', () => {
      expect(isValidResponseMode('invalid')).toBe(false);
      expect(isValidResponseMode('audio')).toBe(false);
      expect(isValidResponseMode('')).toBe(false);
    });

    it('should return false for non-string values', () => {
      expect(isValidResponseMode(null)).toBe(false);
      expect(isValidResponseMode(undefined)).toBe(false);
      expect(isValidResponseMode(123)).toBe(false);
      expect(isValidResponseMode({})).toBe(false);
      expect(isValidResponseMode([])).toBe(false);
    });
  });

  describe('createSetResponseModeMessage', () => {
    it('should create valid SetResponseModeMessage for voice mode', () => {
      const message = createSetResponseModeMessage('voice');
      expect(message.type).toBe('set_response_mode');
      expect(message.mode).toBe('voice');
    });

    it('should create valid SetResponseModeMessage for chat mode', () => {
      const message = createSetResponseModeMessage('chat');
      expect(message.type).toBe('set_response_mode');
      expect(message.mode).toBe('chat');
    });
  });

  describe('isResponseModeUpdatedMessage', () => {
    it('should return true for valid ResponseModeUpdatedMessage with voice', () => {
      const message: any = {
        type: 'response_mode_updated',
        mode: 'voice' as ResponseMode,
      };
      expect(isResponseModeUpdatedMessage(message)).toBe(true);
    });

    it('should return true for valid ResponseModeUpdatedMessage with chat', () => {
      const message: any = {
        type: 'response_mode_updated',
        mode: 'chat' as ResponseMode,
      };
      expect(isResponseModeUpdatedMessage(message)).toBe(true);
    });

    it('should return false for message with wrong type', () => {
      const message: BaseDataChannelMessage = {
        type: 'chat_message',
      };
      expect(isResponseModeUpdatedMessage(message)).toBe(false);
    });

    it('should return false for message with invalid mode', () => {
      const message: any = {
        type: 'response_mode_updated',
        mode: 'invalid',
      };
      expect(isResponseModeUpdatedMessage(message)).toBe(false);
    });

    it('should return false for message missing mode property', () => {
      const message: BaseDataChannelMessage = {
        type: 'response_mode_updated',
      };
      expect(isResponseModeUpdatedMessage(message)).toBe(false);
    });
  });

  describe('isAgentChatMessage', () => {
    it('should return true for valid AgentChatMessage', () => {
      const message: any = {
        type: 'chat_message',
        message: 'Hello from agent',
        timestamp: Date.now(),
      };
      expect(isAgentChatMessage(message)).toBe(true);
    });

    it('should return false for message with wrong type', () => {
      const message: BaseDataChannelMessage = {
        type: 'response_mode_updated',
      };
      expect(isAgentChatMessage(message)).toBe(false);
    });

    it('should return false for message with missing message property', () => {
      const message: any = {
        type: 'chat_message',
        timestamp: Date.now(),
      };
      expect(isAgentChatMessage(message)).toBe(false);
    });

    it('should return false for message with non-string message', () => {
      const message: any = {
        type: 'chat_message',
        message: 123,
        timestamp: Date.now(),
      };
      expect(isAgentChatMessage(message)).toBe(false);
    });

    it('should return false for message with missing timestamp', () => {
      const message: any = {
        type: 'chat_message',
        message: 'Hello',
      };
      expect(isAgentChatMessage(message)).toBe(false);
    });

    it('should return false for message with non-number timestamp', () => {
      const message: any = {
        type: 'chat_message',
        message: 'Hello',
        timestamp: 'invalid',
      };
      expect(isAgentChatMessage(message)).toBe(false);
    });
  });

  describe('isIncomingMessage', () => {
    it('should return true for ResponseModeUpdatedMessage', () => {
      const message: any = {
        type: 'response_mode_updated',
        mode: 'voice' as ResponseMode,
      };
      expect(isIncomingMessage(message)).toBe(true);
    });

    it('should return true for AgentChatMessage', () => {
      const message: any = {
        type: 'chat_message',
        message: 'Hello',
        timestamp: Date.now(),
      };
      expect(isIncomingMessage(message)).toBe(true);
    });

    it('should return false for outgoing messages', () => {
      const message: any = {
        type: 'set_response_mode',
        mode: 'voice' as ResponseMode,
      };
      expect(isIncomingMessage(message)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isIncomingMessage(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isIncomingMessage(undefined)).toBe(false);
    });

    it('should return false for non-object values', () => {
      expect(isIncomingMessage('string')).toBe(false);
      expect(isIncomingMessage(123)).toBe(false);
      expect(isIncomingMessage(true)).toBe(false);
    });

    it('should return false for object without type property', () => {
      expect(isIncomingMessage({})).toBe(false);
    });
  });

  describe('DEFAULT_RESPONSE_MODE', () => {
    it('should be "voice"', () => {
      expect(DEFAULT_RESPONSE_MODE).toBe('voice');
    });
  });
});
