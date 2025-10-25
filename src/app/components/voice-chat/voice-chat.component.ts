import { Component, computed, inject, OnDestroy } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ConnectionButtonComponent } from '../connection-button/connection-button.component';
import { TranscriptionDisplayComponent } from '../transcription-display/transcription-display.component';
import { ModeToggleButtonComponent } from '../mode-toggle-button/mode-toggle-button.component';
import { ChatMessageDisplayComponent } from '../chat-message-display/chat-message-display.component';
import { LiveKitConnectionService } from '../../services/livekit-connection.service';
import { TranscriptionService } from '../../services/transcription.service';
import { ResponseModeService } from '../../services/response-mode.service';
import { ChatStorageService } from '../../services/chat-storage.service';
import { environment } from '../../../environments/environment';

/**
 * T039-T046, T088-T092: Voice Chat Component
 * Smart component that manages voice chat connection, transcription, and state
 * T051-T059: Integrated with ResponseModeService for mode toggle functionality
 * T107-T114: Integrated with ChatMessageDisplayComponent for chat mode
 */
@Component({
  selector: 'app-voice-chat',
  standalone: true,
  imports: [
    ConnectionButtonComponent,
    TranscriptionDisplayComponent,
    ModeToggleButtonComponent,
    ChatMessageDisplayComponent,
    MatProgressSpinnerModule,
  ],
  templateUrl: './voice-chat.component.html',
  styleUrl: './voice-chat.component.scss',
})
export class VoiceChatComponent implements OnDestroy {
  // T040: Inject LiveKitConnectionService
  private readonly connectionService = inject(LiveKitConnectionService);

  // T088: Inject TranscriptionService
  private readonly transcriptionService = inject(TranscriptionService);

  // T051: Inject ResponseModeService
  private readonly responseModeService = inject(ResponseModeService);

  // T107: Inject ChatStorageService
  private readonly chatStorageService = inject(ChatStorageService);

  // T042: Connection state computed signal from service
  readonly connectionState = this.connectionService.connectionState;
  readonly connectionQuality = this.connectionService.connectionQuality;

  // T092: Transcriptions signal from transcription service
  readonly transcriptions = this.transcriptionService.transcriptions;

  // Interim transcription signal for streaming display
  readonly interimTranscription = this.transcriptionService.interimTranscription;

  // T055: Response mode signals from ResponseModeService
  readonly currentMode = this.responseModeService.currentMode;
  readonly isPending = this.responseModeService.isPending;
  readonly modeErrorMessage = this.responseModeService.errorMessage;

  // T111: Chat messages signal from ChatStorageService
  readonly chatMessages = this.chatStorageService.chatMessages;

  // Computed properties for UI
  readonly isConnected = computed(() => this.connectionState().status === 'connected');

  // T112: Computed signal to show chat display only in chat mode
  readonly showChatDisplay = computed(() => this.currentMode() === 'chat');

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

        // T052: Initialize ResponseModeService after connection established
        this.responseModeService.initialize(room);
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

      // T053: Cleanup ResponseModeService when disconnecting
      this.responseModeService.cleanup();

      await this.connectionService.disconnect();
    } catch (error) {
      console.error('Disconnect failed:', error);
    }
  }

  // T056: Handle mode toggle button click
  async handleModeToggle(): Promise<void> {
    try {
      await this.responseModeService.toggleMode();
    } catch (error) {
      console.error('Mode toggle failed:', error);
      // Error is already handled by ResponseModeService and displayed via modeErrorMessage signal
    }
  }

  // T130: Cleanup on component destroy
  ngOnDestroy(): void {
    this.responseModeService.cleanup();
  }
}
