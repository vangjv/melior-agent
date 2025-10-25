/**
 * validation.ts
 * Request validation using Zod schema for runtime type checking.
 */

import { z } from 'zod';
import { TokenRequest } from '../models/TokenRequest';
import { ErrorResponse, ErrorCode, ValidationError } from '../models/ErrorResponse';

/**
 * Zod schema for TokenRequest validation.
 */
export const TokenRequestSchema = z.object({
  roomName: z.string()
    .min(1, 'Room name is required')
    .max(255, 'Room name too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Room name contains invalid characters'),

  participantIdentity: z.string()
    .min(1, 'Participant identity is required')
    .max(255, 'Participant identity too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Participant identity contains invalid characters'),

  expirationSeconds: z.number()
    .int('Expiration must be an integer')
    .min(60, 'Minimum expiration is 60 seconds')
    .max(86400, 'Maximum expiration is 24 hours')
    .optional()
    .default(3600),

  participantName: z.string()
    .max(255, 'Participant name too long')
    .optional()
});

/**
 * Validates the token request using Zod schema.
 *
 * @param data - The request body to validate
 * @returns Validated TokenRequest object
 * @throws ZodError if validation fails
 */
export function validateTokenRequest(data: unknown): TokenRequest {
  return TokenRequestSchema.parse(data);
}

/**
 * Converts Zod validation errors to ErrorResponse format.
 *
 * @param error - The Zod validation error
 * @returns Formatted ErrorResponse object
 */
export function formatValidationError(error: z.ZodError<any>): ErrorResponse {
  const validationErrors: ValidationError[] = error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message
  }));

  return {
    statusCode: 400,
    errorCode: ErrorCode.VALIDATION_ERROR,
    message: 'Request validation failed',
    validationErrors,
    timestamp: new Date().toISOString()
  };
}
