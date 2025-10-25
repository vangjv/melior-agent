/**
 * Chat Storage Service
 * Manages chat message history for the current session
 *
 * Responsibilities:
 * - Store chat messages in memory (session-only, no persistence)
 * - Provide reactive access to message history via Signal
 * - Support adding user and agent messages
 * - Clear history on disconnect
 *
 * Constitutional Compliance:
 * - Angular 20 Signal-based state management
 * - Zoneless change detection compatible
 * - Type-safe with explicit interfaces
 */

import { Injectable, signal, Signal } from '@angular/core';
import {
  ChatMessageState,
  MessageSender,
  createUserMessage,
  createAgentMessage,
} from '../models/chat-message.model';

@Injectable({
  providedIn: 'root',
})
export class ChatStorageService {
  /**
   * Private signal for chat message history
   * Updated when messages are added or cleared
   */
  private readonly _chatMessages = signal<ChatMessageState[]>([]);

  /**
   * Public readonly accessor for chat messages
   * Components bind to this for reactive updates
   */
  public readonly chatMessages: Signal<ChatMessageState[]> =
    this._chatMessages.asReadonly();

  constructor() {}

  /**
   * Add a new message to the chat history
   * Creates message with unique ID and current timestamp
   *
   * @param content - Message text content
   * @param sender - Who sent the message ('user' or 'agent')
   */
  addMessage(content: string, sender: MessageSender): void {
    const message =
      sender === 'user'
        ? createUserMessage(content)
        : createAgentMessage(content);

    // Append to existing messages
    this._chatMessages.update((messages) => [...messages, message]);
  }

  /**
   * Clear all messages from history
   * Called when user disconnects or starts new session
   */
  clearHistory(): void {
    this._chatMessages.set([]);
  }

  /**
   * Get readonly signal of message history
   * Alias for chatMessages property (for API consistency)
   *
   * @returns Readonly signal of chat messages
   */
  getHistory(): ChatMessageState[] {
    return this._chatMessages();
  }
}
