/**
 * config.ts
 * Configuration loading utility with lazy initialization pattern.
 */

import { LiveKitConfig } from '../models/LiveKitConfig';
import { ErrorResponse, ErrorCode } from '../models/ErrorResponse';

/**
 * Cached configuration (lazy initialization).
 */
let cachedConfig: LiveKitConfig | null = null;

/**
 * Loads LiveKit configuration from environment variables.
 * Configuration is cached after first load for performance.
 *
 * @returns LiveKitConfig object with API credentials
 * @throws Error if required environment variables are missing
 */
export function loadLiveKitConfig(): LiveKitConfig {
  // Return cached config if available
  if (cachedConfig) {
    return cachedConfig;
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error('LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be configured in environment variables');
  }

  // Cache the configuration
  cachedConfig = {
    apiKey,
    apiSecret,
    serverUrl: process.env.LIVEKIT_URL
  };

  return cachedConfig;
}

/**
 * Creates an ErrorResponse for missing credentials.
 *
 * @returns Formatted ErrorResponse object
 */
export function createMissingCredentialsError(): ErrorResponse {
  return {
    statusCode: 500,
    errorCode: ErrorCode.MISSING_CREDENTIALS,
    message: 'LiveKit API credentials are not configured. Please set LIVEKIT_API_KEY and LIVEKIT_API_SECRET environment variables.',
    timestamp: new Date().toISOString()
  };
}
