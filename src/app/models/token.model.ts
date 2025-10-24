/**
 * Token Request/Response models for backend API integration (002-livekit-token-api)
 */

/**
 * Request payload for token generation API
 */
export interface TokenRequest {
  readonly roomName: string;
  readonly participantIdentity: string;
  readonly expirationMinutes?: number;
}

/**
 * Success response from token generation API
 */
export interface TokenResponse {
  readonly token: string;
  readonly expiresAt: string;  // ISO 8601 timestamp
  readonly roomName: string;
  readonly participantIdentity: string;
}

/**
 * Error response from token generation API
 */
export interface TokenApiError extends Error {
  readonly statusCode: number;
  readonly error: string;
  readonly message: string;
  readonly details?: Record<string, string[]>;  // Validation errors
}

/**
 * Type guard for TokenApiError
 */
export function isTokenApiError(error: unknown): error is TokenApiError {
  return typeof error === 'object' &&
         error !== null &&
         'statusCode' in error &&
         'error' in error;
}
