/**
 * TokenRequest.ts
 * Represents an incoming HTTP request to generate a LiveKit access token.
 */

/**
 * The LiveKit token request parameters.
 * Validated before processing using Zod schema.
 */
export interface TokenRequest {
  /**
   * The LiveKit room name the participant will join.
   * Must match pattern: ^[a-zA-Z0-9_-]+$
   * Max length: 255 characters
   */
  roomName: string;

  /**
   * Unique identifier for the participant.
   * Typically user ID or session ID from frontend.
   * Must match pattern: ^[a-zA-Z0-9_-]+$
   * Max length: 255 characters
   */
  participantIdentity: string;

  /**
   * Optional token expiration in seconds from now.
   * Default: 3600 (1 hour)
   * Min: 60, Max: 86400 (24 hours)
   */
  expirationSeconds?: number;

  /**
   * Optional participant name for display purposes.
   * If not provided, uses participantIdentity.
   */
  participantName?: string;
}
