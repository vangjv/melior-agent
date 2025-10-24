import { Injectable, Signal, signal, computed } from '@angular/core';
import { Room } from 'livekit-client';
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

  // Event handler reference for cleanup
  private _transcriptionHandler: ((data: any) => void) | null = null;

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

    // T073: Subscribe to RoomEvent.TranscriptionReceived
    // Note: LiveKit's transcription event name may vary - using placeholder
    this._transcriptionHandler = (data: any) => {
      this.handleTranscriptionEvent(data);
    };

    // TODO: Replace with actual LiveKit transcription event when available
    // For now, this is a placeholder for the event subscription pattern
    // room.on(RoomEvent.TranscriptionReceived, this._transcriptionHandler);
  }

  /**
   * T077: Stop listening for transcriptions and cleanup
   */
  stopTranscription(): void {
    if (this._room && this._transcriptionHandler) {
      // T077: Unsubscribe from events
      // TODO: Replace with actual LiveKit event cleanup
      // this._room.off(RoomEvent.TranscriptionReceived, this._transcriptionHandler);
      this._transcriptionHandler = null;
    }
    this._room = null;
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
   * T074-T076: Handle incoming transcription events from LiveKit
   */
  private handleTranscriptionEvent(data: any): void {
    // T074: Map LiveKit segment to our TranscriptionMessage model
    const message = this.mapLiveKitSegmentToMessage(data);

    if (message.isFinal) {
      // T075: Update transcriptions signal for final transcription
      this._transcriptions.update((messages: readonly TranscriptionMessage[]) => [...messages, message]);

      // Clear interim transcription when final is received
      this._interimTranscription.set(null);
    } else {
      // T076: Update interim transcription signal for non-final transcription
      const interim: InterimTranscription = {
        speaker: message.speaker,
        text: message.text,
        timestamp: message.timestamp,
      };
      this._interimTranscription.set(interim);
    }
  }

  /**
   * T074: Map LiveKit transcription segment to our message model
   */
  private mapLiveKitSegmentToMessage(data: any): TranscriptionMessage {
    // TODO: Replace with actual LiveKit transcription data structure
    // This is a placeholder implementation
    const message: TranscriptionMessage = {
      id: data.id || crypto.randomUUID(),
      speaker: this.determineSpeaker(data),
      text: data.text || data.transcript || '',
      timestamp: new Date(data.timestamp || Date.now()),
      confidence: data.confidence,
      isFinal: data.isFinal ?? data.final ?? true,
      language: data.language,
    };
    return message;
  }

  /**
   * Determine if speaker is user or agent based on LiveKit participant
   */
  private determineSpeaker(data: any): Speaker {
    // TODO: Replace with actual logic based on LiveKit participant identity
    // For now, assume agent is any non-local participant
    return data.isLocal || data.participant?.isLocal ? 'user' : 'agent';
  }
}
