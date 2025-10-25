import { Component, computed, inject } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ConnectionButtonComponent } from '../connection-button/connection-button.component';
import { TranscriptionDisplayComponent } from '../transcription-display/transcription-display.component';
import { LiveKitConnectionService } from '../../services/livekit-connection.service';
import { TranscriptionService } from '../../services/transcription.service';
import { environment } from '../../../environments/environment';

/**
 * T039-T046, T088-T092: Voice Chat Component
 * Smart component that manages voice chat connection, transcription, and state
 */
@Component({
  selector: 'app-voice-chat',
  standalone: true,
  imports: [ConnectionButtonComponent, TranscriptionDisplayComponent, MatProgressSpinnerModule],
  templateUrl: './voice-chat.component.html',
  styleUrl: './voice-chat.component.scss',
})
export class VoiceChatComponent {
  // T040: Inject LiveKitConnectionService
  private readonly connectionService = inject(LiveKitConnectionService);

  // T088: Inject TranscriptionService
  private readonly transcriptionService = inject(TranscriptionService);

  // T042: Connection state computed signal from service
  readonly connectionState = this.connectionService.connectionState;
  readonly connectionQuality = this.connectionService.connectionQuality;

  // T092: Transcriptions signal from transcription service
  readonly transcriptions = this.transcriptionService.transcriptions;

  // Interim transcription signal for streaming display
  readonly interimTranscription = this.transcriptionService.interimTranscription;

  // Computed properties for UI
  readonly isConnected = computed(() => this.connectionState().status === 'connected');

  // T082: User-friendly error messages including token acquisition failures
  readonly errorMessage = computed(() => {
    const state = this.connectionState();
    if (state.status === 'error') {
      const errorCode = state.error.code;

      // Map error codes to user-friendly messages
      switch (errorCode) {
        case 'AUTHENTICATION_FAILED':
          return 'Failed to obtain access token. Please try again.';
        case 'NETWORK_ERROR':
          return 'Network error. Please check your connection and try again.';
        case 'SERVER_UNAVAILABLE':
          return 'Service temporarily unavailable. Please try again later.';
        case 'PERMISSION_DENIED':
          return 'Microphone permission denied. Please grant access and try again.';
        case 'MICROPHONE_NOT_FOUND':
          return 'No microphone detected. Please connect a microphone and try again.';
        case 'ROOM_NOT_FOUND':
          return 'Voice room not found. Please try again.';
        case 'TIMEOUT':
          return 'Connection timeout. Please try again.';
        default:
          return state.error.message || 'An unexpected error occurred. Please try again.';
      }
    }
    return null;
  });

  // T041 & T089: Handle connect button click and start transcription
  async handleConnect(): Promise<void> {
    try {
      // T082: Connection config without token - service obtains it from backend
      const config = {
        serverUrl: environment.liveKitUrl,
        roomName: crypto.randomUUID(),
        participantIdentity: `user-${Date.now()}`,
      };

      await this.connectionService.connect(config);

      // T089: Start transcription on successful connection
      const room = this.connectionService.getRoom();
      if (room) {
        this.transcriptionService.startTranscription(room);
      } else {
        console.warn('Connection succeeded but Room instance not available');
      }
    } catch (error) {
      console.error('Connection failed:', error);
      // T082: Error state and messages are handled by the service and displayed in UI
    }
  }

  // T057 & T090: Handle disconnect button click and stop transcription
  async handleDisconnect(): Promise<void> {
    try {
      // T090: Stop transcription before disconnecting
      this.transcriptionService.stopTranscription();

      await this.connectionService.disconnect();
    } catch (error) {
      console.error('Disconnect failed:', error);
    }
  }
}
