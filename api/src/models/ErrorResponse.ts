/**
 * ErrorResponse.ts
 * Represents error conditions with structured error information for debugging.
 */

/**
 * Machine-readable error codes for programmatic handling.
 */
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  MISSING_CREDENTIALS = 'MISSING_CREDENTIALS',
  TOKEN_GENERATION_FAILED = 'TOKEN_GENERATION_FAILED',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

/**
 * Field-level validation error details.
 */
export interface ValidationError {
  /**
   * The field that failed validation.
   * Example: "roomName", "participantIdentity"
   */
  field: string;

  /**
   * Description of the validation failure.
   * Example: "Room name contains invalid characters"
   */
  message: string;
}

/**
 * Structured error response for API errors.
 */
export interface ErrorResponse {
  /**
   * HTTP status code (also included in response status).
   * Example: 400, 500
   */
  statusCode: number;

  /**
   * Machine-readable error code for programmatic handling.
   */
  errorCode: ErrorCode;

  /**
   * Human-readable error message for developers.
   * Should be descriptive enough for troubleshooting.
   */
  message: string;

  /**
   * Optional array of validation errors for field-level issues.
   * Only present when errorCode is "VALIDATION_ERROR".
   */
  validationErrors?: ValidationError[];

  /**
   * ISO 8601 timestamp when the error occurred.
   */
  timestamp: string;
}
