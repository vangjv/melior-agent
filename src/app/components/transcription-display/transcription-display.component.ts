import { Component, input, ViewChild, ElementRef, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranscriptionMessage } from '../../models/transcription-message.model';

/**
 * T079-T087: Transcription Display Component
 * Presentational component for displaying transcription messages
 */
@Component({
  selector: 'app-transcription-display',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './transcription-display.component.html',
  styleUrl: './transcription-display.component.scss',
  // T081: OnPush change detection strategy
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TranscriptionDisplayComponent {
  // T080: Input signal for transcriptions
  transcriptions = input.required<readonly TranscriptionMessage[]>();

  // T087: ViewChild reference for auto-scroll
  @ViewChild('scrollContainer') scrollContainer?: ElementRef<HTMLDivElement>;

  constructor() {
    // T087: Auto-scroll effect when transcriptions change
    effect(() => {
      const messages = this.transcriptions();
      if (messages.length > 0) {
        this.scrollToBottom();
      }
    });
  }

  // T082: TrackBy function using message.id for performance
  trackByMessageId(index: number, message: TranscriptionMessage): string {
    return message.id;
  }

  // T087: Auto-scroll implementation
  private scrollToBottom(): void {
    // Use setTimeout to ensure DOM has updated
    setTimeout(() => {
      if (this.scrollContainer) {
        const element = this.scrollContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    }, 0);
  }
}
