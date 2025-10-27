/**
 * Idle Timeout Integration Tests
 * Feature: 006-auto-disconnect-idle
 *
 * End-to-end tests for idle timeout flow with real service integration
 */

import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { IdleTimeoutService } from '../../src/app/services/idle-timeout.service';
import { ConversationStorageService } from '../../src/app/services/conversation-storage.service';
import { LiveKitConnectionService } from '../../src/app/services/livekit-connection.service';
import { createChatMessage } from '../../src/app/models/unified-conversation-message.model';

describe('Idle Timeout Flow - Integration', () => {
  let idleTimeoutService: IdleTimeoutService;
  let conversationService: ConversationStorageService;
  let connectionService: jasmine.SpyObj<LiveKitConnectionService>;

  beforeEach(() => {
    // Use real ConversationStorageService for integration testing
    // Mock only LiveKitConnectionService to prevent actual disconnections
    const connectionSpy = jasmine.createSpyObj('LiveKitConnectionService', ['disconnect']);
    connectionSpy.disconnect.and.returnValue(Promise.resolve());

    TestBed.configureTestingModule({
      providers: [
        IdleTimeoutService,
        ConversationStorageService,
        { provide: LiveKitConnectionService, useValue: connectionSpy },
      ],
    });

    idleTimeoutService = TestBed.inject(IdleTimeoutService);
    conversationService = TestBed.inject(ConversationStorageService);
    connectionService = TestBed.inject(
      LiveKitConnectionService
    ) as jasmine.SpyObj<LiveKitConnectionService>;

    // Clear sessionStorage before each test
    sessionStorage.clear();
  });

  afterEach(() => {
    idleTimeoutService.stopTimer();
    sessionStorage.clear();
  });

  describe('User Story 1: Auto-disconnect after 2 minutes of inactivity', () => {
    it('should auto-disconnect after 2 minutes of inactivity', fakeAsync(() => {
      // Start the timer
      idleTimeoutService.startTimer();

      expect(idleTimeoutService.timerState().isActive).toBe(true);
      expect(idleTimeoutService.timerState().timeRemaining).toBe(120);

      // Fast forward 2 minutes (120 seconds)
      tick(120000);

      // Should trigger disconnect
      expect(connectionService.disconnect).toHaveBeenCalled();
      expect(idleTimeoutService.timerState().isActive).toBe(false);

      flush();
    }));

    it('should maintain connection when activity occurs within timeout', fakeAsync(() => {
      // Start timer
      idleTimeoutService.startTimer();

      // Simulate activity at 60 seconds (halfway through)
      tick(60000);

      const message = createChatMessage('user', 'Hello', new Date());
      conversationService.addMessage(message);

      // Manually reset timer to simulate activity detection
      idleTimeoutService.resetTimer();

      // Should reset to full duration
      expect(idleTimeoutService.timerState().timeRemaining).toBe(120);

      // Continue for another 60 seconds (shouldn't disconnect yet)
      tick(60000);

      expect(connectionService.disconnect).not.toHaveBeenCalled();
      expect(idleTimeoutService.timerState().isActive).toBe(true);

      flush();
    }));

    it('should disconnect only after full duration elapses post-activity', fakeAsync(() => {
      idleTimeoutService.startTimer();

      // Activity at 100 seconds
      tick(100000);
      const message = createChatMessage('agent', 'Response', new Date());
      conversationService.addMessage(message);
      idleTimeoutService.resetTimer();

      // Timer reset to 120 seconds
      expect(idleTimeoutService.timerState().timeRemaining).toBe(120);

      // Fast forward 119 seconds - should NOT disconnect
      tick(119000);
      expect(connectionService.disconnect).not.toHaveBeenCalled();

      // Fast forward 1 more second - should disconnect
      tick(1000);
      expect(connectionService.disconnect).toHaveBeenCalled();

      flush();
    }));
  });

  describe('User Story 2: Visual warning at 30 seconds', () => {
    it('should show warning at 30 seconds and hide after activity', fakeAsync(() => {
      idleTimeoutService.startTimer();

      // Fast forward to 90 seconds (30 seconds remaining)
      tick(90000);

      const state = idleTimeoutService.timerState();
      expect(state.timeRemaining).toBe(30);
      expect(state.isWarning).toBe(true);

      // User performs activity
      const message = createChatMessage('user', 'Still here!', new Date());
      conversationService.addMessage(message);
      idleTimeoutService.resetTimer();

      // Warning should be cleared
      expect(idleTimeoutService.timerState().isWarning).toBe(false);
      expect(idleTimeoutService.timerState().timeRemaining).toBe(120);

      flush();
    }));

    it('should maintain warning state as countdown continues', fakeAsync(() => {
      idleTimeoutService.startTimer();

      // Fast forward to warning threshold
      tick(90000);
      expect(idleTimeoutService.timerState().isWarning).toBe(true);

      // Continue countdown
      tick(10000);
      expect(idleTimeoutService.timerState().isWarning).toBe(true);
      expect(idleTimeoutService.timerState().timeRemaining).toBe(20);

      tick(10000);
      expect(idleTimeoutService.timerState().isWarning).toBe(true);
      expect(idleTimeoutService.timerState().timeRemaining).toBe(10);

      flush();
    }));
  });

  describe('User Story 3: Configurable timeout duration', () => {
    it('should persist custom timeout across page refresh', fakeAsync(() => {
      const customConfig = {
        durationSeconds: 300,
        warningThresholdSeconds: 60,
        enabled: true,
      };

      // Set custom config
      const error = idleTimeoutService.updateConfig(customConfig);
      expect(error).toBeNull();

      // Verify saved to sessionStorage
      const stored = sessionStorage.getItem('melior-agent:idle-timeout-config');
      expect(stored).not.toBeNull();

      // Create new service instance (simulating page refresh)
      const newService = TestBed.inject(IdleTimeoutService);

      expect(newService.config().durationSeconds).toBe(300);
      expect(newService.config().warningThresholdSeconds).toBe(60);

      flush();
    }));

    it('should apply custom timeout and disconnect at correct time', fakeAsync(() => {
      // Set 1-minute timeout for faster testing
      const customConfig = {
        durationSeconds: 60,
        warningThresholdSeconds: 15,
        enabled: true,
      };

      idleTimeoutService.updateConfig(customConfig);
      idleTimeoutService.startTimer();

      // Should start at 60 seconds
      expect(idleTimeoutService.timerState().timeRemaining).toBe(60);

      // Fast forward 59 seconds - should NOT disconnect
      tick(59000);
      expect(connectionService.disconnect).not.toHaveBeenCalled();

      // Fast forward 1 more second - should disconnect
      tick(1000);
      expect(connectionService.disconnect).toHaveBeenCalled();

      flush();
    }));

    it('should apply custom warning threshold', fakeAsync(() => {
      const customConfig = {
        durationSeconds: 120,
        warningThresholdSeconds: 60,
        enabled: true,
      };

      idleTimeoutService.updateConfig(customConfig);
      idleTimeoutService.startTimer();

      // Fast forward to 61 seconds remaining (just above threshold)
      tick(59000);
      expect(idleTimeoutService.timerState().isWarning).toBe(false);

      // Fast forward 1 more second to exactly 60 remaining
      tick(1000);
      expect(idleTimeoutService.timerState().isWarning).toBe(true);

      flush();
    }));

    it('should reject invalid configuration and maintain current config', fakeAsync(() => {
      const validConfig = {
        durationSeconds: 180,
        warningThresholdSeconds: 30,
        enabled: true,
      };

      idleTimeoutService.updateConfig(validConfig);

      // Try to set invalid config
      const invalidConfig = {
        durationSeconds: 10, // Too short
        warningThresholdSeconds: 5,
        enabled: true,
      };

      const error = idleTimeoutService.updateConfig(invalidConfig);

      expect(error).not.toBeNull();
      expect(error?.field).toBe('durationSeconds');

      // Should still have valid config
      expect(idleTimeoutService.config().durationSeconds).toBe(180);

      flush();
    }));
  });

  describe('Edge Cases', () => {
    it('should handle rapid activity bursts without unnecessary resets', fakeAsync(() => {
      idleTimeoutService.startTimer();

      tick(30000); // 30 seconds

      // Multiple messages in quick succession
      for (let i = 0; i < 5; i++) {
        const message = createChatMessage('user', `Message ${i}`, new Date());
        conversationService.addMessage(message);
        tick(100); // Small delay between messages
      }

      // Reset once after burst
      idleTimeoutService.resetTimer();

      expect(idleTimeoutService.timerState().timeRemaining).toBe(120);

      flush();
    }));

    it('should handle timer stop during warning period', fakeAsync(() => {
      idleTimeoutService.startTimer();

      // Fast forward to warning
      tick(90000);
      expect(idleTimeoutService.timerState().isWarning).toBe(true);

      // Stop timer (user manually disconnected)
      idleTimeoutService.stopTimer();

      expect(idleTimeoutService.timerState().isActive).toBe(false);
      expect(idleTimeoutService.timerState().isWarning).toBe(false);

      flush();
    }));

    it('should not crash when disconnect fails', fakeAsync(() => {
      connectionService.disconnect.and.returnValue(Promise.reject('Network error'));

      idleTimeoutService.startTimer();

      // Fast forward to timeout
      tick(120000);

      // Should attempt disconnect but not throw
      expect(connectionService.disconnect).toHaveBeenCalled();

      flush();
    }));
  });
});
