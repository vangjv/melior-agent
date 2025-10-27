/**
 * Unit Tests: Storage Migration Utility
 * Feature: 005-unified-conversation
 */

import {
  hasLegacyChatData,
  migrateLegacyMessage,
  migrateLegacyChatStorage,
  getUnifiedStorageKey,
  hasUnifiedStorage,
  loadWithMigrationFallback
} from './storage-migration.util';
import { ChatMessageState } from '../models/chat-message.model';

describe('Storage Migration Utility', () => {
  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear();
  });

  describe('hasLegacyChatData', () => {
    it('should return false when no legacy data exists', () => {
      expect(hasLegacyChatData()).toBe(false);
    });

    it('should return true when legacy data exists', () => {
      sessionStorage.setItem('chat-storage', '{"messages":[]}');

      expect(hasLegacyChatData()).toBe(true);
    });
  });

  describe('migrateLegacyMessage', () => {
    it('should migrate legacy message to unified format', () => {
      const legacyMessage: ChatMessageState = {
        id: 'old-id',
        content: 'Test message',
        timestamp: new Date('2025-01-01T10:00:00Z'),
        sender: 'user',
        isLocal: false
      };

      const migrated = migrateLegacyMessage(legacyMessage);

      expect(migrated.messageType).toBe('chat');
      expect(migrated.content).toBe('Test message');
      expect(migrated.sender).toBe('user');
      expect(migrated.timestamp).toEqual(legacyMessage.timestamp);
    });

    it('should generate new ID for migrated message', () => {
      const legacyMessage: ChatMessageState = {
        id: 'old-id',
        content: 'Test',
        timestamp: new Date(),
        sender: 'agent'
      };

      const migrated = migrateLegacyMessage(legacyMessage);

      expect(migrated.id).toBeTruthy();
      expect(migrated.id).not.toBe('old-id'); // New UUID generated
    });
  });

  describe('migrateLegacyChatStorage', () => {
    it('should return null when no legacy data exists', () => {
      const result = migrateLegacyChatStorage('session-123');

      expect(result).toBeNull();
    });

    it('should migrate empty legacy storage', () => {
      const legacyData = {
        messages: []
      };
      sessionStorage.setItem('chat-storage', JSON.stringify(legacyData));

      const migrated = migrateLegacyChatStorage('session-123');

      expect(migrated).not.toBeNull();
      expect(migrated!.sessionId).toBe('session-123');
      expect(migrated!.currentMode).toBe('chat');
      expect(migrated!.messages).toEqual([]);
      expect(migrated!.messageCount).toBe(0);
      expect(migrated!.lastMessageAt).toBeNull();
    });

    it('should migrate legacy storage with messages', () => {
      const legacyData = {
        messages: [
          {
            id: 'msg1',
            content: 'First message',
            timestamp: new Date('2025-01-01T10:00:00Z').toISOString(),
            sender: 'user',
            isLocal: false
          },
          {
            id: 'msg2',
            content: 'Second message',
            timestamp: new Date('2025-01-01T10:01:00Z').toISOString(),
            sender: 'agent',
            isLocal: false
          }
        ]
      };
      sessionStorage.setItem('chat-storage', JSON.stringify(legacyData));

      const migrated = migrateLegacyChatStorage('session-123');

      expect(migrated).not.toBeNull();
      expect(migrated!.messages.length).toBe(2);
      expect(migrated!.messages[0].content).toBe('First message');
      expect(migrated!.messages[0].messageType).toBe('chat');
      expect(migrated!.messages[1].content).toBe('Second message');
      expect(migrated!.messageCount).toBe(2);
      expect(migrated!.lastMessageAt).toEqual(new Date('2025-01-01T10:01:00Z'));
    });

    it('should handle legacy messages with Date objects', () => {
      const timestamp = new Date('2025-01-01T10:00:00Z');
      const legacyData = {
        messages: [
          {
            id: 'msg1',
            content: 'Test',
            timestamp, // Date object, not string
            sender: 'user' as const
          }
        ]
      };
      sessionStorage.setItem('chat-storage', JSON.stringify(legacyData, (key, value) => {
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      }));

      const migrated = migrateLegacyChatStorage('session-123');

      expect(migrated).not.toBeNull();
      expect(migrated!.messages[0].timestamp).toBeInstanceOf(Date);
    });

    it('should return null for invalid legacy data', () => {
      sessionStorage.setItem('chat-storage', 'invalid json');

      const migrated = migrateLegacyChatStorage('session-123');

      expect(migrated).toBeNull();
    });

    it('should return null for legacy data without messages array', () => {
      sessionStorage.setItem('chat-storage', '{"messages": "not-an-array"}');

      const migrated = migrateLegacyChatStorage('session-123');

      expect(migrated).toBeNull();
    });
  });

  describe('getUnifiedStorageKey', () => {
    it('should generate correct storage key', () => {
      const key = getUnifiedStorageKey('session-123');

      expect(key).toBe('melior-conversation-session-123');
    });

    it('should handle different session IDs', () => {
      expect(getUnifiedStorageKey('abc')).toBe('melior-conversation-abc');
      expect(getUnifiedStorageKey('123')).toBe('melior-conversation-123');
    });
  });

  describe('hasUnifiedStorage', () => {
    it('should return false when no unified storage exists', () => {
      expect(hasUnifiedStorage('session-123')).toBe(false);
    });

    it('should return true when unified storage exists', () => {
      const key = getUnifiedStorageKey('session-123');
      sessionStorage.setItem(key, '{"version":"1.0.0","messages":[]}');

      expect(hasUnifiedStorage('session-123')).toBe(true);
    });
  });

  describe('loadWithMigrationFallback', () => {
    it('should load unified storage if available', () => {
      const unifiedData = {
        version: '1.0.0',
        sessionId: 'session-123',
        currentMode: 'voice',
        messages: [],
        messageCount: 0,
        lastMessageAt: null
      };
      const key = getUnifiedStorageKey('session-123');
      sessionStorage.setItem(key, JSON.stringify(unifiedData));

      const loaded = loadWithMigrationFallback('session-123');

      expect(loaded).not.toBeNull();
      expect(loaded!.sessionId).toBe('session-123');
      expect(loaded!.currentMode).toBe('voice');
    });

    it('should migrate legacy data if no unified storage', () => {
      const legacyData = {
        messages: [
          {
            id: 'msg1',
            content: 'Legacy message',
            timestamp: new Date('2025-01-01T10:00:00Z').toISOString(),
            sender: 'user',
            isLocal: false
          }
        ]
      };
      sessionStorage.setItem('chat-storage', JSON.stringify(legacyData));

      const loaded = loadWithMigrationFallback('session-123');

      expect(loaded).not.toBeNull();
      expect(loaded!.sessionId).toBe('session-123');
      expect(loaded!.currentMode).toBe('chat'); // Migrated from legacy
      expect(loaded!.messages.length).toBe(1);
      expect(loaded!.messages[0].content).toBe('Legacy message');
    });

    it('should save migrated data to unified storage', () => {
      const legacyData = {
        messages: [{
          id: 'msg1',
          content: 'Test',
          timestamp: new Date().toISOString(),
          sender: 'user' as const
        }]
      };
      sessionStorage.setItem('chat-storage', JSON.stringify(legacyData));

      loadWithMigrationFallback('session-123');

      const key = getUnifiedStorageKey('session-123');
      const stored = sessionStorage.getItem(key);

      expect(stored).not.toBeNull();
      expect(sessionStorage.getItem('chat-storage')).toBeNull(); // Legacy removed
    });

    it('should return null if no data available', () => {
      const loaded = loadWithMigrationFallback('session-123');

      expect(loaded).toBeNull();
    });

    it('should handle corrupted unified storage gracefully', () => {
      const key = getUnifiedStorageKey('session-123');
      sessionStorage.setItem(key, 'corrupted data');

      const legacyData = {
        messages: [{
          id: 'msg1',
          content: 'Legacy',
          timestamp: new Date().toISOString(),
          sender: 'user' as const
        }]
      };
      sessionStorage.setItem('chat-storage', JSON.stringify(legacyData));

      const loaded = loadWithMigrationFallback('session-123');

      expect(loaded).not.toBeNull();
      expect(loaded!.messages.length).toBe(1);
    });
  });

  describe('Integration', () => {
    it('should handle complete migration flow', () => {
      // Setup legacy data
      const legacyData = {
        messages: [
          {
            id: 'msg1',
            content: 'User message',
            timestamp: new Date('2025-01-01T10:00:00Z').toISOString(),
            sender: 'user' as const,
            isLocal: false
          },
          {
            id: 'msg2',
            content: 'Agent response',
            timestamp: new Date('2025-01-01T10:01:00Z').toISOString(),
            sender: 'agent' as const,
            isLocal: false
          }
        ]
      };
      sessionStorage.setItem('chat-storage', JSON.stringify(legacyData));

      // First load should migrate
      const firstLoad = loadWithMigrationFallback('session-123');
      expect(firstLoad).not.toBeNull();
      expect(firstLoad!.messages.length).toBe(2);

      // Second load should use unified storage
      const secondLoad = loadWithMigrationFallback('session-123');
      expect(secondLoad).not.toBeNull();
      expect(secondLoad!.messages.length).toBe(2);
      expect(secondLoad!.sessionId).toBe('session-123');
    });
  });
});
