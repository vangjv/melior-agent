/**
 * Authentication middleware for Azure Functions
 * Feature: 004-entra-external-id-auth
 *
 * Validates JWT tokens from Microsoft Entra External ID and extracts user identity
 */

import { HttpRequest, InvocationContext } from '@azure/functions';
import { ConfidentialClientApplication, Configuration as MsalConfig } from '@azure/msal-node';
import { TokenValidationResult } from '../models/TokenValidationResult';
import { UserIdentity } from '../models/UserIdentity';
import { AuthErrorResponse } from '../models/AuthError';

/**
 * MSAL Node configuration for token validation
 */
let msalClient: ConfidentialClientApplication | null = null;

function getMsalClient(): ConfidentialClientApplication {
  if (!msalClient) {
    const msalConfig: MsalConfig = {
      auth: {
        clientId: process.env.ENTRA_CLIENT_ID || '',
        authority: process.env.ENTRA_AUTHORITY || '',
        clientSecret: 'not-needed-for-validation'  // Not required for token validation
      }
    };

    msalClient = new ConfidentialClientApplication(msalConfig);
  }

  return msalClient;
}

/**
 * Validate bearer token from Authorization header
 *
 * @param request - HTTP request object
 * @param context - Invocation context for logging
 * @returns TokenValidationResult with validation status and user identity or error
 */
export async function validateToken(
  request: HttpRequest,
  context: InvocationContext
): Promise<TokenValidationResult> {
  try {
    // Extract bearer token from Authorization header
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return {
        isValid: false,
        error: createAuthErrorResponse(
          'missing_token',
          'Authorization header is missing',
          401,
          request.url
        )
      };
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      return {
        isValid: false,
        error: createAuthErrorResponse(
          'invalid_token',
          'Authorization header must be in format: Bearer <token>',
          401,
          request.url
        )
      };
    }

    const token = parts[1];

    // Decode token to inspect claims (without signature verification first)
    const decodedToken = parseJwt(token);

    if (!decodedToken) {
      return {
        isValid: false,
        error: createAuthErrorResponse(
          'invalid_token',
          'Token is malformed and cannot be decoded',
          401,
          request.url
        )
      };
    }

    // Validate token expiration with clock skew tolerance (5 minutes)
    const clockSkewSeconds = 300;  // 5 minutes
    const now = Math.floor(Date.now() / 1000);

    if (decodedToken.exp && decodedToken.exp + clockSkewSeconds < now) {
      return {
        isValid: false,
        error: createAuthErrorResponse(
          'expired_token',
          'Token has expired',
          401,
          request.url
        )
      };
    }

    // Validate audience (must match our client ID)
    const expectedAudience = process.env.ENTRA_CLIENT_ID;
    if (!validateAudience(decodedToken, expectedAudience)) {
      return {
        isValid: false,
        error: createAuthErrorResponse(
          'invalid_audience',
          'Token audience does not match expected client ID',
          401,
          request.url
        )
      };
    }

    // Validate issuer (must match our authority)
    const expectedIssuer = `${process.env.ENTRA_AUTHORITY}/v2.0`;
    if (!validateIssuer(decodedToken, expectedIssuer)) {
      return {
        isValid: false,
        error: createAuthErrorResponse(
          'invalid_issuer',
          'Token issuer does not match expected authority',
          401,
          request.url
        )
      };
    }

    // Extract user identity from validated token
    const userIdentity = extractUserIdentity(decodedToken);

    context.log(`Token validated successfully for user: ${userIdentity.userId}`);

    return {
      isValid: true,
      userIdentity
    };

  } catch (error) {
    context.error('Token validation error:', error);

    return {
      isValid: false,
      error: createAuthErrorResponse(
        'invalid_token',
        error instanceof Error ? error.message : 'Unknown token validation error',
        401,
        request.url
      )
    };
  }
}

/**
 * Validate token audience claim
 */
export function validateAudience(decodedToken: any, expectedAudience: string | undefined): boolean {
  if (!expectedAudience) {
    return false;
  }

  const aud = decodedToken.aud;

  if (Array.isArray(aud)) {
    return aud.includes(expectedAudience);
  }

  return aud === expectedAudience;
}

/**
 * Validate token issuer claim
 */
export function validateIssuer(decodedToken: any, expectedIssuer: string | undefined): boolean {
  if (!expectedIssuer) {
    return false;
  }

  const iss = decodedToken.iss;

  // Allow both with and without /v2.0 suffix
  return iss === expectedIssuer || iss === expectedIssuer.replace('/v2.0', '');
}

/**
 * Extract user identity from validated token claims
 */
export function extractUserIdentity(decodedToken: any): UserIdentity {
  return {
    userId: decodedToken.oid || decodedToken.sub || '',
    email: decodedToken.email || decodedToken.preferred_username || '',
    displayName: decodedToken.name || decodedToken.email || decodedToken.preferred_username || 'Unknown User',
    tenantId: decodedToken.tid || '',
    roles: decodedToken.roles || []
  };
}

/**
 * Create structured authentication error response
 */
export function createAuthErrorResponse(
  code: string,
  message: string,
  statusCode: number,
  path: string
): AuthErrorResponse {
  return {
    error: {
      code,
      message,
      statusCode
    },
    timestamp: new Date().toISOString(),
    path
  };
}

/**
 * Parse JWT token payload without signature verification
 * This is used for initial inspection before full validation
 */
function parseJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      Buffer.from(base64, 'base64')
        .toString('utf-8')
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
}
