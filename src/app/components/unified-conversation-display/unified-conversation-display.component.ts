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
import { ScrollingModule, CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { ConversationMessageComponent } from '../conversation-message/conversation-message.component';
import { ConversationStorageService } from '../../services/conversation-storage.service';
import { UnifiedConversationMessage } from '../../models/unified-conversation-message.model';
import { TextInput } from '../text-input/text-input';
import { LiveKitConnectionService } from '../../services/livekit-connection.service';
import { ConnectionState } from '../../models/connection-state.model';

@Component({
  selector: 'app-unified-conversation-display',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    ScrollingModule,
    ConversationMessageComponent,
    TextInput
  ],
  templateUrl: './unified-conversation-display.component.html',
  styleUrl: './unified-conversation-display.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UnifiedConversationDisplayComponent {
  // Inject services
  private conversationStorage = inject(ConversationStorageService);
  private livekitConnection = inject(LiveKitConnectionService);

  // View references
  @ViewChild('scrollContainer', { static: false })
  scrollContainer?: ElementRef<HTMLDivElement>;

  @ViewChild(CdkVirtualScrollViewport, { static: false })
  virtualScrollViewport?: CdkVirtualScrollViewport;

  /**
   * Track if user has manually scrolled up
   */
  userHasScrolledUp = signal(false);

  /**
   * Virtual scrolling item size (average message height in pixels)
   */
  readonly ITEM_SIZE = 80;

  /**
   * Threshold for enabling virtual scrolling
   */
  readonly VIRTUAL_SCROLL_THRESHOLD = 100;

  /**
   * Get messages from storage service
   */
  messages = this.conversationStorage.messages;

  /**
   * Get current response mode from storage service
   */
  currentMode = this.conversationStorage.currentMode;

  /**
   * Get first new message ID (for session boundary separator)
   */
  firstNewMessageId = this.conversationStorage.firstNewMessageId;

  /**
   * Get connection state for text input (Feature 007-text-chat-input)
   */
  connectionState = this.livekitConnection.connectionState;

  /**
   * Computed: Is text input disabled based on connection state
   */
  isTextInputDisabled = computed(() => {
    const state = this.connectionState();
    return state.status !== 'connected';
  });

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
   * Computed: Whether to use virtual scrolling
   * Activate when message count exceeds threshold
   */
  useVirtualScrolling = computed(() =>
    this.sortedMessages().length > this.VIRTUAL_SCROLL_THRESHOLD
  );

  /**
   * Effect: Auto-scroll to latest message when new messages arrive
   */
  constructor() {
    // Debug logging for message updates
    effect(() => {
      const messages = this.messages();
      console.log('🔔 UnifiedConversationDisplay - messages signal updated:', {
        count: messages.length,
        messages: messages.map(m => ({
          id: m.id,
          type: m.messageType,
          sender: m.sender,
          content: m.content.substring(0, 30)
        }))
      });
    });

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
   * Supports both regular and virtual scroll containers
   */
  private scrollToBottom(): void {
    if (this.useVirtualScrolling() && this.virtualScrollViewport) {
      // Virtual scroll: scroll to last index
      const lastIndex = this.sortedMessages().length - 1;
      this.virtualScrollViewport.scrollToIndex(lastIndex, 'smooth');
    } else if (this.scrollContainer) {
      // Regular scroll: scroll to bottom
      const element = this.scrollContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }

  /**
   * Handle scroll event to detect manual scrolling
   * Supports both regular and virtual scroll containers
   */
  onScroll(): void {
    let isAtBottom = false;

    if (this.useVirtualScrolling() && this.virtualScrollViewport) {
      // Virtual scroll: check if scrolled to last item
      const viewport = this.virtualScrollViewport;
      const range = viewport.getRenderedRange();
      const lastIndex = this.sortedMessages().length - 1;
      isAtBottom = range.end >= lastIndex;
    } else if (this.scrollContainer) {
      // Regular scroll: check if at bottom with threshold
      const element = this.scrollContainer.nativeElement;
      isAtBottom = Math.abs(
        element.scrollHeight - element.scrollTop - element.clientHeight
      ) < 10; // 10px threshold
    }

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

  /**
   * Clear all conversation messages
   * Prompts user for confirmation before clearing
   */
  clearConversation(): void {
    const confirmed = confirm(
      'Are you sure you want to clear the conversation history? This action cannot be undone.'
    );

    if (confirmed) {
      this.conversationStorage.clearMessages();
    }
  }

  /**
   * Handle text message sent from TextInputComponent
   * Feature: 007-text-chat-input
   */
  async handleTextMessage(content: string): Promise<void> {
    try {
      await this.conversationStorage.sendTextMessage(content, this.livekitConnection);
      console.log('✅ Text message sent successfully');
    } catch (error) {
      console.error('❌ Failed to send text message:', error);
      // TODO: Show error to user via snackbar or inline message
    }
  }
}
