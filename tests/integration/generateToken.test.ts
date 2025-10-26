/**
 * generateToken.test.ts
 * Integration tests for the LiveKit token generation with real SDK.
 *
 * These tests use the actual LiveKit SDK with test credentials
 * but do not connect to live servers.
 */

import { LiveKitTokenService, LiveKitTokenGenerator } from '../../api/src/services/LiveKitTokenService';
import { validateToken, extractUserIdentity } from '../../api/src/middleware/auth.middleware';

describe('LiveKit Token Generation Integration', () => {
  beforeEach(() => {
    // Set test credentials
    process.env.LIVEKIT_API_KEY = 'APItest123';
    process.env.LIVEKIT_API_SECRET = 'testsecrettestsecrettestsecrettestse';
  });

  afterEach(() => {
    // Clean up environment
    delete process.env.LIVEKIT_API_KEY;
    delete process.env.LIVEKIT_API_SECRET;
  });

  it('should generate valid JWT token with real LiveKit SDK', async () => {
    // Arrange
    const generator = new LiveKitTokenGenerator();
    const service = new LiveKitTokenService(generator);

    // Act
    const result = await service.generateToken('test-room', 'user-123');

    // Assert
    expect(result.token).toBeDefined();
    expect(result.token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/); // JWT format: header.payload.signature
    expect(result.roomName).toBe('test-room');
    expect(result.participantIdentity).toBe('user-123');
    expect(result.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO 8601
  });

  it('should generate token with custom expiration', async () => {
    // Arrange
    const generator = new LiveKitTokenGenerator();
    const service = new LiveKitTokenService(generator);
    const customExpiration = 7200; // 2 hours

    // Act
    const result = await service.generateToken('test-room', 'user-123', customExpiration);

    // Assert
    expect(result.token).toBeDefined();

    // Verify expiration is approximately 2 hours from now
    const expiresAt = new Date(result.expiresAt).getTime();
    const expectedExpiration = Date.now() + (customExpiration * 1000);
    const diff = Math.abs(expiresAt - expectedExpiration);

    expect(diff).toBeLessThan(5000); // Allow 5 second variance
  });

  it('should throw error when credentials are missing', () => {
    // Arrange
    // Save current env vars
    const savedKey = process.env.LIVEKIT_API_KEY;
    const savedSecret = process.env.LIVEKIT_API_SECRET;

    delete process.env.LIVEKIT_API_KEY;
    delete process.env.LIVEKIT_API_SECRET;

    // Clear module cache to force reload
    jest.resetModules();

    // Act & Assert
    // Re-import the modules after clearing cache
    const { LiveKitTokenGenerator: FreshGenerator } = require('../../api/src/services/LiveKitTokenService');

    expect(() => {
      new FreshGenerator();
    }).toThrow('must be configured');

    // Restore env vars
    if (savedKey) process.env.LIVEKIT_API_KEY = savedKey;
    if (savedSecret) process.env.LIVEKIT_API_SECRET = savedSecret;
  });
});

/**
 * Integration tests for authentication in generateToken endpoint
 * Feature: 004-entra-external-id-auth - User Story 5
 * Tests: T088-T091 - Token validation with real Azure Functions context
 */
describe('Generate Token Authentication Integration', () => {
  beforeEach(() => {
    // Set test credentials for LiveKit
    process.env.LIVEKIT_API_KEY = 'APItest123';
    process.env.LIVEKIT_API_SECRET = 'testsecrettestsecrettestsecrettestse';

    // Set test credentials for Entra
    process.env.ENTRA_TENANT_ID = '03e82745-fdd7-4afd-b750-f7a4749a3775';
    process.env.ENTRA_CLIENT_ID = '4d072598-4248-45b0-be42-9a42e3bea85b';
    process.env.ENTRA_AUTHORITY = 'https://login.microsoftonline.com/03e82745-fdd7-4afd-b750-f7a4749a3775';
  });

  afterEach(() => {
    // Clean up environment
    delete process.env.LIVEKIT_API_KEY;
    delete process.env.LIVEKIT_API_SECRET;
    delete process.env.ENTRA_TENANT_ID;
    delete process.env.ENTRA_CLIENT_ID;
    delete process.env.ENTRA_AUTHORITY;
  });

  /**
   * T088: Create integration test for generateToken endpoint with real token validation
   * Note: This test is marked as pending because it requires a real Azure Entra token
   * or a complete mock infrastructure. For CI/CD, consider using environment-based
   * test tokens or mocking the Azure Entra validation service.
   */
  describe('T088: Real token validation', () => {
    it('should validate token structure and extract user identity', async () => {
      // This test would require a real token from Azure Entra
      // For now, we test the validation logic with a mock token structure

      // In a real scenario, you would:
      // 1. Obtain a test token from Azure Entra test environment
      // 2. Pass it to validateToken function
      // 3. Verify the result

      pending('Requires real Azure Entra test token or complete mock infrastructure');
    });
  });

  /**
   * T089: Test generateToken returns 401 for missing Authorization header
   */
  describe('T089: Missing Authorization header', () => {
    it('should return 401 error when Authorization header is missing', async () => {
      // Simulate Azure Functions HTTP request without auth header
      const mockRequest = {
        headers: new Map(),
        url: 'http://localhost:7071/api/generateToken',
        method: 'POST',
        body: {
          roomName: 'test-room',
          participantName: 'Test User'
        }
      } as any;

      const mockContext = {
        log: jest.fn()
      } as any;

      // Validate token with missing header
      const result = await validateToken(mockRequest, mockContext);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.error.code).toBe('missing_token');
      expect(result.error?.error.message).toContain('Authorization header');
    });

    it('should return structured error response with timestamp', async () => {
      const mockRequest = {
        headers: new Map(),
        url: 'http://localhost:7071/api/generateToken',
        method: 'POST'
      } as any;

      const mockContext = {
        log: jest.fn()
      } as any;

      const result = await validateToken(mockRequest, mockContext);

      expect(result.error?.timestamp).toBeDefined();
      expect(typeof result.error?.timestamp).toBe('string');
      // Should be valid ISO 8601 format
      expect(new Date(result.error!.timestamp).toISOString()).toBe(result.error!.timestamp);
    });
  });

  /**
   * T090: Test generateToken returns 401 for invalid token
   */
  describe('T090: Invalid token', () => {
    it('should return 401 error for malformed token', async () => {
      const headers = new Map();
      headers.set('authorization', 'Bearer invalid-token-format');

      const mockRequest = {
        headers,
        url: 'http://localhost:7071/api/generateToken',
        method: 'POST'
      } as any;

      const mockContext = {
        log: jest.fn()
      } as any;

      const result = await validateToken(mockRequest, mockContext);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.error.code).toBe('invalid_token');
    });

    it('should return 401 error for token with invalid signature', async () => {
      // Create a token-like string with invalid signature
      const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.invalid-signature';

      const headers = new Map();
      headers.set('authorization', `Bearer ${fakeToken}`);

      const mockRequest = {
        headers,
        url: 'http://localhost:7071/api/generateToken',
        method: 'POST'
      } as any;

      const mockContext = {
        log: jest.fn()
      } as any;

      const result = await validateToken(mockRequest, mockContext);

      expect(result.isValid).toBe(false);
      expect(result.error?.error.code).toBe('invalid_token');
    });

    it('should return 401 error for missing Bearer prefix', async () => {
      const headers = new Map();
      headers.set('authorization', 'some-token-without-bearer');

      const mockRequest = {
        headers,
        url: 'http://localhost:7071/api/generateToken',
        method: 'POST'
      } as any;

      const mockContext = {
        log: jest.fn()
      } as any;

      const result = await validateToken(mockRequest, mockContext);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  /**
   * T091: Test generateToken returns 200 with user identity for valid token
   * Note: This test is marked as pending because it requires a real Azure Entra token
   */
  describe('T091: Valid token with user identity', () => {
    it('should return 200 with user identity for valid token', async () => {
      // This test would require a real token from Azure Entra
      // The flow would be:
      // 1. Obtain valid test token from Azure Entra
      // 2. Call generateToken with valid auth header
      // 3. Verify response includes user identity in LiveKit token metadata

      pending('Requires real Azure Entra test token');
    });

    it('should extract correct user claims from valid token', () => {
      // Mock a decoded token with standard Azure AD claims
      const mockDecodedToken = {
        oid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        email: 'test@example.com',
        name: 'Test User',
        tid: '03e82745-fdd7-4afd-b750-f7a4749a3775',
        preferred_username: 'test@example.com'
      };

      const userIdentity = extractUserIdentity(mockDecodedToken);

      expect(userIdentity.userId).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
      expect(userIdentity.email).toBe('test@example.com');
      expect(userIdentity.displayName).toBe('Test User');
      expect(userIdentity.tenantId).toBe('03e82745-fdd7-4afd-b750-f7a4749a3775');
    });

    it('should handle missing optional claims gracefully', () => {
      // Token with minimal claims
      const mockDecodedToken = {
        oid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        name: 'Test User',
        tid: '03e82745-fdd7-4afd-b750-f7a4749a3775'
        // email and preferred_username missing
      };

      const userIdentity = extractUserIdentity(mockDecodedToken);

      expect(userIdentity.userId).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
      expect(userIdentity.displayName).toBe('Test User');
      expect(userIdentity.tenantId).toBe('03e82745-fdd7-4afd-b750-f7a4749a3775');
      // Email should be undefined or empty string
      expect(userIdentity.email).toBeDefined(); // Service should provide fallback
    });
  });
});
