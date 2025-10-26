/**
 * Authentication state models for Microsoft Entra External ID integration
 * Feature: 004-entra-external-id-auth
 */

/**
 * Authentication status discriminator
 */
export type AuthStatus = 'unauthenticated' | 'authenticating' | 'authenticated' | 'error';

/**
 * Authentication error codes
 */
export type AuthErrorCode =
  | 'user_cancelled'
  | 'network_error'
  | 'invalid_credentials'
  | 'token_expired'
  | 'token_refresh_failed'
  | 'configuration_error'
  | 'unknown_error';

/**
 * Current authentication state of the application
 * Uses discriminated union pattern based on status field
 */
export interface AuthenticationState {
  readonly status: AuthStatus;
  readonly user: UserProfile | null;
  readonly error: AuthError | null;
}

/**
 * Authenticated user profile information from Microsoft Entra
 * Derived from MSAL AccountInfo after successful authentication
 */
export interface UserProfile {
  readonly userId: string;           // Unique identifier (oid claim)
  readonly email: string;            // User's email address
  readonly displayName: string;      // User's full name for display
  readonly username: string;         // Username/UPN
  readonly tenantId: string;         // Tenant ID from token
}

/**
 * Authentication error details
 * Contains both technical and user-friendly error information
 */
export interface AuthError {
  readonly code: AuthErrorCode;
  readonly message: string;          // Technical error message for logging
  readonly userMessage: string;      // User-friendly message for UI display
  readonly timestamp: Date;
  readonly retryable: boolean;       // Whether user should be offered retry option
}
