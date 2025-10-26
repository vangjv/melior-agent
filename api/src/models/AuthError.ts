/**
 * Structured error response for authentication failures in API
 * Feature: 004-entra-external-id-auth
 */
export interface AuthErrorResponse {
  readonly error: {
    readonly code: string;           // Error code (e.g., 'invalid_token')
    readonly message: string;        // Error description
    readonly statusCode: number;     // HTTP status code (401, 403)
  };
  readonly timestamp: string;        // ISO 8601 timestamp
  readonly path: string;             // Request path that failed
}
