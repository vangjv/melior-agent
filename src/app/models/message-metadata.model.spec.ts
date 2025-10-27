/**
 * Unit Tests: Message Metadata Model
 * Feature: 005-unified-conversation
 */

import {
  MessageMetadata,
  MessageSource,
  createMessageMetadata,
  isValidMessageSource,
  calculateDeliveryLatency
} from './message-metadata.model';

describe('MessageMetadata Model', () => {
  describe('createMessageMetadata', () => {
    it('should create metadata with required fields', () => {
      const metadata = createMessageMetadata('livekit-transcription');

      expect(metadata.messageSource).toBe('livekit-transcription');
      expect(metadata.deliveryLatency).toBeUndefined();
    });

    it('should create metadata with delivery latency', () => {
      const metadata = createMessageMetadata('livekit-data-channel', 125);

      expect(metadata.messageSource).toBe('livekit-data-channel');
      expect(metadata.deliveryLatency).toBe(125);
    });

    it('should create metadata for all valid sources', () => {
      const sources: MessageSource[] = [
        'livekit-transcription',
        'livekit-data-channel',
        'local-echo',
        'storage-restored'
      ];

      sources.forEach(source => {
        const metadata = createMessageMetadata(source);
        expect(metadata.messageSource).toBe(source);
      });
    });
  });

  describe('isValidMessageSource', () => {
    it('should validate all valid message sources', () => {
      expect(isValidMessageSource('livekit-transcription')).toBe(true);
      expect(isValidMessageSource('livekit-data-channel')).toBe(true);
      expect(isValidMessageSource('local-echo')).toBe(true);
      expect(isValidMessageSource('storage-restored')).toBe(true);
    });

    it('should reject invalid message sources', () => {
      expect(isValidMessageSource('invalid-source')).toBe(false);
      expect(isValidMessageSource('unknown')).toBe(false);
      expect(isValidMessageSource('')).toBe(false);
    });

    it('should reject non-string values', () => {
      expect(isValidMessageSource(null)).toBe(false);
      expect(isValidMessageSource(undefined)).toBe(false);
      expect(isValidMessageSource(123)).toBe(false);
      expect(isValidMessageSource({})).toBe(false);
    });
  });

  describe('calculateDeliveryLatency', () => {
    it('should calculate latency between two dates', () => {
      const createdAt = new Date('2025-01-01T10:00:00.000Z');
      const displayedAt = new Date('2025-01-01T10:00:00.500Z');

      const latency = calculateDeliveryLatency(createdAt, displayedAt);

      expect(latency).toBe(500);
    });

    it('should use current time if displayedAt not provided', () => {
      const createdAt = new Date(Date.now() - 1000); // 1 second ago

      const latency = calculateDeliveryLatency(createdAt);

      expect(latency).toBeGreaterThanOrEqual(990);
      expect(latency).toBeLessThanOrEqual(1100);
    });

    it('should return zero for same timestamps', () => {
      const timestamp = new Date('2025-01-01T10:00:00.000Z');

      const latency = calculateDeliveryLatency(timestamp, timestamp);

      expect(latency).toBe(0);
    });

    it('should handle negative latency (future created date)', () => {
      const createdAt = new Date('2025-01-01T10:00:01.000Z');
      const displayedAt = new Date('2025-01-01T10:00:00.000Z');

      const latency = calculateDeliveryLatency(createdAt, displayedAt);

      expect(latency).toBe(-1000);
    });

    it('should calculate large latencies', () => {
      const createdAt = new Date('2025-01-01T10:00:00.000Z');
      const displayedAt = new Date('2025-01-01T10:05:00.000Z'); // 5 minutes later

      const latency = calculateDeliveryLatency(createdAt, displayedAt);

      expect(latency).toBe(300000); // 5 minutes in ms
    });
  });

  describe('MessageMetadata Interface', () => {
    it('should support all optional fields', () => {
      const metadata: MessageMetadata = {
        messageSource: 'livekit-transcription',
        deliveryLatency: 120,
        transcriptionModel: 'whisper-v3',
        dataChannelId: 'channel-123',
        networkLatency: 50,
        processingTime: 70
      };

      expect(metadata.messageSource).toBe('livekit-transcription');
      expect(metadata.deliveryLatency).toBe(120);
      expect(metadata.transcriptionModel).toBe('whisper-v3');
      expect(metadata.dataChannelId).toBe('channel-123');
      expect(metadata.networkLatency).toBe(50);
      expect(metadata.processingTime).toBe(70);
    });

    it('should support minimal metadata', () => {
      const metadata: MessageMetadata = {
        messageSource: 'local-echo'
      };

      expect(metadata.messageSource).toBe('local-echo');
      expect(metadata.deliveryLatency).toBeUndefined();
      expect(metadata.transcriptionModel).toBeUndefined();
      expect(metadata.dataChannelId).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small latencies', () => {
      const createdAt = new Date('2025-01-01T10:00:00.000Z');
      const displayedAt = new Date('2025-01-01T10:00:00.001Z');

      const latency = calculateDeliveryLatency(createdAt, displayedAt);

      expect(latency).toBe(1);
    });

    it('should handle zero latency', () => {
      const timestamp = new Date();

      const latency = calculateDeliveryLatency(timestamp, timestamp);

      expect(latency).toBe(0);
    });

    it('should create metadata with zero latency', () => {
      const metadata = createMessageMetadata('livekit-transcription', 0);

      expect(metadata.deliveryLatency).toBe(0);
    });
  });
});
