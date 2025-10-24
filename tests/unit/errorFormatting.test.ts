/**
 * errorFormatting.test.ts
 * Unit tests for error formatting functions.
 */

import { formatValidationError } from '../../api/src/utils/validation';

// Import Zod from the api folder to match versions
import { z } from '../../api/node_modules/zod';

describe('Error Formatting', () => {
  describe('formatValidationError', () => {
    it('should format Zod error into ErrorResponse', () => {
      // Create a Zod schema and trigger a validation error
      const schema = z.object({
        name: z.string().min(1),
        age: z.number().min(18)
      });

      try {
        schema.parse({ name: '', age: 15 });
        fail('Should have thrown validation error');
      } catch (error) {
        if (error instanceof z.ZodError) {
          const result = formatValidationError(error);

          expect(result.statusCode).toBe(400);
          expect(result.errorCode).toBe('VALIDATION_ERROR');
          expect(result.message).toBe('Request validation failed');
          expect(result.validationErrors).toBeDefined();
          expect(result.validationErrors!.length).toBeGreaterThan(0);
          expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);

          // Check field names are present
          const fields = result.validationErrors!.map(e => e.field);
          expect(fields).toContain('name');
          expect(fields).toContain('age');
        } else {
          fail('Expected ZodError');
        }
      }
    });
  });
});
