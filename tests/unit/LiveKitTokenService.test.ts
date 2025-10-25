/**
 * LiveKitTokenService.test.ts
 * Unit tests for LiveKit token generation service.
 *
 * These tests use interface-based mocking to avoid LiveKit SDK dependencies.
 */

import { LiveKitTokenService, ILiveKitTokenGenerator } from '../../api/src/services/LiveKitTokenService';describe('LiveKitTokenService', () => {
  let service: LiveKitTokenService;
  let mockGenerator: jest.Mocked<ILiveKitTokenGenerator>;

  beforeEach(() => {
    // Create mock token generator
    mockGenerator = {
      generateToken: jest.fn()
    };

    service = new LiveKitTokenService(mockGenerator);
  });

  describe('generateToken', () => {
    it('should generate a valid token for basic request', async () => {
      // Arrange
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-token';
      mockGenerator.generateToken.mockResolvedValue(mockToken);

      // Act
      const result = await service.generateToken('test-room', 'user-123');

      // Assert
      expect(mockGenerator.generateToken).toHaveBeenCalledWith(
        'test-room',
        'user-123',
        expect.objectContaining({
          expirationSeconds: 3600 // default
        })
      );
      expect(result.token).toBe(mockToken);
      expect(result.roomName).toBe('test-room');
      expect(result.participantIdentity).toBe('user-123');
      expect(result.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO 8601 format
    });

    it('should generate token with custom expiration', async () => {
      // Arrange
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-token';
      mockGenerator.generateToken.mockResolvedValue(mockToken);

      // Act
      const result = await service.generateToken('test-room', 'user-123', 7200);

      // Assert
      expect(mockGenerator.generateToken).toHaveBeenCalledWith(
        'test-room',
        'user-123',
        expect.objectContaining({
          expirationSeconds: 7200
        })
      );
      expect(result.token).toBe(mockToken);
    });

    it('should generate token with participant name', async () => {
      // Arrange
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-token';
      mockGenerator.generateToken.mockResolvedValue(mockToken);

      // Act
      const result = await service.generateToken('test-room', 'user-123', 3600, 'John Doe');

      // Assert
      expect(mockGenerator.generateToken).toHaveBeenCalledWith(
        'test-room',
        'user-123',
        expect.objectContaining({
          expirationSeconds: 3600,
          participantName: 'John Doe'
        })
      );
      expect(result.token).toBe(mockToken);
    });

    it('should calculate correct expiresAt timestamp', async () => {
      // Arrange
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-token';
      mockGenerator.generateToken.mockResolvedValue(mockToken);
      const expirationSeconds = 3600;

      // Act
      const beforeTime = Date.now();
      const result = await service.generateToken('test-room', 'user-123', expirationSeconds);
      const afterTime = Date.now();

      // Assert
      const expiresAtMs = new Date(result.expiresAt).getTime();
      const expectedMinMs = beforeTime + (expirationSeconds * 1000);
      const expectedMaxMs = afterTime + (expirationSeconds * 1000);

      expect(expiresAtMs).toBeGreaterThanOrEqual(expectedMinMs);
      expect(expiresAtMs).toBeLessThanOrEqual(expectedMaxMs);
    });

    it('should throw error when generator fails', async () => {
      // Arrange
      mockGenerator.generateToken.mockRejectedValue(new Error('SDK error'));

      // Act & Assert
      await expect(
        service.generateToken('test-room', 'user-123')
      ).rejects.toThrow('SDK error');
    });
  });
});
