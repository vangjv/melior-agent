/**
 * generateToken.test.ts
 * Integration tests for the LiveKit token generation with real SDK.
 *
 * These tests use the actual LiveKit SDK with test credentials
 * but do not connect to live servers.
 */

import { LiveKitTokenService, LiveKitTokenGenerator } from '../../api/src/services/LiveKitTokenService';

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
