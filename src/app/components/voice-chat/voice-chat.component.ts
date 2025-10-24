import { Component, computed, inject } from '@angular/core';
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
  imports: [ConnectionButtonComponent, TranscriptionDisplayComponent],
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

  // Computed properties for UI
  readonly isConnected = computed(() => this.connectionState().status === 'connected');
  readonly errorMessage = computed(() => {
    const state = this.connectionState();
    return state.status === 'error' ? state.error.message : null;
  });

  // T041 & T089: Handle connect button click and start transcription
  async handleConnect(): Promise<void> {
    try {
      // TODO: In production, get token from backend API
      // For now, using placeholder - this will fail without valid LiveKit credentials
      const config = {
        serverUrl: environment.livekit.serverUrl,
        token: 'PLACEHOLDER_TOKEN', // Replace with actual token from backend
        roomName: 'voice-agent-room',
      };

      await this.connectionService.connect(config);

      // T089: Start transcription on successful connection
      // Note: In real implementation, we'd get the Room instance from the service
      // For now, this is a placeholder pattern
      // const room = this.connectionService.getRoom();
      // if (room) {
      //   this.transcriptionService.startTranscription(room);
      // }
    } catch (error) {
      console.error('Connection failed:', error);
      // Error state is handled by the service
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
