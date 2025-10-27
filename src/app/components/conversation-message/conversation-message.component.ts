/**
 * ConversationMessageComponent (Presentational)
 * Feature: 005-unified-conversation
 *
 * Displays a single conversation message with:
 * - Visual distinction between user and agent messages
 * - Delivery method indicators (voice vs chat)
 * - Timestamp display
 * - Interim transcription styling
 * - Semantic HTML and ARIA labels for accessibility
 */

import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import {
  UnifiedConversationMessage,
  isTranscriptionMessage,
  isChatMessage
} from '../../models/unified-conversation-message.model';

@Component({
  selector: 'app-conversation-message',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './conversation-message.component.html',
  styleUrl: './conversation-message.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConversationMessageComponent {
  /**
   * The message to display
   */
  message = input.required<UnifiedConversationMessage>();

  /**
   * Computed: Is this a transcription message?
   */
  isTranscription = computed(() => isTranscriptionMessage(this.message()));

  /**
   * Computed: Is this a chat message?
   */
  isChat = computed(() => isChatMessage(this.message()));

  /**
   * Computed: Is this an interim transcription?
   */
  isInterim = computed(() => {
    const msg = this.message();
    return isTranscriptionMessage(msg) && !msg.isFinal;
  });

  /**
   * Computed: Is this message from the user?
   */
  isUser = computed(() => this.message().sender === 'user');

  /**
   * Computed: Is this message from the agent?
   */
  isAgent = computed(() => this.message().sender === 'agent');

  /**
   * Computed: Delivery method for display badge
   */
  deliveryMethod = computed(() => {
    const msg = this.message();
    if (isTranscriptionMessage(msg)) {
      return 'voice';
    } else if (isChatMessage(msg)) {
      return 'chat';
    }
    return 'unknown';
  });

  /**
   * Computed: CSS classes for message styling
   */
  messageClasses = computed(() => {
    const msg = this.message();
    const classes: string[] = ['message'];

    // Sender class
    classes.push(this.isUser() ? 'message--user' : 'message--agent');

    // Message type class
    if (this.isTranscription()) {
      classes.push('message--transcription');
    } else if (this.isChat()) {
      classes.push('message--chat');
    }

    // Interim class
    if (this.isInterim()) {
      classes.push('message--interim');
    }

    return classes.join(' ');
  });

  /**
   * Computed: ARIA label for accessibility
   */
  ariaLabel = computed(() => {
    const msg = this.message();
    const sender = this.isUser() ? 'You' : 'Agent';
    const delivery = this.deliveryMethod();
    const time = this.formatTimestamp(msg.timestamp);

    return `${sender} via ${delivery} at ${time}: ${msg.content}`;
  });

  /**
   * Format timestamp for display
   */
  formatTimestamp(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) {
      return 'just now';
    } else if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      return timestamp.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }

  /**
   * Get icon for delivery method badge
   */
  getDeliveryIcon(method: string): string {
    switch (method) {
      case 'voice':
        return 'mic';
      case 'chat':
        return 'chat_bubble';
      default:
        return 'help_outline';
    }
  }
}
