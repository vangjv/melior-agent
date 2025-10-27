/**
 * Idle Timeout Storage Utility
 * Feature: 006-auto-disconnect-idle
 *
 * Helper functions for persisting idle timeout configuration in sessionStorage
 */

import {
  IdleTimeoutConfig,
  DEFAULT_IDLE_TIMEOUT_CONFIG,
  IDLE_TIMEOUT_CONSTRAINTS,
  IdleTimeoutValidationError,
} from '../models/idle-timeout-config';

/**
 * Save idle timeout configuration to sessionStorage
 */
export function saveIdleTimeoutConfig(config: IdleTimeoutConfig): void {
  try {
    const serialized = JSON.stringify(config);
    sessionStorage.setItem(IDLE_TIMEOUT_CONSTRAINTS.STORAGE_KEY, serialized);
  } catch (error) {
    console.error('Failed to save idle timeout config:', error);
  }
}

/**
 * Load idle timeout configuration from sessionStorage
 * Returns default config if not found or invalid
 */
export function loadIdleTimeoutConfig(): IdleTimeoutConfig {
  try {
    const stored = sessionStorage.getItem(IDLE_TIMEOUT_CONSTRAINTS.STORAGE_KEY);

    if (!stored) {
      return { ...DEFAULT_IDLE_TIMEOUT_CONFIG };
    }

    const parsed = JSON.parse(stored) as IdleTimeoutConfig;
    const validation = validateIdleTimeoutConfig(parsed);

    if (validation !== null) {
      console.warn('Invalid stored config, using defaults:', validation);
      return { ...DEFAULT_IDLE_TIMEOUT_CONFIG };
    }

    return parsed;
  } catch (error) {
    console.error('Failed to load idle timeout config:', error);
    return { ...DEFAULT_IDLE_TIMEOUT_CONFIG };
  }
}

/**
 * Clear idle timeout configuration from sessionStorage
 */
export function clearIdleTimeoutConfig(): void {
  try {
    sessionStorage.removeItem(IDLE_TIMEOUT_CONSTRAINTS.STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear idle timeout config:', error);
  }
}

/**
 * Validate idle timeout configuration
 * Returns null if valid, error object if invalid
 */
export function validateIdleTimeoutConfig(
  config: IdleTimeoutConfig
): IdleTimeoutValidationError | null {
  // Validate durationSeconds
  if (
    typeof config.durationSeconds !== 'number' ||
    config.durationSeconds < IDLE_TIMEOUT_CONSTRAINTS.MIN_DURATION_SECONDS
  ) {
    return {
      field: 'durationSeconds',
      value: config.durationSeconds,
      reason: `Duration must be at least ${IDLE_TIMEOUT_CONSTRAINTS.MIN_DURATION_SECONDS} seconds`,
    };
  }

  if (config.durationSeconds > IDLE_TIMEOUT_CONSTRAINTS.MAX_DURATION_SECONDS) {
    return {
      field: 'durationSeconds',
      value: config.durationSeconds,
      reason: `Duration must be at most ${IDLE_TIMEOUT_CONSTRAINTS.MAX_DURATION_SECONDS} seconds (60 minutes)`,
    };
  }

  // Validate warningThresholdSeconds
  if (
    typeof config.warningThresholdSeconds !== 'number' ||
    config.warningThresholdSeconds < IDLE_TIMEOUT_CONSTRAINTS.MIN_WARNING_THRESHOLD_SECONDS
  ) {
    return {
      field: 'warningThresholdSeconds',
      value: config.warningThresholdSeconds,
      reason: `Warning threshold must be at least ${IDLE_TIMEOUT_CONSTRAINTS.MIN_WARNING_THRESHOLD_SECONDS} seconds`,
    };
  }

  if (config.warningThresholdSeconds >= config.durationSeconds) {
    return {
      field: 'warningThresholdSeconds',
      value: config.warningThresholdSeconds,
      reason: 'Warning threshold must be less than duration',
    };
  }

  // Validate enabled
  if (typeof config.enabled !== 'boolean') {
    return {
      field: 'enabled',
      value: config.enabled,
      reason: 'Enabled must be a boolean value',
    };
  }

  return null;
}
