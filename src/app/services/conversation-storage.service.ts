/**
 * Conversation Storage Service
 * Feature: 005-unified-conversation
 *
 * Manages unified conversation state with signal-based reactivity
 * Handles message storage, persistence, and restoration
 */

import { Injectable, signal, computed } from '@angular/core';
import { UnifiedConversationMessage } from '../models/unified-conversation-message.model';
import {
  ConversationFeedState,
  createEmptyConversationFeed,
  serializeConversationFeed,
  deserializeConversationFeed
} from '../models/conversation-feed-state.model';
import { ResponseMode } from '../models/unified-conversation-message.model';
import { addMessage, sortMessagesByTimestamp } from '../utils/message-merger.util';
import { loadWithMigrationFallback, getUnifiedStorageKey } from '../utils/storage-migration.util';

@Injectable({
  providedIn: 'root'
})
export class ConversationStorageService {
  // Private writable signals
  private readonly _messages = signal<readonly UnifiedConversationMessage[]>([]);
  private readonly _currentMode = signal<ResponseMode>('voice');
  private readonly _sessionId = signal<string>(this.generateSessionId());
  private readonly _lastMessageAt = signal<Date | null>(null);

  // Public readonly signals
  readonly messages = this._messages.asReadonly();
  readonly currentMode = this._currentMode.asReadonly();
  readonly sessionId = this._sessionId.asReadonly();
  readonly lastMessageAt = this._lastMessageAt.asReadonly();

  // Computed signals
  readonly messageCount = computed(() => this.messages().length);
  readonly sortedMessages = computed(() =>
    sortMessagesByTimestamp([...this.messages()])
  );
  readonly isEmpty = computed(() => this.messageCount() === 0);

  // Storage debounce timer
  private saveTimer?: number;
  private readonly SAVE_DEBOUNCE_MS = 500;

  constructor() {
    this.restoreFromStorage();
  }

  /**
   * Add message to conversation
   * Handles deduplication, sorting, and interim replacement
   */
  addMessage(message: UnifiedConversationMessage): void {
    const currentMessages = this._messages();
    const updated = addMessage([...currentMessages], message);

    this._messages.set(updated);
    this._lastMessageAt.set(message.timestamp);

    this.debouncedSave();
  }

  /**
   * Add multiple messages
   * More efficient than calling addMessage repeatedly
   */
  addMessages(messages: UnifiedConversationMessage[]): void {
    let updated = [...this._messages()];

    messages.forEach(msg => {
      updated = addMessage(updated, msg);
    });

    this._messages.set(updated);

    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      this._lastMessageAt.set(lastMessage.timestamp);
    }

    this.debouncedSave();
  }

  /**
   * Clear all conversation messages
   */
  clearMessages(): void {
    this._messages.set([]);
    this._lastMessageAt.set(null);
    this.saveToStorage();
  }

  /**
   * Set response mode (voice or chat)
   */
  setMode(mode: ResponseMode): void {
    this._currentMode.set(mode);
    this.debouncedSave();
  }

  /**
   * Get current conversation feed state
   */
  getState(): ConversationFeedState {
    return {
      messages: this.messages(),
      currentMode: this.currentMode(),
      sessionId: this.sessionId(),
      lastMessageAt: this.lastMessageAt(),
      messageCount: this.messageCount()
    };
  }

  /**
   * Restore conversation from sessionStorage
   * Handles migration from legacy format
   */
  private restoreFromStorage(): void {
    try {
      const sessionId = this._sessionId();
      const restored = loadWithMigrationFallback(sessionId);

      if (restored) {
        this._messages.set(restored.messages);
        this._currentMode.set(restored.currentMode);
        this._lastMessageAt.set(restored.lastMessageAt);

        console.log(`Restored ${restored.messageCount} messages from storage`);
      }
    } catch (error) {
      console.error('Failed to restore conversation from storage:', error);
    }
  }

  /**
   * Save conversation to sessionStorage with debouncing
   */
  private debouncedSave(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    this.saveTimer = window.setTimeout(() => {
      this.saveToStorage();
    }, this.SAVE_DEBOUNCE_MS);
  }

  /**
   * Immediately save conversation to sessionStorage
   */
  private saveToStorage(): void {
    try {
      const state = this.getState();
      const serialized = serializeConversationFeed(state);
      const key = getUnifiedStorageKey(this._sessionId());

      sessionStorage.setItem(key, serialized);
    } catch (error) {
      console.error('Failed to save conversation to storage:', error);
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${crypto.randomUUID()}`;
  }

  /**
   * Reset to new session (for testing or manual reset)
   */
  resetSession(): void {
    this._messages.set([]);
    this._lastMessageAt.set(null);
    this._sessionId.set(this.generateSessionId());
    this._currentMode.set('voice');

    this.saveToStorage();
  }
}
