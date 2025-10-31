import { Injectable, Signal, signal, computed, inject } from '@angular/core';
import { Room, RoomEvent, ConnectionQuality as LKConnectionQuality } from 'livekit-client';
import {
  ConnectionState,
  ConnectionQuality,
  ConnectionError,
  ConnectionErrorCode,
} from '../models/connection-state.model';
import { VoiceSession, SessionMetadata } from '../models/session.model';
import { LiveKitConfig, DEFAULT_ROOM_OPTIONS } from '../models/livekit-config.model';
import { TokenService } from './token.service';
import { TokenApiError } from '../models/token.model';
import { environment } from '../../environments/environment';

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

  /**
   * Get the current LiveKit Room instance
   * @returns Room instance if connected, null otherwise
   */
  getRoom(): Room | null;

  /**
   * Send text message to agent via data channel
   * @param content Text message content
   * @returns Promise that resolves when message is sent
   */
  sendTextMessage(content: string): Promise<void>;
}

/**
 * LiveKit Connection Service
 * Manages WebRTC connection to LiveKit voice agent
 */
@Injectable({
  providedIn: 'root',
})
export class LiveKitConnectionService implements ILiveKitConnectionService {
  // Injected services
  private readonly tokenService = inject(TokenService);

  // Private state
  private _connectionState = signal<ConnectionState>({ status: 'disconnected' });
  private _currentSession = signal<VoiceSession | null>(null);
  private _room: Room | null = null;
  private _lastConfig: LiveKitConfig | null = null;
  private _agentConnected = signal<boolean>(false);

  // Reconnection state
  private _reconnectAttempt = 0;
  private _maxReconnectAttempts = 5;
  private _reconnectTimer: number | null = null;

