import { Injectable, Signal, signal, computed, inject } from '@angular/core';
import { Room, RoomEvent, TranscriptionSegment, Participant, TrackPublication } from 'livekit-client';
import {
  TranscriptionMessage,
  InterimTranscription,
  Speaker,
} from '../models/transcription-message.model';
import { ConversationStorageService } from './conversation-storage.service';
import { createTranscriptionMessage } from '../models/unified-conversation-message.model';

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
 * Feature: 005-unified-conversation - Now integrates with ConversationStorageService
 */
@Injectable({
  providedIn: 'root',
})
export class TranscriptionService implements ITranscriptionService {
  // Inject ConversationStorageService for unified message storage
  private conversationStorage = inject(ConversationStorageService);

  // T070: Private state - transcriptions signal (now computed from storage)
  private _transcriptions = computed(() => {
    // Filter transcription messages from unified storage
    const allMessages = this.conversationStorage.messages();
    return allMessages
      .filter(msg => msg.messageType === 'transcription')
      .map(msg => ({
        id: msg.id,
        speaker: msg.sender as Speaker,
        text: msg.content,
        timestamp: msg.timestamp,
        isFinal: msg.isFinal,
        language: msg.language
      } as TranscriptionMessage));
  });

  // T071: Private state - interim transcription signal
  private _interimTranscription = signal<InterimTranscription | null>(null);

  // Track interim message IDs by speaker to enable updates instead of creating duplicates
  private _interimMessageIds = new Map<'user' | 'agent', string>();

  // Track current final message IDs by speaker to accumulate segments from same turn
  private _currentFinalMessageIds = new Map<'user' | 'agent', string>();

  // Track last speaker to detect turn boundaries (when speaker changes)
  private _lastSpeakerWithFinalSegment: 'user' | 'agent' | null = null;

  // Room reference for event handling
  private _room: Room | null = null;  // Event handler references for cleanup
  private _transcriptionReceivedHandler: ((
    segments: TranscriptionSegment[],
    participant?: Participant,
    publication?: TrackPublication
  ) => void) | null = null;

  // T070: Public readonly signals
  readonly transcriptions = this._transcriptions;
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

    // Clear turn tracking state
    this._currentFinalMessageIds.clear();
    this._lastSpeakerWithFinalSegment = null;

