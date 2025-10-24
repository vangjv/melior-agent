import { Component, input, output, computed } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ConnectionState, deriveButtonState } from '../../models/connection-state.model';

/**
 * T034-T038: Connection Button Component
 * Presentational component for connect/disconnect button
 */
@Component({
  selector: 'app-connection-button',
  standalone: true,
  imports: [MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './connection-button.component.html',
  styleUrl: './connection-button.component.scss',
})
export class ConnectionButtonComponent {
  // T035: Input signal for connection state
  connectionState = input.required<ConnectionState>();

  // T036: Output signals
  onConnect = output<void>();
  onDisconnect = output<void>();

  // Computed button state derived from connection state
  buttonState = computed(() => deriveButtonState(this.connectionState()));

  // Handle button click
  handleClick(): void {
    const state = this.connectionState();
    if (state.status === 'disconnected' || state.status === 'error') {
      this.onConnect.emit();
    } else if (state.status === 'connected') {
      this.onDisconnect.emit();
    }
  }
}
