import { Injectable, Signal, signal, computed } from '@angular/core';
import { Room, RoomEvent, ConnectionQuality as LKConnectionQuality } from 'livekit-client';
import {
  ConnectionState,
  ConnectionQuality,
  ConnectionError,
  ConnectionErrorCode,
} from '../models/connection-state.model';
import { VoiceSession, SessionMetadata } from '../models/session.model';
import { LiveKitConfig, DEFAULT_ROOM_OPTIONS } from '../models/livekit-config.model';

/**
 * Service interface for LiveKit connection management
 */
export interface ILiveKitConnectionService {
  /**
   * Current connection state (Signal)
   */
  readonly connectionState: Signal<ConnectionState>;

  /**
   * Current session information (Signal)
   */
  readonly currentSession: Signal<VoiceSession | null>;

  /**
   * Connection quality metrics (Signal)
   */
  readonly connectionQuality: Signal<ConnectionQuality>;

  /**
   * Initiate connection to LiveKit room
   * @param config LiveKit connection configuration
   * @returns Promise that resolves when connected or rejects on error
   */
  connect(config: LiveKitConfig): Promise<void>;

  /**
   * Disconnect from current LiveKit session
   * @returns Promise that resolves when disconnected
   */
  disconnect(): Promise<void>;

  /**
   * Attempt manual reconnection after error
   * @returns Promise that resolves when reconnected
   */
  reconnect(): Promise<void>;

  /**
   * Get current microphone permission status
   * @returns Promise with permission state
   */
  checkMicrophonePermission(): Promise<PermissionState>;

  /**
   * Request microphone permission from user
   * @returns Promise with granted permission
   */
  requestMicrophonePermission(): Promise<boolean>;
}

/**
 * LiveKit Connection Service
 * Manages WebRTC connection to LiveKit voice agent
 */
@Injectable({
  providedIn: 'root',
})
export class LiveKitConnectionService implements ILiveKitConnectionService {
  // Private state
  private _connectionState = signal<ConnectionState>({ status: 'disconnected' });
  private _currentSession = signal<VoiceSession | null>(null);
  private _room: Room | null = null;
  private _lastConfig: LiveKitConfig | null = null;

  // Public signals
  readonly connectionState = this._connectionState.asReadonly();
  readonly currentSession = this._currentSession.asReadonly();
  readonly connectionQuality = computed<ConnectionQuality>(() => {
    const state = this._connectionState();
    if (state.status === 'connected') {
      return state.connectionQuality;
    }
    return 'unknown';
  });

