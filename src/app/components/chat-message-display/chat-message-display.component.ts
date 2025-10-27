/**
 * Chat Message Display Component
 * Presentational component for displaying chat messages
 *
 * Responsibilities:
 * - Render user and agent messages with distinct styling
 * - Display role labels and timestamps for each message
 * - Auto-scroll to bottom when new messages arrive or text is streamed
 * - Use virtual scrolling for large message lists (>100 messages)
 *
 * Constitutional Compliance:
 * - Standalone component with OnPush change detection
 * - Signal-based inputs using input()
 * - No business logic - pure presentation
 * - Accessibility: semantic HTML, ARIA attributes, color contrast
 *
 * @deprecated This component is deprecated as of feature 005-unified-conversation.
 * Use UnifiedConversationDisplayComponent instead, which combines transcription
 * and chat message display into a single unified interface.
 * This component will be removed in a future release.
 * Migration guide: See specs/005-unified-conversation/MIGRATION.md
 */

import {
  Component,
  input,
  ViewChild,
  ElementRef,
  effect,
  ChangeDetectionStrategy,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollingModule, CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { ChatMessageState } from '../../models/chat-message.model';

@Component({
  selector: 'app-chat-message-display',
  standalone: true,
  imports: [CommonModule, ScrollingModule],
  templateUrl: './chat-message-display.component.html',
  styleUrl: './chat-message-display.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatMessageDisplayComponent {
  /**
   * Required input: Array of chat messages to display
   */
  messages = input.required<ChatMessageState[]>();

  /**
   * Computed signal to determine if virtual scrolling should be used
   * Use virtual scrolling when message count > 100 for performance
   */
  useVirtualScrolling = computed(() => this.messages().length > 100);

  /**
   * ViewChild for scroll container (non-virtual scrolling)
   */
  @ViewChild('scrollContainer', { read: ElementRef })
  scrollContainer?: ElementRef<HTMLDivElement>;

  /**
   * ViewChild for virtual scroll viewport (virtual scrolling)
   */
  @ViewChild(CdkVirtualScrollViewport)
  virtualScrollViewport?: CdkVirtualScrollViewport;

  constructor() {
    // Auto-scroll effect when messages change
    effect(() => {
      const msgs = this.messages();
      if (msgs.length > 0) {
        this.scrollToBottom();
      }
    });
  }

  /**
   * Scroll to bottom of message list
   * Handles both regular and virtual scrolling containers
   * Auto-scrolls on new messages and during streaming
   */
  private scrollToBottom(): void {
    // Use setTimeout to ensure DOM has updated
    setTimeout(() => {
      try {
        if (this.useVirtualScrolling() && this.virtualScrollViewport) {
          // Virtual scrolling: scroll to last index
          const lastIndex = this.messages().length - 1;
          this.virtualScrollViewport.scrollToIndex(lastIndex, 'smooth');
        } else if (this.scrollContainer) {
          // Regular scrolling: scroll to bottom
          const element = this.scrollContainer.nativeElement;
          element.scrollTop = element.scrollHeight;
        }
      } catch (error) {
        // Graceful degradation - don't crash on scroll errors
        console.warn('Auto-scroll failed:', error);
      }
    }, 0);
  }

  /**
   * TrackBy function for ngFor performance
   * Uses message ID to minimize DOM updates
   */
  trackByMessageId(index: number, message: ChatMessageState): string {
    return message.id;
  }
}
