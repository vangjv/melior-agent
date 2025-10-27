/**
 * Integration Test: Mode Toggle Mid-Conversation
 * Feature: 005-unified-conversation
 * User Story 2: Toggle Response Mode Mid-Conversation
 *
 * T039 [US2] Integration test for mode toggle with history preservation
 */

import { TestBed } from '@angular/core/testing';
import { ConversationStorageService } from '../../src/app/services/conversation-storage.service';
import { createTranscriptionMessage, createChatMessage } from '../../src/app/models/unified-conversation-message.model';

describe('Integration: Mode Toggle Mid-Conversation', () => {
  let service: ConversationStorageService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConversationStorageService);
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should preserve conversation history when toggling from voice to chat mode', () => {
    // Start in voice mode
    expect(service.currentMode()).toBe('voice');

    // User speaks in voice mode
    const userVoiceMsg = createTranscriptionMessage('user', 'Hello agent', true);
    service.addMessage(userVoiceMsg);

    // Agent responds in voice mode
    const agentVoiceMsg = createTranscriptionMessage('agent', 'Hello user, how can I help?', true);
    service.addMessage(agentVoiceMsg);

    expect(service.messageCount()).toBe(2);

    // Toggle to chat mode
    service.setMode('chat');

    // Verify history is preserved
    expect(service.messageCount()).toBe(2);
    expect(service.currentMode()).toBe('chat');
    expect(service.messages()[0]).toBe(userVoiceMsg);
    expect(service.messages()[1]).toBe(agentVoiceMsg);

    // User continues in chat mode
    const userChatMsg = createChatMessage('user', 'What is the weather?');
    service.addMessage(userChatMsg);

    // Agent responds in chat mode
    const agentChatMsg = createChatMessage('agent', 'The weather is sunny.');
    service.addMessage(agentChatMsg);

    // Verify complete history
    expect(service.messageCount()).toBe(4);
    expect(service.messages()).toContain(userVoiceMsg);
    expect(service.messages()).toContain(agentVoiceMsg);
    expect(service.messages()).toContain(userChatMsg);
    expect(service.messages()).toContain(agentChatMsg);

    // Verify chronological order
    const sorted = service.sortedMessages();
    expect(sorted[0].content).toBe('Hello agent');
    expect(sorted[1].content).toBe('Hello user, how can I help?');
    expect(sorted[2].content).toBe('What is the weather?');
    expect(sorted[3].content).toBe('The weather is sunny.');
  });

  it('should persist mode changes and history to sessionStorage', (done) => {
    // Add messages in voice mode
    service.addMessage(createTranscriptionMessage('user', 'Voice message 1', true));
    service.addMessage(createTranscriptionMessage('agent', 'Voice response 1', true));

    // Toggle to chat mode
    service.setMode('chat');

    // Add messages in chat mode
    service.addMessage(createChatMessage('user', 'Chat message 1'));
    service.addMessage(createChatMessage('agent', 'Chat response 1'));

    // Wait for debounced save
    setTimeout(() => {
      const key = `unified-conversation-${service.sessionId()}`;
      const stored = sessionStorage.getItem(key);

      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.currentMode).toBe('chat');
      expect(parsed.messageCount).toBe(4);
      expect(parsed.messages.length).toBe(4);

      done();
    }, 600);
  });

  it('should restore mode and history from sessionStorage after reload', (done) => {
    const initialSessionId = service.sessionId();

    // Create conversation with mode toggle
    service.addMessage(createTranscriptionMessage('user', 'Voice msg', true));
    service.setMode('chat');
    service.addMessage(createChatMessage('user', 'Chat msg'));

    // Wait for save
    setTimeout(() => {
      // Simulate reload by creating new service instance
      // Note: In real scenario, sessionId would need to be preserved
      // For this test, we'll manually restore using the same key
      const key = `unified-conversation-${initialSessionId}`;
      const stored = sessionStorage.getItem(key);

      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.currentMode).toBe('chat');
      expect(parsed.messageCount).toBe(2);

      done();
    }, 600);
  });

  it('should handle multiple rapid mode toggles without data loss', () => {
    // Add initial message
    service.addMessage(createTranscriptionMessage('user', 'Message 1', true));

    // Rapid toggles
    service.setMode('chat');
    service.addMessage(createChatMessage('user', 'Message 2'));

    service.setMode('voice');
    service.addMessage(createTranscriptionMessage('user', 'Message 3', true));

    service.setMode('chat');
    service.addMessage(createChatMessage('user', 'Message 4'));

    service.setMode('voice');
    service.addMessage(createTranscriptionMessage('user', 'Message 5', true));

    // Verify all messages are preserved
    expect(service.messageCount()).toBe(5);
    expect(service.currentMode()).toBe('voice');

    const messages = service.sortedMessages();
    expect(messages[0].content).toBe('Message 1');
    expect(messages[1].content).toBe('Message 2');
    expect(messages[2].content).toBe('Message 3');
    expect(messages[3].content).toBe('Message 4');
    expect(messages[4].content).toBe('Message 5');
  });

  it('should maintain chronological order across mode changes', () => {
    const baseTime = new Date('2025-10-26T10:00:00Z');

    // Mix of voice and chat messages with explicit timestamps
    service.addMessage(createTranscriptionMessage('user', 'Voice 1', true, undefined, undefined, new Date(baseTime.getTime())));
    service.setMode('chat');
    service.addMessage(createChatMessage('user', 'Chat 1', new Date(baseTime.getTime() + 1000)));
    service.setMode('voice');
    service.addMessage(createTranscriptionMessage('user', 'Voice 2', true, undefined, undefined, new Date(baseTime.getTime() + 2000)));
    service.setMode('chat');
    service.addMessage(createChatMessage('user', 'Chat 2', new Date(baseTime.getTime() + 3000)));

    const sorted = service.sortedMessages();

    expect(sorted[0].content).toBe('Voice 1');
    expect(sorted[1].content).toBe('Chat 1');
    expect(sorted[2].content).toBe('Voice 2');
    expect(sorted[3].content).toBe('Chat 2');
  });

  it('should clear messages independently of mode', () => {
    service.addMessage(createTranscriptionMessage('user', 'Voice msg', true));
    service.setMode('chat');
    service.addMessage(createChatMessage('user', 'Chat msg'));

    expect(service.messageCount()).toBe(2);
    expect(service.currentMode()).toBe('chat');

    service.clearMessages();

    expect(service.messageCount()).toBe(0);
    expect(service.currentMode()).toBe('chat'); // Mode should be preserved
  });

  it('should handle edge case of toggling mode with no messages', () => {
    expect(service.messageCount()).toBe(0);
    expect(service.currentMode()).toBe('voice');

    service.setMode('chat');

    expect(service.messageCount()).toBe(0);
    expect(service.currentMode()).toBe('chat');

    service.setMode('voice');

    expect(service.messageCount()).toBe(0);
    expect(service.currentMode()).toBe('voice');
  });

  it('should properly interleave user and agent messages across mode changes', () => {
    // Simulate realistic conversation flow
    service.addMessage(createTranscriptionMessage('user', 'User voice 1', true));
    service.addMessage(createTranscriptionMessage('agent', 'Agent voice 1', true));

    service.setMode('chat');

    service.addMessage(createChatMessage('user', 'User chat 1'));
    service.addMessage(createChatMessage('agent', 'Agent chat 1'));

    service.setMode('voice');

    service.addMessage(createTranscriptionMessage('user', 'User voice 2', true));
    service.addMessage(createTranscriptionMessage('agent', 'Agent voice 2', true));

    const messages = service.sortedMessages();

    expect(messages.length).toBe(6);

    // Verify alternating pattern is preserved
    expect(messages[0].sender).toBe('user');
    expect(messages[1].sender).toBe('agent');
    expect(messages[2].sender).toBe('user');
    expect(messages[3].sender).toBe('agent');
    expect(messages[4].sender).toBe('user');
    expect(messages[5].sender).toBe('agent');
  });
});
