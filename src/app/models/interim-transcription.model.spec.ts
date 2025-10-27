/**
 * Unit Tests: Interim Transcription Model
 * Feature: 005-unified-conversation
 */

import {
  InterimTranscription,
  createInterimTranscription,
  validateInterimTranscription
} from './interim-transcription.model';

describe('InterimTranscription Model', () => {
  describe('createInterimTranscription', () => {
    it('should create interim transcription with required fields', () => {
      const interim = createInterimTranscription('user', 'Partial text');

      expect(interim.speaker).toBe('user');
      expect(interim.text).toBe('Partial text');
      expect(interim.timestamp).toBeInstanceOf(Date);
      expect(interim.confidence).toBeUndefined();
    });

    it('should create interim transcription with confidence', () => {
      const interim = createInterimTranscription('agent', 'Test', 0.85);

      expect(interim.confidence).toBe(0.85);
    });

    it('should accept empty text', () => {
      const interim = createInterimTranscription('user', '');

      expect(interim.text).toBe('');
    });

    it('should set timestamp to current time', () => {
      const before = Date.now();
      const interim = createInterimTranscription('user', 'Test');
      const after = Date.now();

      expect(interim.timestamp.getTime()).toBeGreaterThanOrEqual(before);
      expect(interim.timestamp.getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe('validateInterimTranscription', () => {
    it('should validate valid interim transcription', () => {
      const interim = createInterimTranscription('user', 'Test');

      expect(validateInterimTranscription(interim)).toBe(true);
    });

    it('should validate interim with confidence', () => {
      const interim = createInterimTranscription('agent', 'Test', 0.9);

      expect(validateInterimTranscription(interim)).toBe(true);
    });

    it('should validate empty text', () => {
      const interim = createInterimTranscription('user', '');

      expect(validateInterimTranscription(interim)).toBe(true);
    });

    it('should reject invalid speaker', () => {
      const interim: any = {
        speaker: 'invalid',
        text: 'Test',
        timestamp: new Date()
      };

      expect(validateInterimTranscription(interim)).toBe(false);
    });

    it('should reject missing speaker', () => {
      const interim: any = {
        text: 'Test',
        timestamp: new Date()
      };

      expect(validateInterimTranscription(interim)).toBe(false);
    });

    it('should reject non-string text', () => {
      const interim: any = {
        speaker: 'user',
        text: 123,
        timestamp: new Date()
      };

      expect(validateInterimTranscription(interim)).toBe(false);
    });

    it('should reject non-Date timestamp', () => {
      const interim: any = {
        speaker: 'user',
        text: 'Test',
        timestamp: '2025-01-01'
      };

      expect(validateInterimTranscription(interim)).toBe(false);
    });

    it('should reject invalid confidence value', () => {
      const interim1: any = {
        speaker: 'user',
        text: 'Test',
        timestamp: new Date(),
        confidence: -0.1
      };

      const interim2: any = {
        speaker: 'user',
        text: 'Test',
        timestamp: new Date(),
        confidence: 1.5
      };

      expect(validateInterimTranscription(interim1)).toBe(false);
      expect(validateInterimTranscription(interim2)).toBe(false);
    });

    it('should reject non-number confidence', () => {
      const interim: any = {
        speaker: 'user',
        text: 'Test',
        timestamp: new Date(),
        confidence: '0.9'
      };

      expect(validateInterimTranscription(interim)).toBe(false);
    });

    it('should accept edge case confidence values', () => {
      const interim0 = createInterimTranscription('user', 'Test', 0);
      const interim1 = createInterimTranscription('user', 'Test', 1);

      expect(validateInterimTranscription(interim0)).toBe(true);
      expect(validateInterimTranscription(interim1)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long text', () => {
      const longText = 'a'.repeat(10000);
      const interim = createInterimTranscription('user', longText);

      expect(interim.text.length).toBe(10000);
      expect(validateInterimTranscription(interim)).toBe(true);
    });

    it('should handle special characters in text', () => {
      const specialText = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`';
      const interim = createInterimTranscription('user', specialText);

      expect(interim.text).toBe(specialText);
      expect(validateInterimTranscription(interim)).toBe(true);
    });

    it('should handle unicode characters', () => {
      const unicodeText = '你好世界 🌍 مرحبا العالم';
      const interim = createInterimTranscription('agent', unicodeText);

      expect(interim.text).toBe(unicodeText);
      expect(validateInterimTranscription(interim)).toBe(true);
    });
  });
});
