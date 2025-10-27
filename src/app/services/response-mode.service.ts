import { Injectable, Signal, signal, computed, inject, effect } from '@angular/core';
import { Room, RoomEvent, DataPacket_Kind, RemoteParticipant, TranscriptionSegment, Participant, TrackPublication } from 'livekit-client';
import {
  ResponseMode,
  DEFAULT_RESPONSE_MODE,
  createSetResponseModeMessage,
  isResponseModeUpdatedMessage,
  isAgentChatMessage,
  isAgentChatChunk,
  isIncomingMessage,
  isValidResponseMode,
  BaseDataChannelMessage,
} from '../models/response-mode.model';
import { ChatStorageService } from './chat-storage.service';
import { ConversationStorageService } from './conversation-storage.service';

/**
 * Service for managing voice/chat response mode state and data channel communication
 *
 * Responsibilities:
 * - Send mode change requests to LiveKit agent via data channel
 * - Listen for mode confirmation and chat messages from agent
 * - Manage response mode state with timeout handling
 * - Provide reactive state via Angular Signals
 * - Coordinate with ChatStorageService to store agent chat messages
 * - Coordinate with ConversationStorageService to sync mode changes (Feature 005)
 * - Coordinate with transcription events to store user messages in chat mode (T109)
 * - Persist mode preference to localStorage (T123-T124)
 */
@Injectable({
  providedIn: 'root',
})
export class ResponseModeService {
  // T124: LocalStorage key for mode preference persistence
  private static readonly STORAGE_KEY_MODE_PREFERENCE = 'melior-agent-response-mode';

  // Inject ChatStorageService for handling agent chat messages
  private readonly chatStorageService = inject(ChatStorageService);

  // Feature 005: Inject ConversationStorageService to sync mode changes
  private readonly conversationStorageService = inject(ConversationStorageService);

  // Private mutable state
  private _currentMode = signal<ResponseMode>(DEFAULT_RESPONSE_MODE);
  private _isConfirmed = signal<boolean>(true);
  private _errorMessage = signal<string | null>(null);
  private _isDataChannelAvailable = signal<boolean>(false);

  // Room and event handling
  private _room: Room | null = null;
  private _dataReceivedHandler: ((
    payload: Uint8Array,
    participant?: RemoteParticipant,
    kind?: DataPacket_Kind,
    topic?: string
  ) => void) | null = null;

  // T109: Transcription event handler for user messages in chat mode
  private _transcriptionReceivedHandler: ((
    segments: TranscriptionSegment[],
    participant?: Participant,
    publication?: TrackPublication
  ) => void) | null = null;

  // Timeout handling for mode confirmations
  private _pendingModeTimeout: number | null = null;
  private _pendingModeResolve: ((value: void) => void) | null = null;
  private _pendingModeReject: ((reason?: any) => void) | null = null;

  // Public readonly signals
  readonly currentMode = this._currentMode.asReadonly();
  readonly isConfirmed = this._isConfirmed.asReadonly();
  readonly errorMessage = this._errorMessage.asReadonly();
  readonly isDataChannelAvailable = this._isDataChannelAvailable.asReadonly();

  // Computed signals
  readonly isPending = computed(() => !this._isConfirmed());

  constructor() {
    // T126: Load preferred mode from localStorage on initialization
    const preferredMode = this.loadPreferredMode();
    this._currentMode.set(preferredMode);

    // T123: Save mode preference to localStorage when changed (using effect)
    effect(() => {
      const mode = this._currentMode();
      if (this._isConfirmed()) {
        // Only save confirmed mode changes
        localStorage.setItem(ResponseModeService.STORAGE_KEY_MODE_PREFERENCE, mode);
      }
    });

    // T040 [US2]: Sync mode changes with ConversationStorageService (Feature 005)
    effect(() => {
      const mode = this._currentMode();
      if (this._isConfirmed()) {
        // Sync confirmed mode changes to conversation storage
        this.conversationStorageService.setMode(mode);
      }
    });
  }

