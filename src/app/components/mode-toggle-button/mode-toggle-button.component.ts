/**
 * Mode Toggle Button Component
 * T040-T050: Presentational component for toggling between voice and chat response modes
 */
import { Component, input, output, computed } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ResponseMode } from '../../models/response-mode.model';

/**
 * Presentational component for mode toggle button
 * Displays current response mode and allows user to toggle between voice and chat
 */
@Component({
  selector: 'app-mode-toggle-button',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './mode-toggle-button.component.html',
  styleUrl: './mode-toggle-button.component.scss',
})
export class ModeToggleButtonComponent {
  // T041: Component inputs
  /**
   * Current response mode (required)
   */
  currentMode = input.required<ResponseMode>();

  /**
   * Whether the mode change is pending confirmation
   */
  isPending = input<boolean>(false);

  /**
   * Whether the button should be disabled
   */
  isDisabled = input<boolean>(false);

  // T042: Component output
  /**
   * Event emitted when user clicks the toggle button
   */
  onToggle = output<void>();

  // T045: Computed signal for button label
  /**
   * Button label derived from current mode
   */
  buttonLabel = computed(() => {
    return this.currentMode() === 'voice' ? 'Voice Mode' : 'Chat Mode';
  });

  // T046: Computed signal for button icon
  /**
   * Material icon name for current mode
   */
  buttonIcon = computed(() => {
    return this.currentMode() === 'voice' ? 'mic' : 'chat_bubble';
  });

  // T066: Computed signal for pending label (from User Story 2)
  /**
   * Label to display when mode change is pending
   */
  pendingLabel = computed(() => {
    return this.isPending() ? 'Switching...' : this.buttonLabel();
  });

  /**
   * ARIA label for accessibility
   */
  ariaLabel = computed(() => {
    return `Toggle response mode - currently ${this.buttonLabel()}`;
  });

  /**
   * Whether the button should be disabled (combines isPending and isDisabled)
   */
  isButtonDisabled = computed(() => {
    return this.isPending() || this.isDisabled();
  });

  // T047: Button click handler
  /**
   * Handle button click - emit onToggle event
   */
  handleClick(): void {
    if (!this.isButtonDisabled()) {
      this.onToggle.emit();
    }
  }
}
