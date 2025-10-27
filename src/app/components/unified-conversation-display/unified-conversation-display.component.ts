/**
 * UnifiedConversationDisplayComponent (Smart Container)
 * Feature: 005-unified-conversation
 *
 * Responsibilities:
 * - Display all conversation messages in chronological order
 * - Auto-scroll to latest message
 * - Integrate with ConversationStorageService for state
 * - Handle empty state
 * - Provide trackBy for efficient rendering
 *
 * Uses OnPush change detection with signals for optimal performance
 */

import {
  Component,
  ChangeDetectionStrategy,
  computed,
  effect,
  ViewChild,
  ElementRef,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ConversationMessageComponent } from '../conversation-message/conversation-message.component';
import { ConversationStorageService } from '../../services/conversation-storage.service';
import { UnifiedConversationMessage } from '../../models/unified-conversation-message.model';

@Component({
  selector: 'app-unified-conversation-display',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    ConversationMessageComponent
  ],
  templateUrl: './unified-conversation-display.component.html',
  styleUrl: './unified-conversation-display.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UnifiedConversationDisplayComponent {
  // Inject services
  private conversationStorage = inject(ConversationStorageService);

  // View references
  @ViewChild('scrollContainer', { static: false })
  scrollContainer?: ElementRef<HTMLDivElement>;

  /**
   * Track if user has manually scrolled up
   */
  userHasScrolledUp = signal(false);

  /**
   * Get messages from storage service
   */
  messages = this.conversationStorage.messages;

  /**
   * Get current response mode from storage service
   */
  currentMode = this.conversationStorage.currentMode;

  /**
   * Computed: Sorted messages in chronological order (oldest first)
   */
  sortedMessages = computed(() => {
    const msgs = this.messages();
    return [...msgs].sort((a, b) =>
      a.timestamp.getTime() - b.timestamp.getTime()
    );
  });

  /**
   * Computed: Has any messages
   */
  hasMessages = computed(() => this.sortedMessages().length > 0);

  /**
   * Effect: Auto-scroll to latest message when new messages arrive
   */
  constructor() {
    effect(() => {
      const messageCount = this.sortedMessages().length;

      // Wait for view to update, then scroll if user hasn't scrolled up
      if (messageCount > 0 && !this.userHasScrolledUp()) {
        setTimeout(() => {
          this.scrollToBottom();
        }, 50);
      }
    });
  }

  /**
   * Scroll to bottom of container
   */
  private scrollToBottom(): void {
    if (this.scrollContainer) {
      const element = this.scrollContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }

  /**
   * Handle scroll event to detect manual scrolling
   */
  onScroll(): void {
    if (!this.scrollContainer) return;

    const element = this.scrollContainer.nativeElement;
    const isAtBottom = Math.abs(
      element.scrollHeight - element.scrollTop - element.clientHeight
    ) < 10; // 10px threshold

    // If user scrolled to bottom, resume auto-scroll
    // If user scrolled up, pause auto-scroll
    this.userHasScrolledUp.set(!isAtBottom);
  }

  /**
   * TrackBy function for ngFor optimization
   * Uses message ID to minimize DOM updates
   */
  trackByMessageId(index: number, message: UnifiedConversationMessage): string {
    return message.id;
  }

  /**
   * Manually scroll to bottom (called by parent or button)
   */
  scrollToLatest(): void {
    this.userHasScrolledUp.set(false);
    this.scrollToBottom();
  }
}
