import { Component, input, ViewChild, ElementRef, effect, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollingModule, CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { TranscriptionMessage, InterimTranscription } from '../../models/transcription-message.model';

/**
 * T079-T087, T102-T105: Transcription Display Component
 * Presentational component for displaying transcription messages
 * Uses virtual scrolling for large message lists (>100 messages)
 *
 * @deprecated This component is deprecated as of feature 005-unified-conversation.
 * Use UnifiedConversationDisplayComponent instead, which combines transcription
 * and chat message display into a single unified interface.
 * This component will be removed in a future release.
 * Migration guide: See specs/005-unified-conversation/MIGRATION.md
 */
@Component({
  selector: 'app-transcription-display',
  standalone: true,
  imports: [CommonModule, ScrollingModule],
  templateUrl: './transcription-display.component.html',
  styleUrl: './transcription-display.component.scss',
  // T081: OnPush change detection strategy
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TranscriptionDisplayComponent {
  // T080: Input signal for transcriptions
  transcriptions = input.required<readonly TranscriptionMessage[]>();

  // Input signal for interim transcription
  interimTranscription = input<InterimTranscription | null>(null);

  // T104: Computed signal for conditional virtual scrolling
  readonly useVirtualScroll = computed(() => this.transcriptions().length > 100);

  // T103: Item size for virtual scrolling optimization (in pixels)
  readonly itemSize = 80; // Average height of a transcription message

  // T087: ViewChild reference for auto-scroll (regular scrolling)
  @ViewChild('scrollContainer') scrollContainer?: ElementRef<HTMLDivElement>;

  // T102: ViewChild reference for virtual scroll viewport
  @ViewChild(CdkVirtualScrollViewport) virtualScroll?: CdkVirtualScrollViewport;

  constructor() {
    // T087: Auto-scroll effect when transcriptions change
    effect(() => {
      const messages = this.transcriptions();
      const interim = this.interimTranscription();
      if (messages.length > 0 || interim) {
        this.scrollToBottom();
      }
    });
  }

  // T082: TrackBy function using message.id for performance
  trackByMessageId(index: number, message: TranscriptionMessage): string {
    return message.id;
  }

  // T087 & T102: Auto-scroll implementation for both regular and virtual scrolling
  private scrollToBottom(): void {
    // Use setTimeout to ensure DOM has updated
    setTimeout(() => {
      if (this.useVirtualScroll() && this.virtualScroll) {
        // T102: Scroll virtual viewport to bottom
        const itemCount = this.transcriptions().length;
        this.virtualScroll.scrollToIndex(itemCount - 1, 'smooth');
      } else if (this.scrollContainer) {
        // T087: Regular scroll
        const element = this.scrollContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    }, 0);
  }
}