  /**
   * T018: Check microphone permission status
   */
  async checkMicrophonePermission(): Promise<PermissionState> {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return result.state;
    } catch (error) {
      throw new Error('Permission API not supported');
    }
  }

  /**
   * T019: Request microphone permission from user
   */
  async requestMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately - we just needed permission
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (error) {
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError' || error.name === 'NotFoundError') {
          return false;
        }
      }
      return false;
    }
  }

  /**
   * T026-T033: Implement connection logic
   */
  async connect(config: LiveKitConfig): Promise<void> {
    try {
      // T020: Transition to connecting state
      this._connectionState.set({
        status: 'connecting',
        startedAt: new Date(),
      });

      // T027: Request microphone permission
      const hasPermission = await this.requestMicrophonePermission();
      if (!hasPermission) {
        // T032: Handle PERMISSION_DENIED error
        throw this.createConnectionError('PERMISSION_DENIED');
      }

      // Store config for potential reconnection
      this._lastConfig = config;

      // Create LiveKit room
      const room = new Room();

      // T031: Add connection quality changed handler
      room.on(RoomEvent.ConnectionQualityChanged, (quality: LKConnectionQuality) => {
        this.updateConnectionQuality(quality);
      });

      // T033: Add error handlers for network and server errors
      // T054: Handle both expected and unexpected disconnections
      room.on(RoomEvent.Disconnected, () => {
        const currentState = this._connectionState();

        // T055: Only treat as error if we're in connected/reconnecting state
        // (not if we initiated the disconnect)
        if (currentState.status === 'connected' || currentState.status === 'reconnecting') {
          // Unexpected disconnection
          this._connectionState.set({
            status: 'error',
            error: this.createConnectionError('NETWORK_ERROR'),
          });
        }
      });

      // T028: Connect to LiveKit room
      await room.connect(config.serverUrl, config.token);

      this._room = room;

      // T021: Transition to connected state
      const sessionId = crypto.randomUUID();
      this._connectionState.set({
        status: 'connected',
        roomName: config.roomName,
        sessionId,
        connectedAt: new Date(),
        connectionQuality: 'good', // Will be updated by quality change events
      });

      // T030: Create session
      this._currentSession.set({
        sessionId,
        startTime: new Date(),
        transcriptions: [],
        connectionQuality: 'good',
        metadata: this.createSessionMetadata(config.roomName, room.localParticipant.identity),
      });
    } catch (error) {
      // T022: Handle connection failure
      let connectionError: ConnectionError;

      if (error instanceof Error && 'code' in error && typeof (error as any).code === 'string') {
        // If error has code property that matches our ConnectionErrorCode
        const errorCode = (error as any).code as string;
        const validCodes: ConnectionErrorCode[] = [
          'PERMISSION_DENIED',
          'MICROPHONE_NOT_FOUND',
          'NETWORK_ERROR',
          'SERVER_UNAVAILABLE',
          'AUTHENTICATION_FAILED',
          'ROOM_NOT_FOUND',
          'TIMEOUT',
        ];

        if (validCodes.includes(errorCode as ConnectionErrorCode)) {
          connectionError = error as unknown as ConnectionError;
        } else {
          connectionError = this.createConnectionError('UNKNOWN', error.message);
        }
      } else if (error instanceof Error) {
        connectionError = this.createConnectionError('UNKNOWN', error.message);
      } else {
        connectionError = this.createConnectionError('UNKNOWN', 'Unknown error');
      }

      this._connectionState.set({
        status: 'error',
        error: connectionError,
      });
      throw connectionError;
    }
  }

  /**
   * T052-T055: Implement disconnect functionality
   * Cleanly disconnect from LiveKit room and clean up resources
   */
  async disconnect(): Promise<void> {
    // T052: Clean up Room instance
    if (this._room) {
      try {
        // Disconnect from LiveKit room
        await this._room.disconnect();
        this._room = null;
      } catch (error) {
        // Log error but still clean up state
        console.error('Error during room disconnect:', error);
      }
    }

    // T053: Transition to disconnected state
    this._connectionState.set({ status: 'disconnected' });

    // Clear session data
    const session = this._currentSession();
    if (session) {
      this._currentSession.set({
        ...session,
        endTime: new Date(),
      });
      // After recording end time, clear the session
      setTimeout(() => this._currentSession.set(null), 0);
    }
  }

  async reconnect(): Promise<void> {
    // Implementation will be added in Phase 7 (Reconnection)
    throw new Error('Not implemented yet');
  }

  // Helper methods

  private createConnectionError(
    code: ConnectionErrorCode,
    message?: string
  ): ConnectionError {
    const error: ConnectionError = {
      code,
      message: message || this.getErrorMessage(code),
      timestamp: new Date(),
      recoverable: code !== 'PERMISSION_DENIED',
    };
    return error;
  }

  private getErrorMessage(code: ConnectionErrorCode): string {
    const messages: Record<ConnectionErrorCode, string> = {
      PERMISSION_DENIED: 'Microphone access denied. Please grant permission in your browser settings.',
      MICROPHONE_NOT_FOUND: 'No microphone detected. Please connect a microphone and try again.',
      NETWORK_ERROR: 'Network connection lost. Please check your internet connection.',
      SERVER_UNAVAILABLE: 'Voice service is currently unavailable. Please try again later.',
      AUTHENTICATION_FAILED: 'Failed to authenticate. Please refresh and try again.',
      ROOM_NOT_FOUND: 'Voice chat room not found. Please contact support.',
      TIMEOUT: 'Connection timeout. Please try again.',
      UNKNOWN: 'An unexpected error occurred. Please try again.',
    };
    return messages[code];
  }

  private updateConnectionQuality(lkQuality: LKConnectionQuality): void {
    const state = this._connectionState();
    if (state.status === 'connected') {
      const quality = this.mapLiveKitQuality(lkQuality);
      this._connectionState.set({
        ...state,
        connectionQuality: quality,
      });

      // Update session quality
      const session = this._currentSession();
      if (session) {
        this._currentSession.set({
          ...session,
          connectionQuality: quality,
        });
      }
    }
  }

  private mapLiveKitQuality(lkQuality: LKConnectionQuality): ConnectionQuality {
    switch (lkQuality) {
      case LKConnectionQuality.Excellent:
        return 'excellent';
      case LKConnectionQuality.Good:
        return 'good';
      case LKConnectionQuality.Poor:
        return 'poor';
      default:
        return 'unknown';
    }
  }

  private createSessionMetadata(roomName: string, participantId: string): SessionMetadata {
    const platform = this.detectPlatform();
    return {
      roomName,
      participantId,
      userAgent: navigator.userAgent,
      platform,
    };
  }

  private detectPlatform(): 'ios' | 'android' | 'web' {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      return 'ios';
    } else if (/android/.test(ua)) {
      return 'android';
    }
    return 'web';
  }
}

