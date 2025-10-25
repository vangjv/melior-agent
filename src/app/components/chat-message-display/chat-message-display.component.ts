/**
 * Chat Message Display Component
 * Presentational component for displaying chat messages
 *
 * Responsibilities:
 * - Render user and agent messages with distinct styling
 * - Display timestamps for each message
 * - Auto-scroll to bottom when new messages arrive
 * - Use virtual scrolling for large message lists (>100 messages)
 *
 * Constitutional Compliance:
 * - Standalone component with OnPush change detection
 * - Signal-based inputs using input()
 * - No business logic - pure presentation
 * - Accessibility: semantic HTML, ARIA attributes, color contrast
 */

import {
  Component,
  input,
  ViewChild,
  ElementRef,
  AfterViewChecked,
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
export class ChatMessageDisplayComponent implements AfterViewChecked {
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

  /**
   * Track whether we should scroll on next view check
   */
  private shouldScrollToBottom = false;

  /**
   * Previous message count for detecting new messages
   */
  private previousMessageCount = 0;

  constructor() {}

  /**
   * AfterViewChecked lifecycle hook
   * Auto-scroll to bottom when new messages arrive
   */
  ngAfterViewChecked(): void {
    const currentCount = this.messages().length;

    // Check if new messages were added
    if (currentCount > this.previousMessageCount) {
      this.shouldScrollToBottom = true;
      this.previousMessageCount = currentCount;
    }

    // Scroll to bottom if needed
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  /**
   * Scroll to bottom of message list
   * Handles both regular and virtual scrolling containers
   */
  private scrollToBottom(): void {
    try {
      if (this.useVirtualScrolling() && this.virtualScrollViewport) {
        // Virtual scrolling: scroll to last index
        const lastIndex = this.messages().length - 1;
        this.virtualScrollViewport.scrollToIndex(lastIndex, 'smooth');
      } else if (this.scrollContainer) {
        // Regular scrolling: scroll to bottom
        const element = this.scrollContainer.nativeElement;
        element.scrollTo({
          top: element.scrollHeight,
          behavior: 'smooth',
        });
      }
    } catch (error) {
      // Graceful degradation - don't crash on scroll errors
      console.warn('Auto-scroll failed:', error);
    }
  }

  /**
   * TrackBy function for ngFor performance
   * Uses message ID to minimize DOM updates
   */
  trackByMessageId(index: number, message: ChatMessageState): string {
    return message.id;
  }

  /**
   * Format timestamp for display
   * Shows time in HH:MM:SS format
   */
  formatTimestamp(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }
}
