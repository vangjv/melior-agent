import { Injectable, Signal, signal, computed } from '@angular/core';
import { Room, RoomEvent, DataPacket_Kind, RemoteParticipant } from 'livekit-client';
import {
  ResponseMode,
  DEFAULT_RESPONSE_MODE,
  createSetResponseModeMessage,
  isResponseModeUpdatedMessage,
  isAgentChatMessage,
  isIncomingMessage,
  BaseDataChannelMessage,
} from '../models/response-mode.model';

/**
 * Service for managing voice/chat response mode state and data channel communication
 *
 * Responsibilities:
 * - Send mode change requests to LiveKit agent via data channel
 * - Listen for mode confirmation and chat messages from agent
 * - Manage response mode state with timeout handling
 * - Provide reactive state via Angular Signals
 */
@Injectable({
  providedIn: 'root',
})
export class ResponseModeService {
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

  constructor() {}

  /**
   * Initialize the service with a LiveKit Room instance
   * Sets up data channel listeners
   *
   * @param room - LiveKit Room instance
   */
  initialize(room: Room): void {
    this._room = room;
    this._isDataChannelAvailable.set(true);

    // Set up data channel event listener
    this._dataReceivedHandler = this.handleDataReceived.bind(this);
    room.on(RoomEvent.DataReceived, this._dataReceivedHandler);

    console.log('ResponseModeService initialized with Room');
  }

  /**
   * Cleanup when disconnecting
   * Removes event listeners and resets state
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

    // Remove event listener
    if (this._room && this._dataReceivedHandler) {
      this._room.off(RoomEvent.DataReceived, this._dataReceivedHandler);
      this._dataReceivedHandler = null;
    }

    // Reset state
    this._room = null;
    this._currentMode.set(DEFAULT_RESPONSE_MODE);
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
    try {
      // Decode message
      const decoder = new TextDecoder('utf-8');
      const text = decoder.decode(payload);
      const data = JSON.parse(text);

      // Validate message structure
      if (!isIncomingMessage(data)) {
        console.warn('Received unknown data channel message:', data);
        return;
      }

      // Handle ResponseModeUpdatedMessage
      if (isResponseModeUpdatedMessage(data)) {
        this.handleResponseModeUpdated(data.mode);
      }

      // Handle AgentChatMessage
      if (isAgentChatMessage(data)) {
        this.handleAgentChatMessage(data.message, data.timestamp);
      }
    } catch (error) {
      console.error('Failed to parse data channel message:', error);
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
   * (Will be integrated with ChatStorageService in User Story 3)
   *
   * @private
   */
  private handleAgentChatMessage(message: string, timestamp: number): void {
    console.log(`Received AgentChatMessage: ${message} at ${timestamp}`);
    // TODO: Integrate with ChatStorageService in User Story 3 (T108)
  }
}
