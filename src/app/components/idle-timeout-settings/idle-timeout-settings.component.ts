/**
 * Idle Timeout Settings Component
 * Feature: 006-auto-disconnect-idle
 *
 * Allows users to configure idle timeout duration
 */

import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { IdleTimeoutService } from '../../services/idle-timeout.service';
import { IdleTimeoutConfig, IDLE_TIMEOUT_CONSTRAINTS } from '../../models/idle-timeout-config';

/**
 * Configuration UI for idle timeout settings
 * Provides form inputs for timeout duration and warning threshold
 */
@Component({
  selector: 'app-idle-timeout-settings',
  standalone: true,
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatIconModule,
    MatCardModule,
  ],
  templateUrl: './idle-timeout-settings.component.html',
  styleUrl: './idle-timeout-settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdleTimeoutSettingsComponent {
  private readonly idleTimeoutService = inject(IdleTimeoutService);

  // Expose constraints for template
  readonly MIN_DURATION = IDLE_TIMEOUT_CONSTRAINTS.MIN_DURATION_SECONDS;
  readonly MAX_DURATION = IDLE_TIMEOUT_CONSTRAINTS.MAX_DURATION_SECONDS;
  readonly MIN_WARNING = IDLE_TIMEOUT_CONSTRAINTS.MIN_WARNING_THRESHOLD_SECONDS;

  // Form state signals
  readonly durationMinutes = signal<number>(2);
  readonly warningSeconds = signal<number>(30);
  readonly enabled = signal<boolean>(true);
  readonly validationError = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  constructor() {
    // Load current configuration
    const currentConfig = this.idleTimeoutService.config();
    this.durationMinutes.set(Math.floor(currentConfig.durationSeconds / 60));
    this.warningSeconds.set(currentConfig.warningThresholdSeconds);
    this.enabled.set(currentConfig.enabled);
  }

  /**
   * Computed helper for duration in seconds
   */
  readonly durationSeconds = computed(() => this.durationMinutes() * 60);

  /**
   * Computed validation state for duration
   */
  readonly isDurationValid = computed(() => {
    const seconds = this.durationSeconds();
    return seconds >= this.MIN_DURATION && seconds <= this.MAX_DURATION;
  });

  /**
   * Computed validation state for warning threshold
   */
  readonly isWarningValid = computed(() => {
    const warning = this.warningSeconds();
    const duration = this.durationSeconds();
    return (
      warning >= this.MIN_WARNING &&
      warning < duration
    );
  });

  /**
   * Computed overall form validity
   */
  readonly isFormValid = computed(() => {
    return this.isDurationValid() && this.isWarningValid();
  });

  /**
   * Handle save button click
   */
  onSave(): void {
    this.validationError.set(null);
    this.successMessage.set(null);

    const config: IdleTimeoutConfig = {
      durationSeconds: this.durationSeconds(),
      warningThresholdSeconds: this.warningSeconds(),
      enabled: this.enabled(),
    };

    const error = this.idleTimeoutService.updateConfig(config);

    if (error) {
      this.validationError.set(`${error.field}: ${error.reason}`);
    } else {
      this.successMessage.set('Settings saved successfully!');
      // Clear success message after 3 seconds
      setTimeout(() => this.successMessage.set(null), 3000);
    }
  }

  /**
   * Reset to default configuration
   */
  onReset(): void {
    this.durationMinutes.set(2);
    this.warningSeconds.set(30);
    this.enabled.set(true);
    this.validationError.set(null);
    this.successMessage.set(null);
  }

  /**
   * Format duration for display
   */
  getDurationDisplay(): string {
    const minutes = this.durationMinutes();
    if (minutes === 1) return '1 minute';
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return hours === 1 ? '1 hour' : `${hours} hours`;
    return `${hours}h ${remainingMinutes}m`;
  }
}
