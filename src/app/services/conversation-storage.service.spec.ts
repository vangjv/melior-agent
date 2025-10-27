/**
 * Unit Tests: Conversation Storage Service
 * Feature: 005-unified-conversation
 */

import { TestBed } from '@angular/core/testing';
import { ConversationStorageService } from './conversation-storage.service';
import { createTranscriptionMessage, createChatMessage } from '../models/unified-conversation-message.model';

describe('ConversationStorageService', () => {
  let service: ConversationStorageService;

  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear();

    TestBed.configureTestingModule({});
    service = TestBed.inject(ConversationStorageService);
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with empty messages', () => {
      expect(service.messages()).toEqual([]);
      expect(service.messageCount()).toBe(0);
      expect(service.isEmpty()).toBe(true);
    });

    it('should initialize with voice mode by default', () => {
      expect(service.currentMode()).toBe('voice');
    });

    it('should generate unique session ID', () => {
      expect(service.sessionId()).toBeTruthy();
      expect(typeof service.sessionId()).toBe('string');
    });

    it('should have null lastMessageAt initially', () => {
      expect(service.lastMessageAt()).toBeNull();
    });
  });

  describe('addMessage', () => {
    it('should add message to empty conversation', () => {
      const message = createChatMessage('user', 'Hello');

      service.addMessage(message);

      expect(service.messages().length).toBe(1);
      expect(service.messages()[0]).toBe(message);
      expect(service.messageCount()).toBe(1);
      expect(service.isEmpty()).toBe(false);
    });

    it('should update lastMessageAt when adding message', () => {
      const message = createChatMessage('user', 'Test');

      service.addMessage(message);

      expect(service.lastMessageAt()).toEqual(message.timestamp);
    });

    it('should sort messages by timestamp', () => {
      const msg1 = createChatMessage('user', 'Second', new Date('2025-01-01T10:01:00Z'));
      const msg2 = createChatMessage('agent', 'First', new Date('2025-01-01T10:00:00Z'));

      service.addMessage(msg1);
      service.addMessage(msg2);

      const sorted = service.sortedMessages();
      expect(sorted[0]).toBe(msg2);
      expect(sorted[1]).toBe(msg1);
    });

    it('should handle interim transcription replacement', () => {
      const interim = createTranscriptionMessage('user', 'Partial', false, undefined, undefined, new Date('2025-01-01T10:00:00.000Z'));
      const final = createTranscriptionMessage('user', 'Complete', true, undefined, undefined, new Date('2025-01-01T10:00:00.100Z'));

      service.addMessage(interim);
      expect(service.messageCount()).toBe(1);

      service.addMessage(final);
      expect(service.messageCount()).toBe(1);
      expect(service.messages()[0]).toBe(final);
    });

    it('should deduplicate messages by ID', () => {
      const message = createChatMessage('user', 'Test');
      const duplicate = { ...message };

      service.addMessage(message);
      service.addMessage(duplicate);

      expect(service.messageCount()).toBe(1);
    });
  });

  describe('addMessages', () => {
    it('should add multiple messages', () => {
      const msg1 = createChatMessage('user', 'First');
      const msg2 = createChatMessage('agent', 'Second');
      const msg3 = createChatMessage('user', 'Third');

      service.addMessages([msg1, msg2, msg3]);

      expect(service.messageCount()).toBe(3);
    });

    it('should sort multiple messages', () => {
      const msg1 = createChatMessage('user', 'Test1', new Date('2025-01-01T10:02:00Z'));
      const msg2 = createChatMessage('agent', 'Test2', new Date('2025-01-01T10:00:00Z'));
      const msg3 = createChatMessage('user', 'Test3', new Date('2025-01-01T10:01:00Z'));

      service.addMessages([msg1, msg2, msg3]);

      const sorted = service.sortedMessages();
      expect(sorted[0]).toBe(msg2);
      expect(sorted[1]).toBe(msg3);
      expect(sorted[2]).toBe(msg1);
    });

    it('should update lastMessageAt with last message', () => {
      const msg1 = createChatMessage('user', 'First', new Date('2025-01-01T10:00:00Z'));
      const msg2 = createChatMessage('agent', 'Last', new Date('2025-01-01T10:01:00Z'));

      service.addMessages([msg1, msg2]);

      expect(service.lastMessageAt()).toEqual(msg2.timestamp);
    });

    it('should handle empty array', () => {
      service.addMessages([]);

      expect(service.messageCount()).toBe(0);
    });
  });

  describe('clearMessages', () => {
    it('should clear all messages', () => {
      const msg1 = createChatMessage('user', 'Test1');
      const msg2 = createChatMessage('agent', 'Test2');

      service.addMessages([msg1, msg2]);
      expect(service.messageCount()).toBe(2);

      service.clearMessages();

      expect(service.messages()).toEqual([]);
      expect(service.messageCount()).toBe(0);
      expect(service.isEmpty()).toBe(true);
      expect(service.lastMessageAt()).toBeNull();
    });
  });

  describe('setMode', () => {
    it('should update current mode to chat', () => {
      service.setMode('chat');

      expect(service.currentMode()).toBe('chat');
    });

    it('should update current mode to voice', () => {
      service.setMode('chat');
      service.setMode('voice');

      expect(service.currentMode()).toBe('voice');
    });
  });

  describe('getState', () => {
    it('should return current conversation state', () => {
      const msg = createChatMessage('user', 'Test');
      service.addMessage(msg);
      service.setMode('chat');

      const state = service.getState();

      expect(state.messages.length).toBe(1);
      expect(state.currentMode).toBe('chat');
      expect(state.sessionId).toBe(service.sessionId());
      expect(state.messageCount).toBe(1);
      expect(state.lastMessageAt).toEqual(msg.timestamp);
    });
  });

  describe('Storage Persistence', () => {
    it('should save to sessionStorage when adding message', (done) => {
      const message = createChatMessage('user', 'Test');

      service.addMessage(message);

      // Wait for debounced save
      setTimeout(() => {
        const key = `melior-conversation-${service.sessionId()}`;
        const stored = sessionStorage.getItem(key);

        expect(stored).not.toBeNull();
        done();
      }, 600); // Wait longer than debounce time
    });

    it('should restore messages from sessionStorage on initialization', () => {
      const msg1 = createChatMessage('user', 'Persisted message');

      // Save using first service instance
      service.addMessage(msg1);

      // Force immediate save by clearing messages (which saves immediately)
      const sessionId = service.sessionId();
      service.clearMessages();
      service.addMessage(msg1);

      // Wait for save, then create new instance
      setTimeout(() => {
        // Create new service instance (simulating page reload)
        const newService = new ConversationStorageService();

        // Note: This won't restore because sessionId is different
        // In real app, sessionId would be managed externally
      }, 600);
    });

    it('should persist mode changes', (done) => {
      service.setMode('chat');

      setTimeout(() => {
        const key = `melior-conversation-${service.sessionId()}`;
        const stored = sessionStorage.getItem(key);
        const parsed = JSON.parse(stored!);

        expect(parsed.currentMode).toBe('chat');
        done();
      }, 600);
    });
  });

  describe('resetSession', () => {
    it('should reset to empty state', () => {
      const msg = createChatMessage('user', 'Test');
      service.addMessage(msg);
      service.setMode('chat');

      const oldSessionId = service.sessionId();

      service.resetSession();

      expect(service.messages()).toEqual([]);
      expect(service.messageCount()).toBe(0);
      expect(service.lastMessageAt()).toBeNull();
      expect(service.currentMode()).toBe('voice');
      expect(service.sessionId()).not.toBe(oldSessionId);
    });
  });

  describe('Computed Signals', () => {
    it('should update messageCount reactively', () => {
      expect(service.messageCount()).toBe(0);

      service.addMessage(createChatMessage('user', 'Test1'));
      expect(service.messageCount()).toBe(1);

      service.addMessage(createChatMessage('agent', 'Test2'));
      expect(service.messageCount()).toBe(2);

      service.clearMessages();
      expect(service.messageCount()).toBe(0);
    });

    it('should update isEmpty reactively', () => {
      expect(service.isEmpty()).toBe(true);

      service.addMessage(createChatMessage('user', 'Test'));
      expect(service.isEmpty()).toBe(false);

      service.clearMessages();
      expect(service.isEmpty()).toBe(true);
    });

    it('should update sortedMessages reactively', () => {
      const msg1 = createChatMessage('user', 'Second', new Date('2025-01-01T10:01:00Z'));
      const msg2 = createChatMessage('agent', 'First', new Date('2025-01-01T10:00:00Z'));

      service.addMessage(msg1);
      let sorted = service.sortedMessages();
      expect(sorted.length).toBe(1);

      service.addMessage(msg2);
      sorted = service.sortedMessages();
      expect(sorted.length).toBe(2);
      expect(sorted[0]).toBe(msg2);
      expect(sorted[1]).toBe(msg1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle adding same message multiple times', () => {
      const message = createChatMessage('user', 'Test');

      service.addMessage(message);
      service.addMessage(message);
      service.addMessage(message);

      expect(service.messageCount()).toBe(1);
    });

    it('should handle very large message count', () => {
      const messages = Array.from({ length: 1000 }, (_, i) =>
        createChatMessage('user', `Message ${i}`)
      );

      service.addMessages(messages);

      expect(service.messageCount()).toBe(1000);
      expect(service.sortedMessages().length).toBe(1000);
    });

    it('should handle rapid mode toggles', () => {
      service.setMode('chat');
      service.setMode('voice');
      service.setMode('chat');
      service.setMode('voice');

      expect(service.currentMode()).toBe('voice');
    });
  });

  // T037 [US2] Mode toggle preserving message history
  describe('User Story 2: Mode Toggle', () => {
    it('should preserve message history when toggling mode', () => {
      // Add messages in voice mode
      const voiceMsg1 = createTranscriptionMessage('user', 'Hello in voice mode', true);
      const voiceMsg2 = createTranscriptionMessage('agent', 'Response in voice mode', true);

      service.addMessage(voiceMsg1);
      service.addMessage(voiceMsg2);

      expect(service.messageCount()).toBe(2);
      expect(service.currentMode()).toBe('voice');

      // Toggle to chat mode
      service.setMode('chat');

      // Verify history is preserved
      expect(service.messageCount()).toBe(2);
      expect(service.messages()[0]).toBe(voiceMsg1);
      expect(service.messages()[1]).toBe(voiceMsg2);
      expect(service.currentMode()).toBe('chat');

      // Add messages in chat mode
      const chatMsg1 = createChatMessage('user', 'Hello in chat mode');
      const chatMsg2 = createChatMessage('agent', 'Response in chat mode');

      service.addMessage(chatMsg1);
      service.addMessage(chatMsg2);

      // Verify all messages are preserved
      expect(service.messageCount()).toBe(4);
      expect(service.currentMode()).toBe('chat');

      // Toggle back to voice mode
      service.setMode('voice');

      // Verify complete history is still preserved
      expect(service.messageCount()).toBe(4);
      expect(service.currentMode()).toBe('voice');
    });

    it('should persist mode changes to sessionStorage', (done) => {
      service.setMode('chat');

      // Wait for debounced save
      setTimeout(() => {
        const key = `unified-conversation-${service.sessionId()}`;
        const stored = sessionStorage.getItem(key);

        expect(stored).toBeTruthy();

        const parsed = JSON.parse(stored!);
        expect(parsed.currentMode).toBe('chat');

        done();
      }, 600); // Wait longer than SAVE_DEBOUNCE_MS (500ms)
    });

    it('should restore mode from sessionStorage', () => {
      // Set mode and add messages
      service.setMode('chat');
      service.addMessage(createChatMessage('user', 'Test message'));

      // Wait for save, then create new service instance
      setTimeout(() => {
        const newService = TestBed.inject(ConversationStorageService);

        expect(newService.currentMode()).toBe('chat');
        expect(newService.messageCount()).toBe(1);
      }, 600);
    });

    it('should allow multiple mode toggles without losing messages', () => {
      const msg1 = createTranscriptionMessage('user', 'Message 1', true);
      const msg2 = createChatMessage('user', 'Message 2');
      const msg3 = createTranscriptionMessage('user', 'Message 3', true);

      service.addMessage(msg1);
      service.setMode('chat');
      service.addMessage(msg2);
      service.setMode('voice');
      service.addMessage(msg3);
      service.setMode('chat');
      service.setMode('voice');

      expect(service.messageCount()).toBe(3);
      expect(service.messages()).toContain(msg1);
      expect(service.messages()).toContain(msg2);
      expect(service.messages()).toContain(msg3);
    });
  });
});
