import { UserIdentity } from './UserIdentity';
import { AuthErrorResponse } from './AuthError';

/**
 * Result of JWT token validation in Azure Functions middleware
 * Feature: 004-entra-external-id-auth
 */
export interface TokenValidationResult {
  readonly isValid: boolean;
  readonly userIdentity?: UserIdentity;
  readonly error?: AuthErrorResponse;
}
