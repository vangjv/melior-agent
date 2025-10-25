import { ConnectionQuality } from './connection-state.model';
import { TranscriptionMessage } from './transcription-message.model';

/**
 * Voice session entity
 * Tracks the complete conversation lifecycle
 */
export interface VoiceSession {
  readonly sessionId: string;
  readonly startTime: Date;
  readonly endTime?: Date;
  readonly transcriptions: readonly TranscriptionMessage[];
  readonly connectionQuality: ConnectionQuality;
  readonly metadata: SessionMetadata;
}

export interface SessionMetadata {
  readonly roomName: string;
  readonly participantId: string;
  readonly agentVersion?: string;
  readonly userAgent: string;
  readonly platform: 'ios' | 'android' | 'web';
  readonly totalDuration?: number; // in seconds
}
