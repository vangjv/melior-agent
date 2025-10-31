/**
 * Text Input State Models
 * Feature: 007-text-chat-input
 * Defines state management interfaces for text input component
 */

/**
 * Text input component state
 */
export interface TextInputState {
  readonly value: string;              // Current text content
  readonly isFocused: boolean;         // Whether input has focus
  readonly isDisabled: boolean;        // Whether input is disabled
  readonly placeholder: string;        // Placeholder text
  readonly characterCount: number;     // Current character count
  readonly maxCharacters: number;      // Maximum allowed characters (default 5000)
}

/**
 * Default text input state
 */
export const DEFAULT_TEXT_INPUT_STATE: TextInputState = {
  value: '',
  isFocused: false,
  isDisabled: false,
  placeholder: 'Type a message...',
  characterCount: 0,
  maxCharacters: 5000,
};

/**
 * Text input component configuration
 */
export interface TextInputConfig {
  readonly minRows: number;           // Minimum textarea rows (default 1)
  readonly maxRows: number;           // Maximum textarea rows before scroll (default 5)
  readonly maxCharacters: number;     // Character limit (default 5000)
  readonly showCharacterCount: boolean; // Show count when approaching limit (default true)
  readonly characterCountThreshold: number; // Show count at % of max (default 0.9)
  readonly autoFocus: boolean;        // Auto-focus after sending (default true)
  readonly enterToSend: boolean;      // Enter key sends message (default true)
}

/**
 * Default text input configuration
 */
export const DEFAULT_TEXT_INPUT_CONFIG: TextInputConfig = {
  minRows: 1,
  maxRows: 5,
  maxCharacters: 5000,
  showCharacterCount: true,
  characterCountThreshold: 0.9,
  autoFocus: true,
  enterToSend: true,
};

/**
 * Send button state discriminated union
 */
export type SendButtonState =
  | { status: 'idle'; canSend: boolean }
  | { status: 'sending' }
  | { status: 'success' }
  | { status: 'error'; errorMessage: string };

/**
 * Type guards for send button states
 */
export function isSendIdle(state: SendButtonState): state is { status: 'idle'; canSend: boolean } {
  return state.status === 'idle';
}

export function isSendSending(state: SendButtonState): state is { status: 'sending' } {
  return state.status === 'sending';
}

export function isSendSuccess(state: SendButtonState): state is { status: 'success' } {
  return state.status === 'success';
}

export function isSendError(state: SendButtonState): state is { status: 'error'; errorMessage: string } {
  return state.status === 'error';
}
