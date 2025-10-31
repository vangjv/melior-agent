/**
 * Idle Timeout Service
 * Feature: 006-auto-disconnect-idle
 *
 * Monitors user activity and automatically disconnects idle sessions
 */

import { Injectable, signal, computed, effect, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval, Subscription } from 'rxjs';
import { map, takeWhile } from 'rxjs/operators';
import { ConversationStorageService } from './conversation-storage.service';
import { LiveKitConnectionService } from './livekit-connection.service';
import { IdleTimerState, INITIAL_IDLE_TIMER_STATE } from '../models/idle-timer-state';
import {
  IdleTimeoutConfig,
  DEFAULT_IDLE_TIMEOUT_CONFIG,
  IdleTimeoutValidationError,
} from '../models/idle-timeout-config';
import {
  loadIdleTimeoutConfig,
  saveIdleTimeoutConfig,
  validateIdleTimeoutConfig,
} from '../utils/idle-timeout-storage.util';

/**
 * Service for managing idle timeout and automatic disconnection
 */
@Injectable({
  providedIn: 'root',
})
export class IdleTimeoutService {
  // Injected dependencies
  private readonly conversationService = inject(ConversationStorageService);
  private readonly connectionService = inject(LiveKitConnectionService);
  private readonly destroyRef = inject(DestroyRef);

  // Private writable signals
  private readonly _timerState = signal<IdleTimerState>(INITIAL_IDLE_TIMER_STATE);
  private readonly _config = signal<IdleTimeoutConfig>(DEFAULT_IDLE_TIMEOUT_CONFIG);

  // Public readonly signals
  readonly timerState = this._timerState.asReadonly();
  readonly config = this._config.asReadonly();

  // Computed signals
  readonly formattedTimeRemaining = computed(() => {
    const seconds = this._timerState().timeRemaining;
    return this.formatTime(seconds);
  });

  // Timer subscription
  private timerSubscription?: Subscription;
  private lastActivityTimestamp: Date | null = null;

  constructor() {
    // Load configuration from sessionStorage
    const storedConfig = loadIdleTimeoutConfig();
    this._config.set(storedConfig);

    // Monitor activity from conversation service using effect
    // Track the last activity timestamp to prevent infinite loops
    effect(() => {
      const lastActivity = this.conversationService.lastMessageAt();

      // Only reset if:
      // 1. There is new activity
      // 2. Timer is active
      // 3. This is a NEW activity (different from last processed timestamp)
      if (
        lastActivity &&
        this._timerState().isActive &&
        lastActivity !== this.lastActivityTimestamp
      ) {
        this.lastActivityTimestamp = lastActivity;
        this.resetTimer();
      }
    });
  }

  /**
   * Start idle timeout timer
   */
  startTimer(): void {
    // Stop any existing timer
    this.stopTimer();

    const config = this._config();
    const duration = config.durationSeconds;

    // Update state to active
    this._timerState.set({
      isActive: true,
      timeRemaining: duration,
      isWarning: duration <= config.warningThresholdSeconds,
      lastActivity: null,
    });

    // Start countdown timer
    this.timerSubscription = interval(1000)
      .pipe(
        map((tick) => duration - tick - 1),
        takeWhile((remaining) => remaining >= 0),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (remaining) => {
          const config = this._config();
          this._timerState.update((state) => ({
            ...state,
            timeRemaining: remaining,
            isWarning: remaining <= config.warningThresholdSeconds,
          }));
        },
        complete: () => {
          this.onTimeout();
        },
      });
  }

  /**
   * Stop idle timeout timer
   */
  stopTimer(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
      this.timerSubscription = undefined;
    }

    this._timerState.set(INITIAL_IDLE_TIMER_STATE);
    this.lastActivityTimestamp = null;
  }

  /**
   * Reset timer to full duration
   * Called when user activity is detected
   */
  resetTimer(): void {
    if (!this._timerState().isActive) {
      return;
    }

    // Stop current timer
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
      this.timerSubscription = undefined;
    }

    const config = this._config();
    const duration = config.durationSeconds;

    // Update state with new activity timestamp
    this._timerState.update((state) => ({
      ...state,
      timeRemaining: duration,
      isWarning: duration <= config.warningThresholdSeconds,
      lastActivity: new Date(),
    }));

    // Restart countdown
    this.timerSubscription = interval(1000)
      .pipe(
        map((tick) => duration - tick - 1),
        takeWhile((remaining) => remaining >= 0),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (remaining) => {
          const config = this._config();
          this._timerState.update((state) => ({
            ...state,
            timeRemaining: remaining,
            isWarning: remaining <= config.warningThresholdSeconds,
          }));
        },
        complete: () => {
          this.onTimeout();
        },
      });
  }

  /**
   * Update idle timeout configuration
   * @param config New configuration
   * @returns Validation error if invalid, null if successful
   */
  updateConfig(config: IdleTimeoutConfig): IdleTimeoutValidationError | null {
    const validationError = validateIdleTimeoutConfig(config);

    if (validationError !== null) {
      return validationError;
    }

    // Save to signal and sessionStorage
    this._config.set(config);
    saveIdleTimeoutConfig(config);

    return null;
  }

  /**
   * Handle timeout event
   * Disconnects from LiveKit session
   */
  private onTimeout(): void {
    this._timerState.update((state) => ({
      ...state,
      isActive: false,
      timeRemaining: 0,
    }));

    console.log('⏱️ Idle timeout reached, disconnecting...');

    this.connectionService.disconnect().catch((error) => {
      console.error('❌ Failed to disconnect on idle timeout:', error);
    });
  }

  /**
   * Format seconds as MM:SS
   */
  private formatTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}
