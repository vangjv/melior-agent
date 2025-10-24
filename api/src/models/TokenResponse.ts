/**
 * TokenResponse.ts
 * Represents the successful token generation result returned to the frontend.
 */

/**
 * The successful token generation response.
 */
export interface TokenResponse {
  /**
   * The JWT access token for LiveKit authentication.
   * This is a signed JWT containing room name, identity, and permissions.
   */
  token: string;

  /**
   * ISO 8601 timestamp when the token expires.
   * Example: "2025-10-24T15:30:00Z"
   */
  expiresAt: string;

  /**
   * The room name this token is valid for.
   * Included for frontend validation/debugging.
   */
  roomName: string;

  /**
   * The participant identity encoded in the token.
   * Included for frontend validation/debugging.
   */
  participantIdentity: string;
}
