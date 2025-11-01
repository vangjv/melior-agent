/**
 * Mode Toggle Button Component
 * T040-T050: Presentational component for toggling between voice and chat response modes
 */
import { Component, input, output, computed, effect, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { ResponseMode } from '../../models/response-mode.model';

/**
 * Presentational component for mode toggle button
 * Displays current response mode and allows user to toggle between voice and chat
 */
@Component({
  selector: 'app-mode-toggle-button',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule],
  templateUrl: './mode-toggle-button.component.html',
  styleUrl: './mode-toggle-button.component.scss',
})
export class ModeToggleButtonComponent {
  // T070: Inject Angular CDK LiveAnnouncer for screen reader announcements
  private liveAnnouncer = inject(LiveAnnouncer);

  // Inject MatSnackBar for visual toast notifications
  private snackBar = inject(MatSnackBar);

  // Track previous mode to detect actual changes (not initial render)
  private previousMode = signal<ResponseMode | null>(null);

  // Track if this is the first render to avoid announcing initial state
  private isInitialRender = true;

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

  // T071: Effect to announce mode changes to screen readers and show visual feedback
  constructor() {
    effect(() => {
      const mode = this.currentMode();
      const prevMode = this.previousMode();
      const isPendingMode = this.isPending();
      const label = this.buttonLabel();

      // Skip announcements on initial render
      if (this.isInitialRender) {
        this.isInitialRender = false;
        this.previousMode.set(mode);
        return;
      }

      // Only announce and show feedback when:
      // 1. Mode has actually changed (not just re-rendered)
      // 2. Change is confirmed (not pending)
      if (prevMode !== null && prevMode !== mode && !isPendingMode) {
        // Visual feedback: Show toast notification
        this.snackBar.open(`Switched to ${label}`, 'Dismiss', {
          duration: 3000,
          horizontalPosition: 'start',
          verticalPosition: 'bottom',
          panelClass: ['mode-change-snackbar'],
        });

        // Screen reader announcement (polite priority so it doesn't interrupt)
        this.liveAnnouncer.announce(`Switched to ${label}`, 'polite');
      }

      // Update previous mode for next comparison
      this.previousMode.set(mode);
    });
  }

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