    console.log('Transcription service stopped');
  }  /**
   * T078: Clear all transcriptions and reset state
   */
  clearTranscriptions(): void {
    this.conversationStorage.clearMessages();
    this._interimTranscription.set(null);
    this._interimMessageIds.clear();
    this._currentFinalMessageIds.clear();
    this._lastSpeakerWithFinalSegment = null;
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
   * Feature: 005-unified-conversation - Now creates UnifiedConversationMessage instances
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

    // Determine speaker
    const speaker = this.determineSpeaker(participant);

    if (segment.final) {
      // Detect if this is a speaker change (turn boundary)
      const lastSpeaker = this._lastSpeakerWithFinalSegment;
      const isSpeakerChange = lastSpeaker !== null && lastSpeaker !== speaker;

      if (isSpeakerChange) {
        // Speaker changed - this is a new turn, clear the previous speaker's message tracking
        this._currentFinalMessageIds.delete(lastSpeaker!);
        console.log(`🔄 Speaker changed: ${lastSpeaker} → ${speaker}, starting new turn`);
      }

      // Update last speaker
      this._lastSpeakerWithFinalSegment = speaker;

      // Check if there's an existing interim message that should be converted to final
      const interimMessageId = this._interimMessageIds.get(speaker);
      const currentFinalMessageId = this._currentFinalMessageIds.get(speaker);

      if (interimMessageId && !currentFinalMessageId) {
        // Convert the interim message to final (first final segment for this speaker)
        // This works even after speaker change since we're working with the NEW speaker's interim
        this.conversationStorage.updateMessage(interimMessageId, {
          content: segment.text,
          isFinal: true,
          timestamp: new Date()
        });
        // Track this as the final message
        this._currentFinalMessageIds.set(speaker, interimMessageId);
        console.log('✅ Converted interim to final:', segment.text);
      } else if (currentFinalMessageId && !isSpeakerChange) {
        // Continue accumulating to existing final message (same speaker, same turn)
        const existingMessages = this.conversationStorage.messages();
        const existingMessage = existingMessages.find(msg => msg.id === currentFinalMessageId);

        if (existingMessage) {
          // Append segment text to existing message (with space separator)
          const updatedContent = existingMessage.content.trim() + ' ' + segment.text.trim();
          this.conversationStorage.updateMessage(currentFinalMessageId, {
            content: updatedContent,
            timestamp: new Date()
          });
          console.log('🔄 Accumulated segment to existing final message:', updatedContent);
        } else {
          // Message not found - create new one
          const unifiedMessage = createTranscriptionMessage(
            speaker,
            segment.text,
            true, // isFinal
            undefined,
            segment.language
          );
          this.conversationStorage.addMessage(unifiedMessage);
          this._currentFinalMessageIds.set(speaker, unifiedMessage.id);
          console.log('🆕 New final transcription (no existing):', segment.text);
        }
      } else {
        // First final segment for this speaker OR speaker changed - create new message
        const unifiedMessage = createTranscriptionMessage(
          speaker,
          segment.text,
          true, // isFinal
          undefined,
          segment.language
        );

        this.conversationStorage.addMessage(unifiedMessage);
        this._currentFinalMessageIds.set(speaker, unifiedMessage.id);

        console.log('🆕 New final transcription created:', segment.text);
      }

      // Keep the message ID tracking - don't delete it!
      // If we converted interim to final, keep tracking this message ID
      // so that future segments (interim or final) continue updating it
      if (interimMessageId && !currentFinalMessageId) {
        // We just converted interim to final, so update the interim tracker
        // to point to the same message (which is now final)
        // Don't delete it - future segments should update this message
      } else {
        // Clear interim tracking only if we created a brand new final message
        this._interimMessageIds.delete(speaker);
      }

      // Clear interim transcription signal when final is received
      this._interimTranscription.set(null);

      console.log('✅ Final transcription processed:', segment.text);

      // T123: Measure transcription latency
      performance.mark(`${perfMark}-end`);
      performance.measure(`transcription-latency-${segment.id}`, perfMark, `${perfMark}-end`);

      const latencyMeasure = performance.getEntriesByName(`transcription-latency-${segment.id}`)[0];
      if (latencyMeasure) {
        console.log(`⏱️ Transcription processed in ${latencyMeasure.duration.toFixed(2)}ms`);
      }
    } else {
      // T076: Handle interim transcription - update existing or create new
      // Also check for speaker change for interim segments
      const lastSpeaker = this._lastSpeakerWithFinalSegment;
      const isSpeakerChange = lastSpeaker !== null && lastSpeaker !== speaker;

      if (isSpeakerChange) {
        // Speaker changed - clear the previous speaker's interim message tracking
        this._interimMessageIds.delete(lastSpeaker!);
        // Also clear the current final message tracking for the NEW speaker
        // This allows interruptions (like saying "stop") to create new messages
        this._currentFinalMessageIds.delete(speaker);
        console.log(`🔄 Speaker changed (interim): ${lastSpeaker} → ${speaker}, cleared tracking for interruption`);
      }

      // Check if there's an existing message to update
      const currentFinalMessageId = this._currentFinalMessageIds.get(speaker);
      const existingInterimId = this._interimMessageIds.get(speaker);

      if (currentFinalMessageId && !isSpeakerChange) {
        // There's already a final message AND no speaker change - DON'T append interim (causes duplication)
        // Interim segments should only update in-progress messages, not final ones
        // Just ignore this interim since we already have final text
        console.log('⏭️ Skipping interim (already have final message, same turn):', segment.text);
      } else if (existingInterimId) {
        // Update existing interim message with new text
        this.conversationStorage.updateMessage(existingInterimId, {
          content: segment.text,
          timestamp: new Date()
        });
        console.log('🔄 Interim transcription updated:', segment.text);
      } else {
        // Create new interim message and track its ID
        // This will happen on speaker changes (like interruptions)
        const interimMessage = createTranscriptionMessage(
          speaker,
          segment.text,
          false, // isFinal
          undefined, // confidence (not provided by LiveKit segment)
          segment.language
        );

        this.conversationStorage.addMessage(interimMessage);
        this._interimMessageIds.set(speaker, interimMessage.id);
        console.log('🆕 Interim transcription created (possibly interruption):', segment.text);
      }

      // Also update interim transcription signal (for backward compatibility)
      const interim: InterimTranscription = {
        speaker: speaker,
        text: segment.text,
        timestamp: new Date(),
      };
      this._interimTranscription.set(interim);
    }
  }

  /**
   * Determine if speaker is user or agent based on LiveKit participant
   */
  private determineSpeaker(participant?: Participant): 'user' | 'agent' {
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