  // Public signals
  readonly connectionState = this._connectionState.asReadonly();
  readonly currentSession = this._currentSession.asReadonly();
  readonly agentConnected = this._agentConnected.asReadonly();
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
   * T026-T033: Implement connection logic with token acquisition
   * T122: Add performance marks for connection time monitoring
   */
  async connect(config: LiveKitConfig): Promise<void> {
    try {
      // T122: Mark start of connection process
      performance.mark('livekit-connection-start');

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

      // T042-T043: Obtain LiveKit access token from backend API
      let tokenResponse;
      try {
        tokenResponse = await this.tokenService.generateToken({
          roomName: config.roomName,
          participantIdentity: config.participantIdentity || `user-${Date.now()}`,
          expirationMinutes: 60 // 1 hour default
        }).toPromise();

        if (!tokenResponse) {
          throw this.createConnectionError('AUTHENTICATION_FAILED');
        }
      } catch (error) {
        // T030: Handle token acquisition failure
        if (error && typeof error === 'object' && 'statusCode' in error) {
          const tokenError = error as TokenApiError;
          if (tokenError.statusCode === 400) {
            const authError = this.createConnectionError('AUTHENTICATION_FAILED');
            this._connectionState.set({
              status: 'error',
              error: authError,
            });
            throw authError;
          } else if (tokenError.statusCode === 0) {
            const networkError = this.createConnectionError('NETWORK_ERROR');
            this._connectionState.set({
              status: 'error',
              error: networkError,
            });
            throw networkError;
          }
        }
        const serverError = this.createConnectionError('SERVER_UNAVAILABLE');
        this._connectionState.set({
          status: 'error',
          error: serverError,
        });
        throw serverError;
      }

      // Store config for potential reconnection
      this._lastConfig = config;

      // Create LiveKit room with audio options
      const room = new Room({
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // T031: Add connection quality changed handler
      room.on(RoomEvent.ConnectionQualityChanged, (quality: LKConnectionQuality) => {
        this.updateConnectionQuality(quality);
      });

      // T113-T114: Add reconnection event handlers
      room.on(RoomEvent.Reconnecting, () => {
        console.log('🔄 LiveKit triggered reconnection');
        this._reconnectAttempt++;
        this._connectionState.set({
          status: 'reconnecting',
          attempt: this._reconnectAttempt,
          maxAttempts: this._maxReconnectAttempts,
        });
      });

      room.on(RoomEvent.Reconnected, () => {
        console.log('✅ Successfully reconnected to LiveKit');
        this._reconnectAttempt = 0; // Reset attempt counter

        // Restore connected state
        const session = this._currentSession();
        if (session && this._lastConfig) {
          this._connectionState.set({
            status: 'connected',
            roomName: this._lastConfig.roomName,
            sessionId: session.sessionId,
            connectedAt: session.startTime,
            connectionQuality: session.connectionQuality,
          });
        }
      });

      // Monitor participant connections (e.g., when agent joins)
      room.on(RoomEvent.ParticipantConnected, (participant) => {
        console.log('Participant connected:', participant.identity, participant.metadata);
        console.log('Participant attributes:', participant.attributes);
        console.log('Participant permissions:', participant.permissions);

        // Update agent connected status
        this._agentConnected.set(this.getRemoteParticipantCount() > 0);

        // Listen for metadata changes (may contain transcription info)
        participant.on('ParticipantMetadataChanged' as any, (metadata: string) => {
          console.log(`🔄 Metadata changed for ${participant.identity}:`, metadata);
          try {
            const data = JSON.parse(metadata);
            console.log('📋 Parsed metadata:', data);
          } catch (e) {
            console.log('📋 Metadata (not JSON):', metadata);
          }
        });

        // Listen for attributes changes
        participant.on('AttributesChanged' as any, (attributes: any) => {
          console.log(`🔄 Attributes changed for ${participant.identity}:`, attributes);
        });
      });      room.on(RoomEvent.ParticipantDisconnected, (participant) => {
        console.log('Participant disconnected:', participant.identity);

        // Update agent connected status
        this._agentConnected.set(this.getRemoteParticipantCount() > 0);
      });

      // Monitor track subscriptions
      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log(`Track subscribed from ${participant.identity}:`, track.kind, publication.source);

        // Attach audio tracks to play them (required for transcription to work)
        if (track.kind === 'audio') {
          const audioElement = track.attach();
          audioElement.style.display = 'none'; // Hide the audio element
          document.body.appendChild(audioElement);
          console.log('✅ Audio track attached and playing from:', participant.identity);
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        console.log(`Track unsubscribed from ${participant.identity}:`, track.kind);
        // Detach the track to clean up
        track.detach();
      });

      // Handle audio playback status (browser autoplay policies)
      room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
        if (!room.canPlaybackAudio) {
          console.warn('⚠️ Audio playback blocked by browser. User interaction required.');
          console.log('Call room.startAudio() after user interaction to enable audio playback');
        } else {
          console.log('✅ Audio playback is enabled');
        }
      });

      // Monitor ALL room events for debugging
      room.on(RoomEvent.DataReceived, (payload, participant, kind, topic) => {
        console.log('🔔 DataReceived event:', { participant: participant?.identity, kind, topic, payloadSize: payload.length });
      });

      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        console.log('🎤 Active speakers:', speakers.map(s => s.identity));
      });

      room.on(RoomEvent.TrackMuted, (publication, participant) => {
        console.log('🔇 Track muted:', participant.identity, publication.source);
      });

      room.on(RoomEvent.TrackUnmuted, (publication, participant) => {
        console.log('🔊 Track unmuted:', participant.identity, publication.source);
      });

      // CRITICAL: Listen for TranscriptionReceived event
      room.on(RoomEvent.TranscriptionReceived, (segments, participant, publication) => {
        console.log('📝 TRANSCRIPTION RECEIVED EVENT:', {
          participant: participant?.identity,
          publication: publication?.source,
          segmentCount: segments.length,
          segments: segments.map(s => ({
            id: s.id,
            text: s.text,
            final: s.final,
            language: s.language
          }))
        });
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

      // T028: Connect to LiveKit room using token from backend
      performance.mark('livekit-room-connect-start');
      await room.connect(environment.liveKitUrl, tokenResponse.token);
      performance.mark('livekit-room-connect-end');
      performance.measure('livekit-room-connection', 'livekit-room-connect-start', 'livekit-room-connect-end');

      this._room = room;

      console.log('Connected to LiveKit room:', room.name);
      console.log('Local participant:', room.localParticipant.identity);
      console.log('Remote participants:', Array.from(room.remoteParticipants.values()).map(p => p.identity));

      // Enable and publish microphone after successful connection
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
        console.log('✅ Microphone enabled and published');

        // Verify the track is actually publishing
        const micPublication = room.localParticipant.getTrackPublication('microphone' as any);
        if (micPublication) {
          console.log('📢 Microphone track publication:', {
            source: micPublication.source,
            muted: micPublication.isMuted,
            enabled: micPublication.isEnabled
          });
        }

        // Log all published tracks
        console.log('📤 All published tracks:',
          Array.from(room.localParticipant.trackPublications.values()).map(p => ({
            source: p.source,
            kind: p.kind,
            muted: p.isMuted
          }))
        );
      } catch (error) {
        console.error('❌ Failed to enable microphone:', error);
        // Don't fail the connection, but log the error
        // User may need to grant permissions or check their microphone
      }

      // Start audio playback (required for hearing agent responses)
      try {
        await room.startAudio();
        console.log('✅ Audio playback started');
      } catch (error) {
        console.warn('⚠️ Could not start audio automatically:', error);
        console.log('Audio playback may be blocked by browser autoplay policy');
      }

      // T021: Transition to connected state
      const sessionId = crypto.randomUUID();
      this._connectionState.set({
        status: 'connected',
        roomName: config.roomName,
        sessionId,
        connectedAt: new Date(),
        connectionQuality: 'good', // Will be updated by quality change events
      });

      // Check if any agents are already connected
      this._agentConnected.set(this.getRemoteParticipantCount() > 0);

      // T030: Create session
      this._currentSession.set({
        sessionId,
        startTime: new Date(),
        transcriptions: [],
        connectionQuality: 'good',
        metadata: this.createSessionMetadata(config.roomName, room.localParticipant.identity),
      });

      // T122: Measure total connection time
      performance.mark('livekit-connection-end');
      performance.measure('livekit-total-connection', 'livekit-connection-start', 'livekit-connection-end');

      // Log performance metrics
      const connectionMeasure = performance.getEntriesByName('livekit-total-connection')[0];
      if (connectionMeasure) {
        console.log(`⏱️ Connection established in ${connectionMeasure.duration.toFixed(2)}ms`);
      }
    } catch (error) {
      // T022: Handle connection failure
      let connectionError: ConnectionError;

      // Check if this is already a ConnectionError that was handled earlier
      if (error && typeof error === 'object' && 'code' in error && 'timestamp' in error && 'recoverable' in error) {
        // This is already a ConnectionError - don't re-wrap it
        connectionError = error as ConnectionError;
      } else if (error instanceof Error && 'code' in error && typeof (error as any).code === 'string') {
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
    // Clear any pending reconnection timer
    if (this._reconnectTimer !== null) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }

    // Reset reconnection attempt counter
    this._reconnectAttempt = 0;

    // T052: Clean up Room instance
    if (this._room) {
      try {
        // Disable microphone before disconnecting
        await this._room.localParticipant.setMicrophoneEnabled(false);

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

    // Reset agent connected status
    this._agentConnected.set(false);

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

  /**
   * T112-T116: Implement reconnection with exponential backoff
   * Attempts to reconnect to LiveKit room with retry logic
   */
  async reconnect(): Promise<void> {
    // Can only reconnect if we have a previous configuration
    if (!this._lastConfig) {
      throw new Error('No previous connection configuration available');
    }

    // Clear any existing reconnection timer
    if (this._reconnectTimer !== null) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }

    // Reset attempt counter when manually reconnecting
    this._reconnectAttempt = 0;

    // T112: Implement reconnection logic with retry
    await this.attemptReconnection(this._lastConfig);
  }

  /**
   * T115: Helper method to attempt reconnection with exponential backoff
   */
  private async attemptReconnection(config: LiveKitConfig): Promise<void> {
    // T116: Check if we've exceeded max attempts
    if (this._reconnectAttempt >= this._maxReconnectAttempts) {
      const error = this.createConnectionError(
        'NETWORK_ERROR',
        'Maximum reconnection attempts reached. Please try connecting again manually.'
      );
      this._connectionState.set({
        status: 'error',
        error,
      });
      return;
    }

    this._reconnectAttempt++;

    // Update state to show reconnection attempt
    this._connectionState.set({
      status: 'reconnecting',
      attempt: this._reconnectAttempt,
      maxAttempts: this._maxReconnectAttempts,
    });

    // T115: Calculate backoff delay (1s, 2s, 4s, 8s, 16s max)
    const baseDelay = 1000; // 1 second
    const maxDelay = 16000; // 16 seconds
    const delay = Math.min(baseDelay * Math.pow(2, this._reconnectAttempt - 1), maxDelay);

    console.log(`🔄 Reconnection attempt ${this._reconnectAttempt}/${this._maxReconnectAttempts} in ${delay}ms`);

    // Wait for backoff delay
    await new Promise(resolve => {
      this._reconnectTimer = window.setTimeout(resolve, delay);
    });

    try {
      // Attempt to reconnect using the stored config
      await this.connect(config);

      // If successful, reset attempt counter
      this._reconnectAttempt = 0;
      console.log('✅ Reconnection successful');
    } catch (error) {
      console.error(`❌ Reconnection attempt ${this._reconnectAttempt} failed:`, error);

      // If we haven't hit max attempts, try again
      if (this._reconnectAttempt < this._maxReconnectAttempts) {
        // Store the last error in the reconnecting state
        const connectionError = error as ConnectionError;
        this._connectionState.set({
          status: 'reconnecting',
          attempt: this._reconnectAttempt,
          maxAttempts: this._maxReconnectAttempts,
          lastError: connectionError,
        });

        // Recursively attempt reconnection
        await this.attemptReconnection(config);
      } else {
        // Max attempts reached, set to error state
        const finalError = this.createConnectionError(
          'NETWORK_ERROR',
          'Maximum reconnection attempts reached. Please try connecting again manually.'
        );
        this._connectionState.set({
          status: 'error',
          error: finalError,
        });
      }
    }
  }

  /**
   * Get the current LiveKit Room instance
   * Used by TranscriptionService to subscribe to events
   * @returns Room instance if connected, null otherwise
   */
  getRoom(): Room | null {
    return this._room;
  }

  /**
   * Send text message to agent via data channel
   * Feature: 007-text-chat-input
   * @param content Text message content
   * @returns Promise that resolves when message is sent
   */
  async sendTextMessage(content: string): Promise<void> {
    if (!this._room) {
      throw new Error('Cannot send text message: Not connected to room');
    }

    const state = this._connectionState();
    if (state.status !== 'connected') {
      throw new Error(`Cannot send text message: Connection state is ${state.status}`);
    }

    // Import protocol models dynamically
    const { createTextMessageProtocol, serializeTextMessage } = await import(
      '../models/text-input-protocol.model'
    );

    // Create protocol message
    const protocolMessage = createTextMessageProtocol(content);

    // Serialize and send via data channel
    const data = serializeTextMessage(protocolMessage);

    await this._room.localParticipant.publishData(data, {
      reliable: true,
      destinationIdentities: [], // Broadcast to all participants
    });

    console.log('📤 Text message sent:', {
      messageId: protocolMessage.messageId,
      contentLength: content.length,
      timestamp: protocolMessage.timestamp,
    });
  }

  /**
   * Get information about all participants in the room
   * @returns Array of participant identities
   */
  getParticipants(): string[] {
    if (!this._room) {
      return [];
    }

    const participants: string[] = [this._room.localParticipant.identity];
    this._room.remoteParticipants.forEach(p => participants.push(p.identity));
    return participants;
  }

  /**
   * Get count of remote participants (e.g., agents)
   * @returns Number of remote participants
   */
  getRemoteParticipantCount(): number {
    return this._room?.remoteParticipants.size ?? 0;
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

