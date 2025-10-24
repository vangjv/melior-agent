/**
 * config.test.ts
 * Unit tests for configuration loading utilities.
 */

import { createMissingCredentialsError } from '../../api/src/utils/config';
import { ErrorCode } from '../../api/src/models/ErrorResponse';

describe('Configuration Utilities', () => {
  describe('createMissingCredentialsError', () => {
    it('should create properly formatted error response', () => {
      const errorResponse = createMissingCredentialsError();

      expect(errorResponse.statusCode).toBe(500);
      expect(errorResponse.errorCode).toBe(ErrorCode.MISSING_CREDENTIALS);
      expect(errorResponse.message).toContain('LIVEKIT_API_KEY');
      expect(errorResponse.message).toContain('LIVEKIT_API_SECRET');
      expect(errorResponse.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });
});
