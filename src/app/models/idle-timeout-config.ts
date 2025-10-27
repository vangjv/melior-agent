/**
 * Idle Timeout Configuration
 * Feature: 006-auto-disconnect-idle
 */

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
  durationSeconds: 120, // 2 minutes
  warningThresholdSeconds: 30, // 30 seconds warning
  enabled: true,
};

/**
 * Validation constraints for idle timeout configuration
 */
export const IDLE_TIMEOUT_CONSTRAINTS = {
  MIN_DURATION_SECONDS: 30,
  MAX_DURATION_SECONDS: 3600,
  MIN_WARNING_THRESHOLD_SECONDS: 5,
  STORAGE_KEY: 'melior-agent:idle-timeout-config',
} as const;

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