  /**
   * Initialize the service with a LiveKit Room instance
   * Sets up data channel listeners and transcription listeners
   * Auto-requests preferred mode after initialization (T128)
   *
   * @param room - LiveKit Room instance
   */
  initialize(room: Room): void {
    console.log('🎯 ResponseModeService.initialize() called');
    this._room = room;
    this._isDataChannelAvailable.set(true);

    // Set up data channel event listener
    this._dataReceivedHandler = this.handleDataReceived.bind(this);
    room.on(RoomEvent.DataReceived, this._dataReceivedHandler);
    console.log('✅ DataReceived event listener attached');

    // T109: Set up transcription event listener for user messages in chat mode
    const handler = this.handleTranscriptionReceived.bind(this);
    this._transcriptionReceivedHandler = handler;
    room.on(RoomEvent.TranscriptionReceived, handler);
    console.log('✅ TranscriptionReceived event listener attached');

    console.log('✅ ResponseModeService initialized with Room');
    console.log('📊 Room info:', {
      name: room.name,
      state: room.state,
      localParticipant: room.localParticipant?.identity,
    });

    // T128: Auto-request preferred mode after brief delay to allow connection to stabilize
    setTimeout(() => {
      const preferredMode = this.loadPreferredMode();
      console.log(`🔍 Loaded preferred mode: ${preferredMode}`);
      if (preferredMode !== DEFAULT_RESPONSE_MODE) {
        console.log(`🔄 Requesting preferred mode: ${preferredMode}`);
        // Only request if different from default
        this.setMode(preferredMode).catch((error) => {
          console.warn('Failed to restore preferred mode:', error);
        });
      }
    }, 500);
  }

  /**
   * Cleanup when disconnecting
   * Removes event listeners and resets state
   * Clears chat message history (T127)
   * Resets mode to voice (T129)
   */
  cleanup(): void {
    // Clear any pending timeout
    if (this._pendingModeTimeout !== null) {
      clearTimeout(this._pendingModeTimeout);
      this._pendingModeTimeout = null;
    }

    // Reject any pending promise
    if (this._pendingModeReject) {
      this._pendingModeReject(new Error('Service cleanup - connection closed'));
      this._pendingModeReject = null;
      this._pendingModeResolve = null;
    }

    // Remove event listeners
    if (this._room) {
      if (this._dataReceivedHandler) {
        this._room.off(RoomEvent.DataReceived, this._dataReceivedHandler);
        this._dataReceivedHandler = null;
      }
      if (this._transcriptionReceivedHandler) {
        this._room.off(RoomEvent.TranscriptionReceived, this._transcriptionReceivedHandler);
        this._transcriptionReceivedHandler = null;
      }
    }

    // T127: Clear chat message history
    this.chatStorageService.clearHistory();

    // T129: Reset state to voice mode (default) and confirmed
    this._room = null;
    this._currentMode.set('voice');
    this._isConfirmed.set(true);
    this._errorMessage.set(null);
    this._isDataChannelAvailable.set(false);

    console.log('ResponseModeService cleaned up');
  }

  /**
   * Request a mode change
   * Sends SetResponseModeMessage to agent and waits for confirmation
   *
   * @param mode - Desired response mode ('voice' or 'chat')
   * @returns Promise that resolves when mode is confirmed or rejects on timeout
   */
  async setMode(mode: ResponseMode): Promise<void> {
    if (!this._room || !this._isDataChannelAvailable()) {
      throw new Error('Data channel not available');
    }

    // Clear any existing timeout
    if (this._pendingModeTimeout !== null) {
      clearTimeout(this._pendingModeTimeout);
    }

    // Set pending state
    this._isConfirmed.set(false);
    this._errorMessage.set(null);

    // Create and encode message
    const message = createSetResponseModeMessage(mode);
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(message));

