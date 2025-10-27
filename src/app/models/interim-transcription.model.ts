/**
 * Interim Transcription Model
 * Feature: 005-unified-conversation
 *
 * Defines temporary state for in-progress transcription
 */

import { MessageSender } from './unified-conversation-message.model';

/**
 * Interim transcription state (not yet in message feed)
 * Displayed separately with visual indication
 */
export interface InterimTranscription {
  readonly speaker: MessageSender;  // 'user' or 'agent'
  readonly text: string;            // Current interim text
  readonly timestamp: Date;         // When transcription started
  readonly confidence?: number;     // Optional confidence score
}

/**
 * Factory: Create interim transcription
 */
export function createInterimTranscription(
  speaker: MessageSender,
  text: string,
  confidence?: number
): InterimTranscription {
  return {
    speaker,
    text,
    timestamp: new Date(),
    confidence
  };
}

/**
 * Validate interim transcription
 */
export function validateInterimTranscription(
  interim: InterimTranscription
): boolean {
  if (!interim.speaker || !['user', 'agent'].includes(interim.speaker)) {
    return false;
  }

  if (typeof interim.text !== 'string') {
    return false;
  }

  if (!(interim.timestamp instanceof Date)) {
    return false;
  }

  if (interim.confidence !== undefined) {
    if (typeof interim.confidence !== 'number' ||
        interim.confidence < 0 ||
        interim.confidence > 1) {
      return false;
    }
  }

  return true;
}
