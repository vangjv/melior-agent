/**
 * Text Input Component
 * Feature: 007-text-chat-input
 * Presentational component for text message input UI
 */
import { Component, ChangeDetectionStrategy, signal, computed, output, input, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { getKeyboardAction } from '../../models/keyboard-event.model';

@Component({
  selector: 'app-text-input',
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    CdkTextareaAutosize,
  ],
  templateUrl: './text-input.html',
  styleUrl: './text-input.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextInput implements AfterViewInit {
  // ViewChild for focus management
  @ViewChild('textareaInput') textareaInput?: ElementRef<HTMLTextAreaElement>;
  // Inputs
  isDisabled = input<boolean>(false);
  placeholder = input<string>('Type a message...');

  // Outputs
  messageSent = output<string>();

  // Component state
  messageText = signal<string>('');
  isSending = signal<boolean>(false);
  error = signal<string | null>(null);

  // Computed signals
  canSend = computed(() => {
    const text = this.messageText().trim();
    return text.length > 0 && !this.isDisabled() && !this.isSending() && !this.error();
  });

  characterCount = computed(() => this.messageText().length);
  showCharacterCount = computed(() => this.characterCount() > 4500); // 90% of 5000
  hasError = computed(() => this.error() !== null);

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

    // Auto-focus after sending (T044)
    this.focusInput();
  }

  /**
   * Clear the error state
   */
  clearError(): void {
    this.error.set(null);
  }

  /**
   * Focus the textarea input
   */
  private focusInput(): void {
    if (this.textareaInput) {
      this.textareaInput.nativeElement.focus();
    }
  }

  /**
   * Lifecycle hook - called after view initialization
   */
  ngAfterViewInit(): void {
    // Initial focus can be added here if needed
  }
}
