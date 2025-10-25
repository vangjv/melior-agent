/**
 * Unit tests for ChatStorageService
 * Tests message storage, retrieval, and clearing functionality
 */

import { TestBed } from '@angular/core/testing';
import { ChatStorageService } from './chat-storage.service';
import {
  ChatMessageState,
  createUserMessage,
  createAgentMessage,
} from '../models/chat-message.model';

describe('ChatStorageService', () => {
  let service: ChatStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ChatStorageService],
    });
    service = TestBed.inject(ChatStorageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // T079: ChatStorageService initializes with empty message history
  it('should initialize with empty message history', () => {
    expect(service.chatMessages()).toEqual([]);
    expect(service.getHistory()).toEqual([]);
  });

  // T080: ChatStorageService.addMessage() adds message to history and updates signal
  it('should add message to history and update signal', () => {
    const initialCount = service.chatMessages().length;

    service.addMessage('Hello, agent!', 'user');

    const messages = service.chatMessages();
    expect(messages.length).toBe(initialCount + 1);
    expect(messages[0].content).toBe('Hello, agent!');
    expect(messages[0].sender).toBe('user');
    expect(messages[0].id).toBeTruthy();
    expect(messages[0].timestamp).toBeInstanceOf(Date);
  });

  // T081: ChatStorageService.clearHistory() removes all messages
  it('should clear all messages from history', () => {
    // Add some messages
    service.addMessage('Message 1', 'user');
    service.addMessage('Message 2', 'agent');
    service.addMessage('Message 3', 'user');

    expect(service.chatMessages().length).toBe(3);

    // Clear history
    service.clearHistory();

    expect(service.chatMessages()).toEqual([]);
    expect(service.getHistory()).toEqual([]);
  });

  // T082: ChatStorageService tracks both user and agent messages with correct sender
  it('should track both user and agent messages with correct sender', () => {
    service.addMessage('User message 1', 'user');
    service.addMessage('Agent response 1', 'agent');
    service.addMessage('User message 2', 'user');
    service.addMessage('Agent response 2', 'agent');

    const messages = service.chatMessages();
    expect(messages.length).toBe(4);

    expect(messages[0].sender).toBe('user');
    expect(messages[0].content).toBe('User message 1');

    expect(messages[1].sender).toBe('agent');
    expect(messages[1].content).toBe('Agent response 1');

    expect(messages[2].sender).toBe('user');
    expect(messages[2].content).toBe('User message 2');

    expect(messages[3].sender).toBe('agent');
    expect(messages[3].content).toBe('Agent response 2');
  });

  // T083: ChatStorageService messages have unique IDs using crypto.randomUUID()
  it('should generate unique IDs for all messages using crypto.randomUUID()', () => {
    service.addMessage('Message 1', 'user');
    service.addMessage('Message 2', 'agent');
    service.addMessage('Message 3', 'user');

    const messages = service.chatMessages();
    const ids = messages.map((m: ChatMessageState) => m.id);

    // All IDs should be truthy
    ids.forEach((id: string) => expect(id).toBeTruthy());

    // All IDs should be unique
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);

    // IDs should match UUID v4 format (basic check)
    ids.forEach((id: string) => {
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });
  });

  // Additional test: Verify readonly signal behavior
  it('should return readonly signal from getHistory()', () => {
    service.addMessage('Test message', 'user');

    const history1 = service.getHistory();
    const history2 = service.getHistory();

    // Should return same reference (readonly signal)
    expect(history1).toBe(history2);
  });

  // Additional test: Verify message order preservation
  it('should preserve message insertion order', () => {
    const messages = [
      { content: 'First', sender: 'user' as const },
      { content: 'Second', sender: 'agent' as const },
      { content: 'Third', sender: 'user' as const },
      { content: 'Fourth', sender: 'agent' as const },
    ];

    messages.forEach((msg) => service.addMessage(msg.content, msg.sender));

    const stored = service.chatMessages();
    expect(stored.length).toBe(4);
    expect(stored[0].content).toBe('First');
    expect(stored[1].content).toBe('Second');
    expect(stored[2].content).toBe('Third');
    expect(stored[3].content).toBe('Fourth');
  });

  // Additional test: Verify timestamp handling
  it('should set current timestamp when adding messages', () => {
    const beforeAdd = new Date();
    service.addMessage('Test', 'user');
    const afterAdd = new Date();

    const messages = service.chatMessages();
    const timestamp = messages[0].timestamp;

    expect(timestamp.getTime()).toBeGreaterThanOrEqual(beforeAdd.getTime());
    expect(timestamp.getTime()).toBeLessThanOrEqual(afterAdd.getTime());
  });
});
