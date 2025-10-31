/**
 * Text Input Component
 * Feature: 007-text-chat-input
 * Presentational component for text message input UI
 */
import { Component, ChangeDetectionStrategy, signal, computed, output, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { getKeyboardAction } from '../../models/keyboard-event.model';

@Component({
  selector: 'app-text-input',
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './text-input.html',
  styleUrl: './text-input.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextInput {
  // Inputs
  isDisabled = input<boolean>(false);
  placeholder = input<string>('Type a message...');

  // Outputs
  messageSent = output<string>();

  // Component state
  messageText = signal<string>('');
  isSending = signal<boolean>(false);

  // Computed signals
  canSend = computed(() => {
    const text = this.messageText().trim();
    return text.length > 0 && !this.isDisabled() && !this.isSending();
  });

  characterCount = computed(() => this.messageText().length);
  showCharacterCount = computed(() => this.characterCount() > 4500); // 90% of 5000

  /**
   * Handle keyboard events (Enter to send, Shift+Enter for new line)
   */
  handleKeydown(event: KeyboardEvent): void {
    const action = getKeyboardAction(event);

    if (action.action === 'send') {
      event.preventDefault();
      this.sendMessage();
    }
    // 'newline' action allows default behavior (Shift+Enter)
    // 'none' action does nothing (all other keys)
  }

  /**
   * Send the current message
   */
  sendMessage(): void {
    if (!this.canSend()) {
      return;
    }

    const text = this.messageText().trim();
    this.messageSent.emit(text);
    this.messageText.set(''); // Clear input after sending
  }
}
