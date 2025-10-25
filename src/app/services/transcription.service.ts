import { Injectable, Signal, signal, computed } from '@angular/core';
import { Room, RoomEvent, TranscriptionSegment, Participant, TrackPublication } from 'livekit-client';
import {
  TranscriptionMessage,
  InterimTranscription,
  Speaker,
} from '../models/transcription-message.model';

/**
 * Service interface for transcription management
 */
export interface ITranscriptionService {
  /**
   * All transcription messages for current session (Signal)
   */
  readonly transcriptions: Signal<readonly TranscriptionMessage[]>;

  /**
   * Current interim (non-final) transcription (Signal)
   */
  readonly interimTranscription: Signal<InterimTranscription | null>;

  /**
   * Total message count (Computed Signal)
   */
  readonly messageCount: Signal<number>;

  /**
   * Start listening for transcriptions from LiveKit room
   * @param room Connected LiveKit Room instance
   */
  startTranscription(room: Room): void;

  /**
   * Stop listening for transcriptions
   */
  stopTranscription(): void;

  /**
   * Clear all transcriptions
   */
  clearTranscriptions(): void;

  /**
   * Get transcriptions filtered by speaker
   * @param speaker Speaker to filter by
   * @returns Filtered messages
   */
  getMessagesBySpeaker(speaker: Speaker): TranscriptionMessage[];

  /**
   * Export transcription history as text
   * @returns Formatted transcription text
   */
  exportTranscriptionText(): string;
}

/**
 * Transcription Service
 * Manages real-time transcription from LiveKit
 */
@Injectable({
  providedIn: 'root',
})
export class TranscriptionService implements ITranscriptionService {
  // T070: Private state - transcriptions signal
  private _transcriptions = signal<readonly TranscriptionMessage[]>([]);

  // T071: Private state - interim transcription signal
  private _interimTranscription = signal<InterimTranscription | null>(null);

  // Room reference for event handling
  private _room: Room | null = null;

  // Event handler references for cleanup
  private _transcriptionReceivedHandler: ((
    segments: TranscriptionSegment[],
    participant?: Participant,
    publication?: TrackPublication
  ) => void) | null = null;

  // T070: Public readonly signals
  readonly transcriptions = this._transcriptions.asReadonly();
  readonly interimTranscription = this._interimTranscription.asReadonly();

  // T072: Computed signal for message count
  readonly messageCount = computed(() => this._transcriptions().length);

  /**
   * T073: Start listening for transcriptions from LiveKit room
   */
  startTranscription(room: Room): void {
    this._room = room;

    // Use the correct LiveKit TranscriptionReceived event
    this._transcriptionReceivedHandler = (
      segments: TranscriptionSegment[],
      participant?: Participant,
      publication?: TrackPublication
    ) => {
      console.log('� TranscriptionReceived event:', {
        participantIdentity: participant?.identity,
        segmentCount: segments.length,
        segments: segments.map(s => ({
          id: s.id,
          text: s.text,
          final: s.final,
          language: s.language,
        })),
      });

      // Process each transcription segment
      segments.forEach((segment) => {
        this.handleTranscriptionSegment(segment, participant);
      });
    };

    // Subscribe to TranscriptionReceived event (the correct way to get transcriptions)
    room.on(RoomEvent.TranscriptionReceived, this._transcriptionReceivedHandler);

    console.log('✅ Transcription service started for room:', room.name);
    console.log('🔍 Listening for: TranscriptionReceived events');
  }  /**
   * T077: Stop listening for transcriptions and cleanup
   */
  stopTranscription(): void {
    if (this._room) {
      // T077: Unsubscribe from events
      if (this._transcriptionReceivedHandler) {
        this._room.off(RoomEvent.TranscriptionReceived, this._transcriptionReceivedHandler);
        this._transcriptionReceivedHandler = null;
      }
    }
    this._room = null;
    console.log('Transcription service stopped');
  }

  /**
   * T078: Clear all transcriptions and reset state
   */
  clearTranscriptions(): void {
    this._transcriptions.set([]);
    this._interimTranscription.set(null);
  }

  /**
   * Get messages filtered by speaker
   */
  getMessagesBySpeaker(speaker: Speaker): TranscriptionMessage[] {
    return this._transcriptions().filter((msg: TranscriptionMessage) => msg.speaker === speaker);
  }

  /**
   * Export transcription history as formatted text
   */
  exportTranscriptionText(): string {
    return this._transcriptions()
      .map((msg: TranscriptionMessage) => {
        const timestamp = msg.timestamp.toLocaleTimeString();
        const speaker = msg.speaker === 'user' ? 'You' : 'Agent';
        return `[${timestamp}] ${speaker}: ${msg.text}`;
      })
      .join('\n');
  }

  /**
   * T074-T076: Handle incoming transcription segments from LiveKit
   * T123: Add performance marks for transcription latency tracking
   */
  private handleTranscriptionSegment(segment: TranscriptionSegment, participant?: Participant): void {
    // T123: Mark start of transcription processing
    const perfMark = `transcription-${segment.id}`;
    performance.mark(perfMark);

    console.log('Processing transcription segment:', {
      id: segment.id,
      text: segment.text,
      final: segment.final,
      participantIdentity: participant?.identity,
    });

    // T074: Map LiveKit segment to our TranscriptionMessage model
    const message = this.mapLiveKitSegmentToMessage(segment, participant);

    if (segment.final) {
      // T075: Update transcriptions signal for final transcription
      this._transcriptions.update((messages: readonly TranscriptionMessage[]) => [...messages, message]);

      // Clear interim transcription when final is received
      this._interimTranscription.set(null);

      console.log('✅ Final transcription added:', message.text);

      // T123: Measure transcription latency
      performance.mark(`${perfMark}-end`);
      performance.measure(`transcription-latency-${segment.id}`, perfMark, `${perfMark}-end`);

      const latencyMeasure = performance.getEntriesByName(`transcription-latency-${segment.id}`)[0];
      if (latencyMeasure) {
        console.log(`⏱️ Transcription processed in ${latencyMeasure.duration.toFixed(2)}ms`);
      }
    } else {
      // T076: Update interim transcription signal for non-final transcription
      const interim: InterimTranscription = {
        speaker: message.speaker,
        text: message.text,
        timestamp: message.timestamp,
      };
      this._interimTranscription.set(interim);

      console.log('🔄 Interim transcription updated:', message.text);
    }
  }

  /**
   * T074: Map LiveKit transcription segment to our message model
   */
  private mapLiveKitSegmentToMessage(segment: TranscriptionSegment, participant?: Participant): TranscriptionMessage {
    const message: TranscriptionMessage = {
      id: segment.id,
      speaker: this.determineSpeaker(participant),
      text: segment.text,
      timestamp: new Date(),
      isFinal: segment.final,
      language: segment.language,
    };
    return message;
  }

  /**
   * Determine if speaker is user or agent based on LiveKit participant
   */
  private determineSpeaker(participant?: Participant): Speaker {
    // If no participant or participant is local, it's the user
    // Otherwise it's the agent
    if (!participant) {
      return 'agent'; // Default to agent for server-generated transcriptions
    }

    // Check if this is the local participant (user)
    const isLocal = participant.isLocal ?? false;
    return isLocal ? 'user' : 'agent';
  }
}
