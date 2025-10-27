/**
 * Type Contracts: Auto-Disconnect on Idle Activity
 * Feature: 006-auto-disconnect-idle
 *
 * This file contains all TypeScript interface and type definitions
 * for the idle timeout feature.
 */

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration for idle timeout behavior
 */
export interface IdleTimeoutConfig {
  /**
   * Total idle time before auto-disconnect (in seconds)
   * Must be between 30 and 3600 (30 seconds to 60 minutes)
   */
  durationSeconds: number;

  /**
   * Time before timeout to show warning (in seconds)
   * Must be greater than 0 and less than durationSeconds
   */
  warningThresholdSeconds: number;

  /**
   * Whether idle timeout monitoring is active
   */
  enabled: boolean;
}

/**
 * Default configuration values
 */
export const DEFAULT_IDLE_TIMEOUT_CONFIG: IdleTimeoutConfig = {
  durationSeconds: 120,        // 2 minutes
  warningThresholdSeconds: 30, // 30 seconds warning
  enabled: true
};

/**
 * Validation constraints for idle timeout configuration
 */
export const IDLE_TIMEOUT_CONSTRAINTS = {
  MIN_DURATION_SECONDS: 30,
  MAX_DURATION_SECONDS: 3600,
  MIN_WARNING_THRESHOLD_SECONDS: 5,
  STORAGE_KEY: 'melior-agent:idle-timeout-config'
} as const;

// ============================================================================
// Timer State Types
// ============================================================================

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
  lastActivity: null
};

// ============================================================================
// Activity Event Types
// ============================================================================

/**
 * Transcription activity that resets the idle timer
 */
export interface TranscriptionActivityEvent {
  type: 'transcription';
  timestamp: Date;
  isFinal: boolean;
}

/**
 * Chat message activity that resets the idle timer
 */
export interface ChatMessageActivityEvent {
  type: 'chat-message';
  timestamp: Date;
  sender: 'user' | 'agent';
}

/**
 * Discriminated union of all activity event types
 */
export type ActivityEvent =
  | TranscriptionActivityEvent
  | ChatMessageActivityEvent;

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Error type for configuration validation failures
 */
export interface IdleTimeoutValidationError {
  /**
   * Field that failed validation
   */
  field: keyof IdleTimeoutConfig;

  /**
   * Invalid value that was provided
   */
  value: unknown;

  /**
   * Human-readable reason for validation failure
   */
  reason: string;
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Event emitted when idle timeout occurs
 */
export interface IdleTimeoutEvent {
  /**
   * Event type identifier
   */
  eventType: 'idle-timeout';

  /**
   * When the timeout occurred
   */
  timestamp: Date;

  /**
   * Last detected activity timestamp
   */
  lastActivity: Date | null;

  /**
   * Configured timeout duration (in seconds)
   */
  durationSeconds: number;

  /**
   * Total session duration before timeout (in seconds)
   */
  sessionDuration: number;
}

// ============================================================================
// Service Interface
// ============================================================================

/**
 * Service interface for idle timeout management
 */
export interface IIdleTimeoutService {
  /**
   * Current timer state (Signal)
   */
  readonly timerState: () => IdleTimerState;

  /**
   * Current configuration (Signal)
   */
  readonly config: () => IdleTimeoutConfig;

  /**
   * Formatted time remaining as MM:SS (Computed Signal)
   */
  readonly formattedTimeRemaining: () => string;

  /**
   * Percentage of time remaining (Computed Signal)
   */
  readonly percentRemaining: () => number;

  /**
   * Start monitoring for idle activity
   */
  startMonitoring(): void;

  /**
   * Stop monitoring and cleanup timer
   */
  stopMonitoring(): void;

  /**
   * Reset timer to full duration
   */
  resetTimer(): void;

  /**
   * Update idle timeout configuration
   * @param config New configuration
   * @throws Error if validation fails
   */
  updateConfig(config: Partial<IdleTimeoutConfig>): void;

  /**
   * Validate configuration
   * @param config Configuration to validate
   * @returns Array of validation errors (empty if valid)
   */
  validateConfig(config: IdleTimeoutConfig): IdleTimeoutValidationError[];
}

// ============================================================================
// Component Interface
// ============================================================================

/**
 * Props for IdleWarningComponent (presentational)
 */
export interface IdleWarningProps {
  /**
   * Time remaining in seconds
   */
  timeRemaining: number;

  /**
   * Formatted time string (MM:SS)
   */
  formattedTime: string;

  /**
   * Whether warning is currently visible
   */
  visible: boolean;

  /**
   * Callback when user dismisses warning (resets timer)
   */
  onDismiss: () => void;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for TranscriptionActivityEvent
 */
export function isTranscriptionActivity(event: ActivityEvent): event is TranscriptionActivityEvent {
  return event.type === 'transcription';
}

/**
 * Type guard for ChatMessageActivityEvent
 */
export function isChatMessageActivity(event: ActivityEvent): event is ChatMessageActivityEvent {
  return event.type === 'chat-message';
}

/**
 * Check if configuration is valid
 */
export function isValidConfig(config: unknown): config is IdleTimeoutConfig {
  if (typeof config !== 'object' || config === null) {
    return false;
  }

  const c = config as Partial<IdleTimeoutConfig>;

  return (
    typeof c.durationSeconds === 'number' &&
    typeof c.warningThresholdSeconds === 'number' &&
    typeof c.enabled === 'boolean' &&
    c.durationSeconds >= IDLE_TIMEOUT_CONSTRAINTS.MIN_DURATION_SECONDS &&
    c.durationSeconds <= IDLE_TIMEOUT_CONSTRAINTS.MAX_DURATION_SECONDS &&
    c.warningThresholdSeconds >= IDLE_TIMEOUT_CONSTRAINTS.MIN_WARNING_THRESHOLD_SECONDS &&
    c.warningThresholdSeconds < c.durationSeconds
  );
}
