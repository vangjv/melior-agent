/**
 * Keyboard Event Models
 * Feature: 007-text-chat-input
 * Defines keyboard event handling utilities for text input
 */

/**
 * Keyboard event handler for text input
 */
export type TextInputKeyboardEvent = KeyboardEvent & {
  readonly key: 'Enter' | 'Escape' | string;
  readonly shiftKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
};

/**
 * Keyboard action result
 */
export type KeyboardActionResult =
  | { action: 'send' }
  | { action: 'newline' }
  | { action: 'none' };

/**
 * Determine keyboard action from event
 */
export function getKeyboardAction(event: KeyboardEvent): KeyboardActionResult {
  // Enter without shift = send
  if (event.key === 'Enter' && !event.shiftKey) {
    return { action: 'send' };
  }
  // Shift+Enter = new line (default behavior)
  if (event.key === 'Enter' && event.shiftKey) {
    return { action: 'newline' };
  }
  // All other keys = no action
  return { action: 'none' };
}
