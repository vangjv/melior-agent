/**
 * Idle Timer State
 * Feature: 006-auto-disconnect-idle
 */

/**
 * Current state of the idle timeout timer
 */
export interface IdleTimerState {
  /**
   * Whether the timer is currently running
   */
  isActive: boolean;

  /**
   * Seconds remaining until timeout (0 when inactive)
   */
  timeRemaining: number;

  /**
   * Whether the warning threshold has been reached
   */
  isWarning: boolean;

  /**
   * Timestamp of last activity that reset the timer
   */
  lastActivity: Date | null;
}

/**
 * Initial timer state (inactive)
 */
export const INITIAL_IDLE_TIMER_STATE: IdleTimerState = {
  isActive: false,
  timeRemaining: 0,
  isWarning: false,
  lastActivity: null,
};
