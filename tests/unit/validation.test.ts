/**
 * validation.test.ts
 * Unit tests for request validation using Zod schema.
 */

import { validateTokenRequest } from '../../api/src/utils/validation';

describe('Token Request Validation', () => {
  describe('validateTokenRequest', () => {
    it('should accept valid request with all fields', () => {
      const validRequest = {
        roomName: 'test-room-123',
        participantIdentity: 'user-abc-456',
        expirationSeconds: 7200,
        participantName: 'John Doe'
      };

      const result = validateTokenRequest(validRequest);

      expect(result).toEqual(validRequest);
    });

    it('should accept valid request with minimal fields', () => {
      const minimalRequest = {
        roomName: 'test-room',
        participantIdentity: 'user-123'
      };

      const result = validateTokenRequest(minimalRequest);

      expect(result.roomName).toBe('test-room');
      expect(result.participantIdentity).toBe('user-123');
      expect(result.expirationSeconds).toBe(3600); // Default value
    });

    it('should reject missing roomName', () => {
      const invalidRequest = {
        participantIdentity: 'user-123'
      };

      expect(() => validateTokenRequest(invalidRequest)).toThrow();
    });

    it('should reject empty roomName', () => {
      const invalidRequest = {
        roomName: '',
        participantIdentity: 'user-123'
      };

      expect(() => validateTokenRequest(invalidRequest)).toThrow();
    });

    it('should reject missing participantIdentity', () => {
      const invalidRequest = {
        roomName: 'test-room'
      };

      expect(() => validateTokenRequest(invalidRequest)).toThrow();
    });

    it('should reject invalid roomName pattern', () => {
      const invalidRequest = {
        roomName: 'test room!', // Contains space and special char
        participantIdentity: 'user-123'
      };

      expect(() => validateTokenRequest(invalidRequest)).toThrow();
    });

    it('should reject invalid participantIdentity pattern', () => {
      const invalidRequest = {
        roomName: 'test-room',
        participantIdentity: 'user@123' // Contains invalid char
      };

      expect(() => validateTokenRequest(invalidRequest)).toThrow();
    });

    it('should reject roomName exceeding max length', () => {
      const invalidRequest = {
        roomName: 'a'.repeat(256), // 256 characters
        participantIdentity: 'user-123'
      };

      expect(() => validateTokenRequest(invalidRequest)).toThrow();
    });

    it('should reject expirationSeconds below minimum', () => {
      const invalidRequest = {
        roomName: 'test-room',
        participantIdentity: 'user-123',
        expirationSeconds: 59 // Below minimum of 60
      };

      expect(() => validateTokenRequest(invalidRequest)).toThrow();
    });

    it('should reject expirationSeconds above maximum', () => {
      const invalidRequest = {
        roomName: 'test-room',
        participantIdentity: 'user-123',
        expirationSeconds: 86401 // Above maximum of 86400
      };

      expect(() => validateTokenRequest(invalidRequest)).toThrow();
    });

    it('should reject non-integer expirationSeconds', () => {
      const invalidRequest = {
        roomName: 'test-room',
        participantIdentity: 'user-123',
        expirationSeconds: 3600.5 // Not an integer
      };

      expect(() => validateTokenRequest(invalidRequest)).toThrow();
    });
  });
});
