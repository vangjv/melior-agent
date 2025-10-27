/**
 * Idle Warning Component
 * Feature: 006-auto-disconnect-idle
 *
 * Presentational component that displays warning before auto-disconnect
 */

import { Component, ChangeDetectionStrategy, computed, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

/**
 * Displays idle timeout warning with countdown
 * Shows when 30 seconds or less remain before disconnect
 */
@Component({
  selector: 'app-idle-warning',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  templateUrl: './idle-warning.component.html',
  styleUrl: './idle-warning.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdleWarningComponent {
  /**
   * Time remaining in seconds
   * Warning displays when this value is <= 30
   */
  readonly timeRemaining = input.required<number>();

  /**
   * Event emitted when user dismisses warning
   * Should trigger activity to reset timer
   */
  readonly onDismiss = output<void>();

  /**
   * Computed signal determining if warning should display
   */
  readonly shouldShow = computed(() => {
    const remaining = this.timeRemaining();
    return remaining > 0 && remaining <= 30;
  });

  /**
   * Formatted time display (MM:SS)
   */
  readonly formattedTime = computed(() => {
    const seconds = this.timeRemaining();
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  });

  /**
   * Handle dismiss button click
   */
  handleDismiss(): void {
    this.onDismiss.emit();
  }
}