    try {
      // Publish via data channel with RELIABLE delivery
      await this._room.localParticipant.publishData(data, {
        reliable: true,
        destinationIdentities: [], // Broadcast to all
      });

      console.log(`Sent SetResponseModeMessage: ${mode}`);

      // Wait for confirmation with timeout
      return new Promise<void>((resolve, reject) => {
        this._pendingModeResolve = resolve;
        this._pendingModeReject = reject;

        // Set 5-second timeout
        this._pendingModeTimeout = window.setTimeout(() => {
          this._pendingModeTimeout = null;
          this._pendingModeResolve = null;
          this._pendingModeReject = null;

          // Revert to confirmed state with previous mode
          this._isConfirmed.set(true);

          // Set error message
          const errorMsg = `Mode change timeout - agent did not confirm ${mode} mode within 5 seconds`;
          this._errorMessage.set(errorMsg);

          // Auto-clear error after 5 seconds
          setTimeout(() => {
            if (this._errorMessage() === errorMsg) {
              this._errorMessage.set(null);
            }
          }, 5000);

          reject(new Error(errorMsg));
        }, 5000);
      });
    } catch (error) {
      // Reset pending state on error
      this._isConfirmed.set(true);
      const errorMsg = `Failed to send mode change request: ${error}`;
      this._errorMessage.set(errorMsg);

      // Auto-clear error after 5 seconds
      setTimeout(() => {
        if (this._errorMessage() === errorMsg) {
          this._errorMessage.set(null);
        }
      }, 5000);

      throw error;
    }
  }

  /**
   * Toggle between voice and chat modes
   * Convenience method that calls setMode with opposite of current mode
   */
  async toggleMode(): Promise<void> {
    const newMode: ResponseMode = this._currentMode() === 'voice' ? 'chat' : 'voice';
    return this.setMode(newMode);
  }

  /**
   * Handle incoming data channel messages
   *
   * @private
   */
  private handleDataReceived(
    payload: Uint8Array,
    participant?: RemoteParticipant,
    kind?: DataPacket_Kind,
    topic?: string
  ): void {
    const timestamp = new Date().toISOString();
    console.log(`📥 [${timestamp}] handleDataReceived called`);
    console.log(`📊 Payload info:`, {
      byteLength: payload.byteLength,
      participant: participant?.identity || 'unknown',
      kind: kind || 'unknown',
      topic: topic || 'none',
    });

    try {
      // Decode message
      const decoder = new TextDecoder('utf-8');
      const text = decoder.decode(payload);
      console.log(`� [${timestamp}] Raw decoded text:`, text);
      console.log(`📏 Text length: ${text.length}`);

      const data = JSON.parse(text);
      console.log(`✅ [${timestamp}] Successfully parsed JSON:`, data);

      // Validate message structure
      if (!isIncomingMessage(data)) {
        console.warn(`⚠️ [${timestamp}] Unknown message type:`, data);
        console.warn('Message type:', data?.type);
        console.warn('Full data:', JSON.stringify(data, null, 2));
        return;
      }
      console.log(`✓ [${timestamp}] Message validated as incoming message`);

      // Handle ResponseModeUpdatedMessage
      if (isResponseModeUpdatedMessage(data)) {
        console.log(`🔄 [${timestamp}] Processing ResponseModeUpdatedMessage`);
        this.handleResponseModeUpdated(data.mode);
      }

      // Handle AgentChatMessage (complete message)
      if (isAgentChatMessage(data)) {
        console.log(`💬 [${timestamp}] Processing AgentChatMessage`);
        this.handleAgentChatMessage(data.message, data.timestamp);
      }

      // Handle AgentChatChunk (streaming chunk)
      if (isAgentChatChunk(data)) {
        console.log(`📝 [${timestamp}] Processing AgentChatChunk`);
        this.handleAgentChatChunk(data.messageId, data.chunk, data.isComplete, data.timestamp);
      }
    } catch (error) {
      console.error(`❌ [${timestamp}] Failed to parse data channel message:`, error);
      console.error('Error details:', error instanceof Error ? error.message : String(error));
      console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
      // Graceful degradation - don't crash on malformed messages
    }
  }

  /**
   * Handle ResponseModeUpdatedMessage from agent
   *
   * @private
   */
  private handleResponseModeUpdated(mode: ResponseMode): void {
    console.log(`Received ResponseModeUpdatedMessage: ${mode}`);

    // Clear timeout
    if (this._pendingModeTimeout !== null) {
      clearTimeout(this._pendingModeTimeout);
      this._pendingModeTimeout = null;
    }

    // Update mode and set confirmed
    this._currentMode.set(mode);
    this._isConfirmed.set(true);
    this._errorMessage.set(null);

    // Resolve pending promise
    if (this._pendingModeResolve) {
      this._pendingModeResolve();
      this._pendingModeResolve = null;
      this._pendingModeReject = null;
    }
  }

  /**
   * Handle AgentChatMessage from agent
   * Stores the message in ChatStorageService for display
   *
   * @private
   */
  private handleAgentChatMessage(message: string, timestamp: number): void {
    const now = new Date().toISOString();
    console.log(`💬 [${now}] handleAgentChatMessage called`);
    console.log(`📝 Message: "${message}"`);
    console.log(`⏰ Timestamp: ${timestamp} (${new Date(timestamp).toISOString()})`);
    console.log(`📊 Message stats:`, {
      length: message.length,
      isEmpty: message.length === 0,
      trimmedLength: message.trim().length,
    });

    const beforeCount = this.chatStorageService.getHistory().length;
    console.log(`📊 Messages before add: ${beforeCount}`);

    // Add agent message to chat history (T108)
    this.chatStorageService.addMessage(message, 'agent');

    const afterCount = this.chatStorageService.getHistory().length;
    console.log(`📊 Messages after add: ${afterCount}`);
    console.log(`✅ Message ${afterCount > beforeCount ? 'SUCCESSFULLY' : 'NOT'} added`);
    console.log(`� All messages:`, this.chatStorageService.getHistory());
  }

  /**
   * Handle AgentChatChunk from agent
   * Builds agent message incrementally as chunks stream in
   *
   * @private
   */
  private handleAgentChatChunk(messageId: string, chunk: string, isComplete: boolean, timestamp: number): void {
    const now = new Date().toISOString();
    console.log(`🔄 [${now}] handleAgentChatChunk called`);
    console.log(`🆔 Message ID: ${messageId}`);
    console.log(`📝 Chunk: "${chunk}"`);
    console.log(`✅ Is Complete: ${isComplete}`);
    console.log(`⏰ Timestamp: ${timestamp}`);

    // Check if message already exists by looking for it in history
    const existingMessage = this.chatStorageService
      .getHistory()
      .find((msg) => msg.id === messageId);

    if (!existingMessage) {
      // Start a new streaming message
      console.log(`🆕 Starting new streaming message: ${messageId}`);
      this.chatStorageService.startStreamingMessage(messageId, 'agent');
    }

    // Append the chunk to the streaming message
    this.chatStorageService.appendChunk(messageId, chunk);
    console.log(`➕ Appended chunk to message ${messageId}`);

    // Mark message as complete if this is the final chunk
    if (isComplete) {
      this.chatStorageService.completeStreamingMessage(messageId);
      console.log(`✅ Completed streaming message ${messageId}`);
    }
  }

  /**
   * Handle transcription events for user messages in chat mode (T109)
   * When in chat mode, store final user transcriptions as chat messages
   *
   * @private
   */
  private handleTranscriptionReceived(
    segments: TranscriptionSegment[],
    participant?: Participant,
    publication?: TrackPublication
  ): void {
    // Only process if in chat mode
    if (this._currentMode() !== 'chat') {
      return;
    }

    // Process each transcription segment
    segments.forEach((segment) => {
      // Only store final transcriptions from the local participant (user)
      if (segment.final && participant?.isLocal) {
        this.chatStorageService.addMessage(segment.text, 'user');
        console.log(`Added user message to chat: ${segment.text}`);
      }
    });
  }

  /**
   * T125: Load preferred mode from localStorage
   * Returns stored mode if valid, otherwise returns default
   *
   * @private
   * @returns Preferred ResponseMode from localStorage or default
   */
  private loadPreferredMode(): ResponseMode {
    try {
      const stored = localStorage.getItem(ResponseModeService.STORAGE_KEY_MODE_PREFERENCE);
      if (stored && isValidResponseMode(stored)) {
        return stored;
      }
    } catch (error) {
      console.warn('Failed to load mode preference from localStorage:', error);
    }
    return DEFAULT_RESPONSE_MODE;
  }
}
