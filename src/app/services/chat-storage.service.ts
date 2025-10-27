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
 *
 * @deprecated This service is deprecated as of feature 005-unified-conversation.
 * Use ConversationStorageService instead, which handles both transcription
 * and chat messages in a unified format with sessionStorage persistence.
 * This service will be removed in a future release.
 * Migration guide: See specs/005-unified-conversation/MIGRATION.md
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

  /**
   * Track currently streaming message by ID
   * Used to append chunks to the correct in-progress message
   */
  private streamingMessageId: string | null = null;

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
   * Start a new streaming message
   * Creates an empty message that will be updated with chunks
   *
   * @param messageId - Unique identifier for the streaming message
   * @param sender - Who is sending the message ('user' or 'agent')
   */
  startStreamingMessage(messageId: string, sender: MessageSender): void {
    this.streamingMessageId = messageId;

    const message = sender === 'user'
      ? createUserMessage('')
      : createAgentMessage('');

    // Set the message ID to match the streaming ID
    const messageWithId = { ...message, id: messageId };

    this._chatMessages.update((messages) => [...messages, messageWithId]);
  }

  /**
   * Append a chunk to the currently streaming message
   * Updates the message content by appending the new chunk
   *
   * @param messageId - ID of the message to update
   * @param chunk - Text chunk to append
   */
  appendChunk(messageId: string, chunk: string): void {
    this._chatMessages.update((messages) => {
      const index = messages.findIndex((msg) => msg.id === messageId);

      if (index === -1) {
        console.warn(`Message with ID ${messageId} not found`);
        return messages;
      }

      const updatedMessages = [...messages];
      updatedMessages[index] = {
        ...updatedMessages[index],
        content: updatedMessages[index].content + chunk,
      };

      return updatedMessages;
    });
  }

  /**
   * Complete a streaming message
   * Marks the message as complete and clears the streaming state
   *
   * @param messageId - ID of the message to complete
   */
  completeStreamingMessage(messageId: string): void {
    if (this.streamingMessageId === messageId) {
      this.streamingMessageId = null;
    }
  }

  /**
   * Clear all messages from history
   * Called when user disconnects or starts new session
   */
  clearHistory(): void {
    this._chatMessages.set([]);
    this.streamingMessageId = null;
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
