/**
 * Transcription message entity
 */
export interface TranscriptionMessage {
  readonly id: string;
  readonly speaker: Speaker;
  readonly text: string;
  readonly timestamp: Date;
  readonly confidence?: number;
  readonly isFinal: boolean;
  readonly language?: string;
}

export type Speaker = 'user' | 'agent';

/**
 * Partial transcription for interim results
 */
export interface InterimTranscription {
  readonly speaker: Speaker;
  readonly text: string;
  readonly timestamp: Date;
}
