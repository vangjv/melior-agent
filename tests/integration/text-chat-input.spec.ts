/**
 * Text Chat Input Integration Tests
 * Feature: 007-text-chat-input
 * Tests for text message service integration
 *
 * Note: Full integration tests requiring LiveKit infrastructure
 * should be tested in live environment. These tests use mocks.
 */
import { TestBed } from '@angular/core/testing';
import { ConversationStorageService } from '../../src/app/services/conversation-storage.service';
import { isChatMessage } from '../../src/app/models/unified-conversation-message.model';

describe('Text Chat Input Service Integration', () => {
  let conversationService: ConversationStorageService;
  let mockLiveKitService: { sendTextMessage: jasmine.Spy };

  beforeEach(() => {
    // Create mock LiveKit service
    mockLiveKitService = {
      sendTextMessage: jasmine.createSpy('sendTextMessage').and.returnValue(Promise.resolve())
    };

    TestBed.configureTestingModule({
      providers: [ConversationStorageService]
    });

    conversationService = TestBed.inject(ConversationStorageService);
    conversationService.clearMessages();
  });

  describe('US1: Send Text Message', () => {
    it('should add text message to conversation storage', async () => {
      const testMessage = 'Hello from text input';
      const initialCount = conversationService.messages().length;

      // Send text message
      await conversationService.sendTextMessage(testMessage, mockLiveKitService);

      // Verify message was added
      const messages = conversationService.messages();
      expect(messages.length).toBe(initialCount + 1);

      const lastMessage = messages[messages.length - 1];
      expect(lastMessage.messageType).toBe('chat');
      expect(lastMessage.sender).toBe('user');
      expect(lastMessage.content).toBe(testMessage);
      expect(lastMessage.timestamp).toBeDefined();
      expect(lastMessage.id).toBeDefined();

      // Verify LiveKit service was called
      expect(mockLiveKitService.sendTextMessage).toHaveBeenCalledWith(testMessage);
    });

    it('should handle multiple rapid text messages', async () => {
      const messages = ['Message 1', 'Message 2', 'Message 3'];
      const initialCount = conversationService.messages().length;

      // Send multiple messages
      for (const msg of messages) {
        await conversationService.sendTextMessage(msg, mockLiveKitService);
      }

      // Verify all messages were added in order
      const storedMessages = conversationService.messages();
      expect(storedMessages.length).toBe(initialCount + messages.length);

      const addedMessages = storedMessages.slice(initialCount);
      addedMessages.forEach((msg, index) => {
        expect(msg.messageType).toBe('chat');
        expect(msg.sender).toBe('user');
        expect(msg.content).toBe(messages[index]);
      });
    });

    it('should generate unique IDs for each message', async () => {
      await conversationService.sendTextMessage('Message 1', mockLiveKitService);
      await conversationService.sendTextMessage('Message 2', mockLiveKitService);

      const messages = conversationService.messages();
      const lastTwo = messages.slice(-2);

      expect(lastTwo[0].id).not.toBe(lastTwo[1].id);
      expect(lastTwo[0].id).toMatch(/^[0-9a-f-]{36}$/); // UUID format
      expect(lastTwo[1].id).toMatch(/^[0-9a-f-]{36}$/);
    });
  });

  describe('US3: Bypass Speech-to-Text', () => {
    it('should preserve exact message content', async () => {
      const exactMessage = 'Special characters: !@#$%^&*() Numbers: 12345 Emoji: 👋🌍';
      await conversationService.sendTextMessage(exactMessage, mockLiveKitService);

      const messages = conversationService.messages();
      const lastMessage = messages[messages.length - 1];

      expect(lastMessage.content).toBe(exactMessage);
      expect(lastMessage.messageType).toBe('chat');
    });

    it('should mark message as chat type (not transcription)', async () => {
      await conversationService.sendTextMessage('Test message', mockLiveKitService);

      const messages = conversationService.messages();
      const lastMessage = messages[messages.length - 1];

      expect(isChatMessage(lastMessage)).toBe(true);
      expect(lastMessage.messageType).toBe('chat');
    });

    it('should handle multi-line messages without transcription artifacts', async () => {
      const multilineMessage = 'Line 1\nLine 2\nLine 3';
      await conversationService.sendTextMessage(multilineMessage, mockLiveKitService);

      const messages = conversationService.messages();
      const lastMessage = messages[messages.length - 1];

      expect(lastMessage.content).toBe(multilineMessage);
      expect(lastMessage.content.split('\n').length).toBe(3);
    });
  });

  describe('LiveKit Data Channel Integration', () => {
    it('should call LiveKit service to send message', async () => {
      const message = 'Test message';
      await conversationService.sendTextMessage(message, mockLiveKitService);

      expect(mockLiveKitService.sendTextMessage).toHaveBeenCalledTimes(1);
      expect(mockLiveKitService.sendTextMessage).toHaveBeenCalledWith(message);
    });

    it('should handle LiveKit send failures gracefully', async () => {
      mockLiveKitService.sendTextMessage.and.returnValue(Promise.reject(new Error('Network error')));

      try {
        await conversationService.sendTextMessage('Test', mockLiveKitService);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Full E2E Integration', () => {
    it('should test complete flow in live environment', () => {
      pending('Requires LiveKit infrastructure - test manually or in E2E suite');

      // This test would verify:
      // 1. User types message in TextInputComponent
      // 2. Message sent via UnifiedConversationDisplayComponent.handleTextMessage()
      // 3. Message sent through LiveKitConnectionService.sendTextMessage()
      // 4. Message stored in ConversationStorageService
      // 5. Message appears in conversation display
      // 6. Agent receives message and responds
    });
  });
});
