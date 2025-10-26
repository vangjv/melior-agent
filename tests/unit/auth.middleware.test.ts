/**
 * Unit tests for authentication middleware
 * Feature: 004-entra-external-id-auth
 * Tasks: T081-T087
 */

import { HttpRequest, InvocationContext } from '@azure/functions';
import {
  validateToken,
  validateAudience,
  validateIssuer,
  extractUserIdentity,
  createAuthErrorResponse
} from '../../api/src/middleware/auth.middleware';
import { TokenValidationResult } from '../../api/src/models/TokenValidationResult';
import { UserIdentity } from '../../api/src/models/UserIdentity';

/**
 * Helper function to create a mock JWT token
 */
function createMockToken(payload: any): string {
  const header = { alg: 'RS256', typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = 'mock-signature';
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Helper function to create mock HttpRequest
 */
function createMockRequest(authHeader?: string, url: string = 'http://localhost:7071/api/test'): HttpRequest {
  const headers = new Map<string, string>();
  if (authHeader) {
    headers.set('authorization', authHeader);
  }

  return {
    headers: {
      get: (name: string) => headers.get(name.toLowerCase()) || null
    },
    url
  } as any as HttpRequest;
}

/**
 * Helper function to create mock InvocationContext
 */
function createMockContext(): InvocationContext {
  return {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    trace: jest.fn(),
    debug: jest.fn()
  } as any as InvocationContext;
}

describe('Auth Middleware', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      ENTRA_CLIENT_ID: 'test-client-id-1234',
      ENTRA_TENANT_ID: 'test-tenant-id-5678',
      ENTRA_AUTHORITY: 'https://login.microsoftonline.com/test-tenant-id-5678'
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('validateToken - T082: Valid token', () => {
    it('should return isValid: true for a valid token', async () => {
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        oid: 'user-id-123',
        email: 'test@example.com',
        name: 'Test User',
        tid: 'test-tenant-id-5678',
        aud: 'test-client-id-1234',
        iss: 'https://login.microsoftonline.com/test-tenant-id-5678/v2.0',
        exp: now + 3600, // Expires in 1 hour
        iat: now - 60,
        nbf: now - 60
      };

      const token = createMockToken(payload);
      const request = createMockRequest(`Bearer ${token}`);
      const context = createMockContext();

      const result: TokenValidationResult = await validateToken(request, context);

      expect(result.isValid).toBe(true);
      expect(result.userIdentity).toBeDefined();
      expect(result.userIdentity?.userId).toBe('user-id-123');
      expect(result.userIdentity?.email).toBe('test@example.com');
      expect(result.userIdentity?.displayName).toBe('Test User');
      expect(result.userIdentity?.tenantId).toBe('test-tenant-id-5678');
      expect(result.error).toBeUndefined();
    });
  });

  describe('validateToken - T083: Missing token', () => {
    it('should return missing_token error when Authorization header is missing', async () => {
      const request = createMockRequest(); // No auth header
      const context = createMockContext();

      const result: TokenValidationResult = await validateToken(request, context);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.error.code).toBe('missing_token');
      expect(result.error?.error.message).toBe('Authorization header is missing');
      expect(result.error?.error.statusCode).toBe(401);
      expect(result.userIdentity).toBeUndefined();
    });

    it('should return invalid_token error when Authorization header has wrong format', async () => {
      const request = createMockRequest('InvalidFormat');
      const context = createMockContext();

      const result: TokenValidationResult = await validateToken(request, context);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.error.code).toBe('invalid_token');
      expect(result.error?.error.message).toContain('Bearer');
    });
  });

  describe('validateToken - T084: Invalid signature', () => {
    it('should return invalid_token error for malformed token', async () => {
      const request = createMockRequest('Bearer not-a-valid-jwt');
      const context = createMockContext();

      const result: TokenValidationResult = await validateToken(request, context);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.error.code).toBe('invalid_token');
      expect(result.error?.error.message).toContain('malformed');
    });
  });

  describe('validateToken - T085: Expired token', () => {
    it('should return expired_token error for expired token', async () => {
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        oid: 'user-id-123',
        email: 'test@example.com',
        name: 'Test User',
        tid: 'test-tenant-id-5678',
        aud: 'test-client-id-1234',
        iss: 'https://login.microsoftonline.com/test-tenant-id-5678/v2.0',
        exp: now - 600, // Expired 10 minutes ago (beyond 5 min clock skew)
        iat: now - 4200,
        nbf: now - 4200
      };

      const token = createMockToken(payload);
      const request = createMockRequest(`Bearer ${token}`);
      const context = createMockContext();

      const result: TokenValidationResult = await validateToken(request, context);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.error.code).toBe('expired_token');
      expect(result.error?.error.message).toBe('Token has expired');
    });

    it('should accept token within clock skew tolerance (5 minutes)', async () => {
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        oid: 'user-id-123',
        email: 'test@example.com',
        name: 'Test User',
        tid: 'test-tenant-id-5678',
        aud: 'test-client-id-1234',
        iss: 'https://login.microsoftonline.com/test-tenant-id-5678/v2.0',
        exp: now - 240, // Expired 4 minutes ago (within 5 min tolerance)
        iat: now - 3840,
        nbf: now - 3840
      };

      const token = createMockToken(payload);
      const request = createMockRequest(`Bearer ${token}`);
      const context = createMockContext();

      const result: TokenValidationResult = await validateToken(request, context);

      expect(result.isValid).toBe(true);
      expect(result.userIdentity).toBeDefined();
    });
  });

  describe('validateToken - T086: Wrong audience', () => {
    it('should return invalid_audience error when audience does not match', async () => {
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        oid: 'user-id-123',
        email: 'test@example.com',
        name: 'Test User',
        tid: 'test-tenant-id-5678',
        aud: 'wrong-client-id', // Wrong audience
        iss: 'https://login.microsoftonline.com/test-tenant-id-5678/v2.0',
        exp: now + 3600,
        iat: now - 60,
        nbf: now - 60
      };

      const token = createMockToken(payload);
      const request = createMockRequest(`Bearer ${token}`);
      const context = createMockContext();

      const result: TokenValidationResult = await validateToken(request, context);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.error.code).toBe('invalid_audience');
      expect(result.error?.error.message).toContain('audience');
    });

    it('should accept token with audience in array format', async () => {
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        oid: 'user-id-123',
        email: 'test@example.com',
        name: 'Test User',
        tid: 'test-tenant-id-5678',
        aud: ['test-client-id-1234', 'other-client-id'], // Array of audiences
        iss: 'https://login.microsoftonline.com/test-tenant-id-5678/v2.0',
        exp: now + 3600,
        iat: now - 60,
        nbf: now - 60
      };

      const token = createMockToken(payload);
      const request = createMockRequest(`Bearer ${token}`);
      const context = createMockContext();

      const result: TokenValidationResult = await validateToken(request, context);

      expect(result.isValid).toBe(true);
      expect(result.userIdentity).toBeDefined();
    });
  });

  describe('validateAudience helper', () => {
    it('should validate single audience claim', () => {
      const token = { aud: 'test-client-id' };
      expect(validateAudience(token, 'test-client-id')).toBe(true);
      expect(validateAudience(token, 'wrong-client-id')).toBe(false);
    });

    it('should validate array audience claim', () => {
      const token = { aud: ['client-1', 'client-2', 'client-3'] };
      expect(validateAudience(token, 'client-2')).toBe(true);
      expect(validateAudience(token, 'client-4')).toBe(false);
    });

    it('should return false when expectedAudience is undefined', () => {
      const token = { aud: 'test-client-id' };
      expect(validateAudience(token, undefined)).toBe(false);
    });
  });

  describe('validateIssuer helper', () => {
    it('should validate issuer with /v2.0 suffix', () => {
      const token = { iss: 'https://login.microsoftonline.com/tenant-id/v2.0' };
      expect(validateIssuer(token, 'https://login.microsoftonline.com/tenant-id/v2.0')).toBe(true);
    });

    it('should validate issuer without /v2.0 suffix', () => {
      const token = { iss: 'https://login.microsoftonline.com/tenant-id' };
      expect(validateIssuer(token, 'https://login.microsoftonline.com/tenant-id/v2.0')).toBe(true);
    });

    it('should accept token with /v2.0 when expected issuer has no suffix', () => {
      const token = { iss: 'https://login.microsoftonline.com/tenant-id/v2.0' };
      expect(validateIssuer(token, 'https://login.microsoftonline.com/tenant-id')).toBe(true);
    });

    it('should return false for wrong issuer', () => {
      const token = { iss: 'https://wrong-issuer.com/tenant-id/v2.0' };
      expect(validateIssuer(token, 'https://login.microsoftonline.com/tenant-id/v2.0')).toBe(false);
    });

    it('should return false when expectedIssuer is undefined', () => {
      const token = { iss: 'https://login.microsoftonline.com/tenant-id/v2.0' };
      expect(validateIssuer(token, undefined)).toBe(false);
    });
  });

  describe('extractUserIdentity - T087', () => {
    it('should correctly map token claims to UserIdentity', () => {
      const token = {
        oid: 'user-object-id-123',
        email: 'user@example.com',
        name: 'John Doe',
        tid: 'tenant-id-456',
        roles: ['User', 'Admin']
      };

      const identity: UserIdentity = extractUserIdentity(token);

      expect(identity.userId).toBe('user-object-id-123');
      expect(identity.email).toBe('user@example.com');
      expect(identity.displayName).toBe('John Doe');
      expect(identity.tenantId).toBe('tenant-id-456');
      expect(identity.roles).toEqual(['User', 'Admin']);
    });

    it('should fall back to sub claim if oid is missing', () => {
      const token = {
        sub: 'subject-id-789',
        email: 'user@example.com',
        name: 'Jane Smith',
        tid: 'tenant-id-456'
      };

      const identity: UserIdentity = extractUserIdentity(token);

      expect(identity.userId).toBe('subject-id-789');
    });

    it('should fall back to preferred_username if email is missing', () => {
      const token = {
        oid: 'user-id-123',
        preferred_username: 'user@domain.com',
        name: 'Test User',
        tid: 'tenant-id-456'
      };

      const identity: UserIdentity = extractUserIdentity(token);

      expect(identity.email).toBe('user@domain.com');
    });

    it('should use email for displayName if name is missing', () => {
      const token = {
        oid: 'user-id-123',
        email: 'user@example.com',
        tid: 'tenant-id-456'
      };

      const identity: UserIdentity = extractUserIdentity(token);

      expect(identity.displayName).toBe('user@example.com');
    });

    it('should default to empty array for roles if missing', () => {
      const token = {
        oid: 'user-id-123',
        email: 'user@example.com',
        name: 'Test User',
        tid: 'tenant-id-456'
      };

      const identity: UserIdentity = extractUserIdentity(token);

      expect(identity.roles).toEqual([]);
    });

    it('should handle completely minimal token', () => {
      const token = {};

      const identity: UserIdentity = extractUserIdentity(token);

      expect(identity.userId).toBe('');
      expect(identity.email).toBe('');
      expect(identity.displayName).toBe('Unknown User');
      expect(identity.tenantId).toBe('');
      expect(identity.roles).toEqual([]);
    });
  });

  describe('createAuthErrorResponse', () => {
    it('should create properly structured error response', () => {
      const error = createAuthErrorResponse(
        'test_error',
        'Test error message',
        401,
        '/api/test'
      );

      expect(error.error.code).toBe('test_error');
      expect(error.error.message).toBe('Test error message');
      expect(error.error.statusCode).toBe(401);
      expect(error.path).toBe('/api/test');
      expect(error.timestamp).toBeDefined();
      expect(new Date(error.timestamp).getTime()).toBeGreaterThan(0);
    });
  });
});
