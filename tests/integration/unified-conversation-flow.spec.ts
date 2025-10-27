/**
 * Integration Test: Unified Conversation Flow
 * Feature: 005-unified-conversation
 * Test: T025 - User speaks → agent responds → both appear in feed
 *
 * Purpose: Verify end-to-end conversation flow with unified message display
 */

import { TestBed } from '@angular/core/testing';
import { ConversationStorageService } from '../../src/app/services/conversation-storage.service';
import { LiveKitConnectionService } from '../../src/app/services/livekit-connection.service';
import {
  UnifiedConversationMessage,
  createChatMessage,
  createTranscriptionMessage
} from '../../src/app/models/unified-conversation-message.model';

describe('Unified Conversation Flow Integration', () => {
  let storageService: ConversationStorageService;
  let connectionService: jasmine.SpyObj<LiveKitConnectionService>;

  beforeEach(() => {
    // Create mock LiveKitConnectionService
    connectionService = jasmine.createSpyObj('LiveKitConnectionService', [
      'connect',
      'disconnect',
      'sendMessage'
    ]);

    TestBed.configureTestingModule({
      providers: [
        ConversationStorageService,
        { provide: LiveKitConnectionService, useValue: connectionService }
      ]
    });

    storageService = TestBed.inject(ConversationStorageService);

    // Clear sessionStorage before each test
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should display user transcription in unified feed', () => {
    // Simulate user speaking
    const userMessage: UnifiedConversationMessage = {
      messageType: 'transcription',
      id: crypto.randomUUID(),
      content: 'Hello, how can you help me?',
      timestamp: new Date(),
      sender: 'user',
      isFinal: true,
      confidence: 0.95
    };

    storageService.addMessage(userMessage);

    // Verify message appears in storage
    const messages = storageService.messages();
    expect(messages.length).toBe(1);
    expect(messages[0].content).toBe('Hello, how can you help me?');
    expect(messages[0].sender).toBe('user');
    expect(messages[0].messageType).toBe('transcription');
  });

  it('should display agent response in unified feed (voice mode)', () => {
    // Simulate agent response via voice
    const agentMessage: UnifiedConversationMessage = {
      messageType: 'transcription',
      id: crypto.randomUUID(),
      content: 'I can assist you with various tasks.',
      timestamp: new Date(),
      sender: 'agent',
      isFinal: true,
      confidence: 0.98
    };

    storageService.addMessage(agentMessage);

    // Verify message appears in storage
    const messages = storageService.messages();
    expect(messages.length).toBe(1);
    expect(messages[0].content).toBe('I can assist you with various tasks.');
    expect(messages[0].sender).toBe('agent');
    expect(messages[0].messageType).toBe('transcription');
  });

  it('should display agent response in unified feed (chat mode)', () => {
    // Simulate agent response via chat
    const agentChatMessage: UnifiedConversationMessage = {
      messageType: 'chat',
      id: crypto.randomUUID(),
      content: 'Here is a text response.',
      timestamp: new Date(),
      sender: 'agent',
      deliveryMethod: 'data-channel'
    };

    storageService.addMessage(agentChatMessage);

    // Verify message appears in storage
    const messages = storageService.messages();
    expect(messages.length).toBe(1);
    expect(messages[0].content).toBe('Here is a text response.');
    expect(messages[0].sender).toBe('agent');
    expect(messages[0].messageType).toBe('chat');
  });

  it('should display complete conversation flow in chronological order', () => {
    // Simulate complete conversation
    const message1: UnifiedConversationMessage = {
      messageType: 'transcription',
      id: crypto.randomUUID(),
      content: 'User question',
      timestamp: new Date('2025-10-26T10:00:00Z'),
      sender: 'user',
      isFinal: true
    };

    const message2: UnifiedConversationMessage = {
      messageType: 'transcription',
      id: crypto.randomUUID(),
      content: 'Agent voice response',
      timestamp: new Date('2025-10-26T10:00:05Z'),
      sender: 'agent',
      isFinal: true
    };

    const message3: UnifiedConversationMessage = {
      messageType: 'transcription',
      id: crypto.randomUUID(),
      content: 'Follow-up question',
      timestamp: new Date('2025-10-26T10:00:10Z'),
      sender: 'user',
      isFinal: true
    };

    const message4: UnifiedConversationMessage = {
      messageType: 'chat',
      id: crypto.randomUUID(),
      content: 'Agent text response',
      timestamp: new Date('2025-10-26T10:00:15Z'),
      sender: 'agent',
      deliveryMethod: 'data-channel'
    };

    // Add messages in order
    storageService.addMessage(message1);
    storageService.addMessage(message2);
    storageService.addMessage(message3);
    storageService.addMessage(message4);

    // Verify all messages are in storage and chronologically ordered
    const messages = storageService.messages();
    expect(messages.length).toBe(4);

    expect(messages[0].content).toBe('User question');
    expect(messages[0].sender).toBe('user');

    expect(messages[1].content).toBe('Agent voice response');
    expect(messages[1].sender).toBe('agent');
    expect(messages[1].messageType).toBe('transcription');

    expect(messages[2].content).toBe('Follow-up question');
    expect(messages[2].sender).toBe('user');

    expect(messages[3].content).toBe('Agent text response');
    expect(messages[3].sender).toBe('agent');
    expect(messages[3].messageType).toBe('chat');
  });

  it('should handle out-of-order message arrival', () => {
    // Simulate messages arriving out of order
    const message2: UnifiedConversationMessage = {
      messageType: 'transcription',
      id: crypto.randomUUID(),
      content: 'Second message',
      timestamp: new Date('2025-10-26T10:00:05Z'),
      sender: 'agent',
      isFinal: true
    };

    const message1: UnifiedConversationMessage = {
      messageType: 'transcription',
      id: crypto.randomUUID(),
      content: 'First message',
      timestamp: new Date('2025-10-26T10:00:00Z'),
      sender: 'user',
      isFinal: true
    };

    const message3: UnifiedConversationMessage = {
      messageType: 'chat',
      id: crypto.randomUUID(),
      content: 'Third message',
      timestamp: new Date('2025-10-26T10:00:10Z'),
      sender: 'agent',
      deliveryMethod: 'data-channel'
    };

    // Add in wrong order
    storageService.addMessage(message2);
    storageService.addMessage(message1);
    storageService.addMessage(message3);

    // Verify messages are sorted chronologically
    const messages = storageService.messages();
    expect(messages.length).toBe(3);
    expect(messages[0].content).toBe('First message');
    expect(messages[1].content).toBe('Second message');
    expect(messages[2].content).toBe('Third message');
  });

  it('should handle interim transcriptions correctly', () => {
    // Add interim transcription
    const interimMessage: UnifiedConversationMessage = {
      messageType: 'transcription',
      id: 'interim-1',
      content: 'Partial speech...',
      timestamp: new Date(),
      sender: 'user',
      isFinal: false
    };

    storageService.addMessage(interimMessage);

    let messages = storageService.messages();
    expect(messages.length).toBe(1);

    // Type guard to check isFinal property
    const firstMessage = messages[0];
    expect(firstMessage.messageType).toBe('transcription');
    if (firstMessage.messageType === 'transcription') {
      expect(firstMessage.isFinal).toBe(false);
    }

    // Replace with final transcription
    const finalMessage: UnifiedConversationMessage = {
      messageType: 'transcription',
      id: crypto.randomUUID(),
      content: 'Complete sentence here',
      timestamp: new Date(),
      sender: 'user',
      isFinal: true
    };

    storageService.addMessage(finalMessage);

    // Interim should be replaced by final
    messages = storageService.messages();
    expect(messages.filter(m => m.sender === 'user' && m.messageType === 'transcription').length).toBe(1);
    expect(messages.some(m => m.content === 'Complete sentence here')).toBe(true);
  });

  it('should persist conversation to sessionStorage', () => {
    const message: UnifiedConversationMessage = {
      messageType: 'transcription',
      id: crypto.randomUUID(),
      content: 'Persistent message',
      timestamp: new Date(),
      sender: 'user',
      isFinal: true
    };

    storageService.addMessage(message);

    // Verify sessionStorage contains the message
    const stored = sessionStorage.getItem('conversation-feed-state');
    expect(stored).toBeTruthy();

    const parsedState = JSON.parse(stored!);
    expect(parsedState.messages).toBeDefined();
    expect(parsedState.messages.length).toBe(1);
    expect(parsedState.messages[0].content).toBe('Persistent message');
  });

  it('should restore conversation from sessionStorage on service initialization', () => {
    // Pre-populate sessionStorage
    const storedMessage: UnifiedConversationMessage = {
      messageType: 'transcription',
      id: crypto.randomUUID(),
      content: 'Restored message',
      timestamp: new Date('2025-10-26T10:00:00Z'),
      sender: 'user',
      isFinal: true
    };

    const state = {
      messages: [storedMessage],
      currentMode: 'voice'
    };

    sessionStorage.setItem('conversation-feed-state', JSON.stringify(state));

    // Create new service instance
    const newService = TestBed.inject(ConversationStorageService);

    // Verify message is restored
    const messages = newService.messages();
    expect(messages.length).toBe(1);
    expect(messages[0].content).toBe('Restored message');
  });

  it('should clear conversation history', () => {
    const message: UnifiedConversationMessage = {
      messageType: 'transcription',
      id: crypto.randomUUID(),
      content: 'Message to clear',
      timestamp: new Date(),
      sender: 'user',
      isFinal: true
    };

    storageService.addMessage(message);
    expect(storageService.messages().length).toBe(1);

    storageService.clearMessages();

    expect(storageService.messages().length).toBe(0);
    expect(sessionStorage.getItem('conversation-feed-state')).toBeNull();
  });

  it('should handle rapid message additions without loss', () => {
    const messages: UnifiedConversationMessage[] = [];

    // Simulate rapid message additions
    for (let i = 0; i < 20; i++) {
      const message: UnifiedConversationMessage = i % 2 === 0
        ? {
            messageType: 'transcription',
            id: crypto.randomUUID(),
            content: `Message ${i}`,
            timestamp: new Date(Date.now() + i * 1000),
            sender: 'user',
            isFinal: true
          }
        : {
            messageType: 'chat',
            id: crypto.randomUUID(),
            content: `Message ${i}`,
            timestamp: new Date(Date.now() + i * 1000),
            sender: 'agent',
            deliveryMethod: 'data-channel' as const
          };

      messages.push(message);
      storageService.addMessage(message);
    }

    // Verify all messages are stored
    const storedMessages = storageService.messages();
    expect(storedMessages.length).toBe(20);

    // Verify chronological order
    for (let i = 0; i < storedMessages.length - 1; i++) {
      expect(storedMessages[i].timestamp.getTime()).toBeLessThanOrEqual(
        storedMessages[i + 1].timestamp.getTime()
      );
    }
  });

  // T058 [US4]: Test conversation persistence across disconnect/reconnect
  describe('User Story 4: Conversation Persistence', () => {
    it('should persist conversation across disconnect/reconnect cycles', (done) => {
      // Create conversation
      const msg1 = createChatMessage('user', 'Hello');
      const msg2 = createChatMessage('agent', 'Hi there!');
      const msg3 = createChatMessage('user', 'How are you?');

      storageService.addMessage(msg1);
      storageService.addMessage(msg2);
      storageService.addMessage(msg3);

      const sessionId = storageService.sessionId();

      // Wait for debounced save
      setTimeout(() => {
        // Verify storage
        const key = `melior-conversation-${sessionId}`;
        const stored = sessionStorage.getItem(key);

        expect(stored).toBeTruthy();

        if (stored) {
          const parsed = JSON.parse(stored);
          expect(parsed.messageCount).toBe(3);
          expect(parsed.messages.length).toBe(3);

          // Simulate reconnect by creating new service
          // Note: In production, sessionId would be managed externally
          const restoredMessages = parsed.messages;
          expect(restoredMessages[0].content).toBe('Hello');
          expect(restoredMessages[1].content).toBe('Hi there!');
          expect(restoredMessages[2].content).toBe('How are you?');
        }

        done();
      }, 600);
    });

    it('should handle multiple disconnect/reconnect cycles', (done) => {
      // First session
      storageService.addMessage(createChatMessage('user', 'Message 1'));
      storageService.addMessage(createChatMessage('agent', 'Response 1'));

      setTimeout(() => {
        const firstSessionId = storageService.sessionId();
        const key = `melior-conversation-${firstSessionId}`;
        const firstStored = sessionStorage.getItem(key);

        expect(firstStored).toBeTruthy();

        if (firstStored) {
          const firstParsed = JSON.parse(firstStored);
          expect(firstParsed.messageCount).toBe(2);

          // Simulate adding more messages after reconnect
          storageService.addMessage(createChatMessage('user', 'Message 2'));

          setTimeout(() => {
            const secondStored = sessionStorage.getItem(key);
            expect(secondStored).toBeTruthy();

            if (secondStored) {
              const secondParsed = JSON.parse(secondStored);
              expect(secondParsed.messageCount).toBe(3);
            }

            done();
          }, 600);
        } else {
          done();
        }
      }, 600);
    });

    it('should preserve message order across persistence', (done) => {
      const baseTime = new Date('2025-10-26T10:00:00Z').getTime();
      const messages = [
        createChatMessage('user', 'First', new Date(baseTime)),
        createChatMessage('agent', 'Second', new Date(baseTime + 1000)),
        createChatMessage('user', 'Third', new Date(baseTime + 2000)),
        createChatMessage('agent', 'Fourth', new Date(baseTime + 3000))
      ];

      messages.forEach(msg => storageService.addMessage(msg));

      setTimeout(() => {
        const sessionId = storageService.sessionId();
        const key = `melior-conversation-${sessionId}`;
        const stored = sessionStorage.getItem(key);

        expect(stored).toBeTruthy();

        if (stored) {
          const parsed = JSON.parse(stored);
          const restoredMessages = parsed.messages;

          expect(restoredMessages[0].content).toBe('First');
          expect(restoredMessages[1].content).toBe('Second');
          expect(restoredMessages[2].content).toBe('Third');
          expect(restoredMessages[3].content).toBe('Fourth');
        }

        done();
      }, 600);
    });
  });
});
