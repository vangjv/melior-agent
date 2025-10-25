/**
 * LiveKitConfig.ts
 * Internal configuration model for LiveKit SDK initialization.
 */

/**
 * Type-safe access to LiveKit API credentials from environment variables.
 */
export interface LiveKitConfig {
  /**
   * LiveKit API key from Azure App Settings.
   * Environment variable: LIVEKIT_API_KEY
   */
  apiKey: string;

  /**
   * LiveKit API secret from Azure App Settings.
   * Environment variable: LIVEKIT_API_SECRET
   */
  apiSecret: string;

  /**
   * Optional LiveKit server URL.
   * Environment variable: LIVEKIT_URL
   * Default: not used for token generation (tokens are server-agnostic)
   */
  serverUrl?: string;
}
