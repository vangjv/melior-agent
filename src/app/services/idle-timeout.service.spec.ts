/**
 * Idle Timeout Service - Unit Tests
 * Feature: 006-auto-disconnect-idle
 *
 * Tests for IdleTimeoutService timer logic and activity monitoring
 */

import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { IdleTimeoutService } from './idle-timeout.service';
import { ConversationStorageService } from './conversation-storage.service';
import { LiveKitConnectionService } from './livekit-connection.service';
import { INITIAL_IDLE_TIMER_STATE } from '../models/idle-timer-state';
import { DEFAULT_IDLE_TIMEOUT_CONFIG } from '../models/idle-timeout-config';

describe('IdleTimeoutService', () => {
  let service: IdleTimeoutService;
  let conversationService: jasmine.SpyObj<ConversationStorageService>;
  let connectionService: jasmine.SpyObj<LiveKitConnectionService>;

  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear();

    // Create spies for dependent services
    const conversationSpy = jasmine.createSpyObj('ConversationStorageService', [], {
      lastMessageAt: jasmine.createSpy('lastMessageAt').and.returnValue(null),
    });

    const connectionSpy = jasmine.createSpyObj('LiveKitConnectionService', ['disconnect']);

    TestBed.configureTestingModule({
      providers: [
        IdleTimeoutService,
        { provide: ConversationStorageService, useValue: conversationSpy },
        { provide: LiveKitConnectionService, useValue: connectionSpy },
      ],
    });

    service = TestBed.inject(IdleTimeoutService);
    conversationService = TestBed.inject(
      ConversationStorageService
    ) as jasmine.SpyObj<ConversationStorageService>;
    connectionService = TestBed.inject(
      LiveKitConnectionService
    ) as jasmine.SpyObj<LiveKitConnectionService>;
  });

  afterEach(() => {
    // Clean up timers and storage
    service.stopTimer();
    sessionStorage.clear();
  });

  describe('Initialization', () => {
    it('should create the service', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with inactive timer state', () => {
      const state = service.timerState();
      expect(state).toEqual(INITIAL_IDLE_TIMER_STATE);
    });

    it('should initialize with default configuration', () => {
      const config = service.config();
      expect(config).toEqual(DEFAULT_IDLE_TIMEOUT_CONFIG);
    });
  });

  describe('Timer Lifecycle - User Story 1', () => {
    it('should start timer when connection established', fakeAsync(() => {
      service.startTimer();

      const state = service.timerState();
      expect(state.isActive).toBe(true);
      expect(state.timeRemaining).toBe(DEFAULT_IDLE_TIMEOUT_CONFIG.durationSeconds);

      flush();
    }));

    it('should countdown timer every second', fakeAsync(() => {
      service.startTimer();

      const initialTime = service.timerState().timeRemaining;

      tick(1000); // 1 second
      expect(service.timerState().timeRemaining).toBe(initialTime - 1);

      tick(1000); // 2 seconds
      expect(service.timerState().timeRemaining).toBe(initialTime - 2);

      tick(1000); // 3 seconds
      expect(service.timerState().timeRemaining).toBe(initialTime - 3);

      flush();
    }));

    it('should reset timer when transcription received', fakeAsync(() => {
      service.startTimer();

      tick(10000); // 10 seconds elapsed
      expect(service.timerState().timeRemaining).toBe(
        DEFAULT_IDLE_TIMEOUT_CONFIG.durationSeconds - 10
      );

      service.resetTimer();

      expect(service.timerState().timeRemaining).toBe(
        DEFAULT_IDLE_TIMEOUT_CONFIG.durationSeconds
      );

      flush();
    }));

    it('should reset timer when chat message received', fakeAsync(() => {
      service.startTimer();

      tick(15000); // 15 seconds elapsed
      const timeBefore = service.timerState().timeRemaining;
      expect(timeBefore).toBeLessThan(DEFAULT_IDLE_TIMEOUT_CONFIG.durationSeconds);

      service.resetTimer();

      expect(service.timerState().timeRemaining).toBe(
        DEFAULT_IDLE_TIMEOUT_CONFIG.durationSeconds
      );

      flush();
    }));

    it('should call disconnect when timer reaches zero', fakeAsync(() => {
      connectionService.disconnect.and.returnValue(Promise.resolve());

      service.startTimer();

      // Fast forward to timeout (plus one more tick for the complete callback)
      tick(DEFAULT_IDLE_TIMEOUT_CONFIG.durationSeconds * 1000 + 1000);

      expect(connectionService.disconnect).toHaveBeenCalled();

      flush();
    }));

    it('should stop timer when manually disconnected', fakeAsync(() => {
      service.startTimer();

      tick(5000); // 5 seconds
      expect(service.timerState().isActive).toBe(true);

      service.stopTimer();

      expect(service.timerState().isActive).toBe(false);
      expect(service.timerState().timeRemaining).toBe(0);

      flush();
    }));

    it('should update lastActivity timestamp when timer resets', fakeAsync(() => {
      service.startTimer();

      const beforeReset = service.timerState().lastActivity;

      tick(5000);
      service.resetTimer();

      const afterReset = service.timerState().lastActivity;
      expect(afterReset).not.toBeNull();
      expect(afterReset).not.toEqual(beforeReset);

      flush();
    }));
  });

  describe('Configuration Validation - User Story 3', () => {
    it('should validate timeout duration is >= 30 seconds', () => {
      const result = service.updateConfig({
        durationSeconds: 29,
        warningThresholdSeconds: 10,
        enabled: true,
      });

      expect(result).not.toBeNull();
      expect(result?.field).toBe('durationSeconds');
    });

    it('should validate timeout duration is <= 3600 seconds', () => {
      const result = service.updateConfig({
        durationSeconds: 3601,
        warningThresholdSeconds: 30,
        enabled: true,
      });

      expect(result).not.toBeNull();
      expect(result?.field).toBe('durationSeconds');
    });

    it('should validate warningThreshold < durationSeconds', () => {
      const result = service.updateConfig({
        durationSeconds: 60,
        warningThresholdSeconds: 60,
        enabled: true,
      });

      expect(result).not.toBeNull();
      expect(result?.field).toBe('warningThresholdSeconds');
    });

    it('should return validation error for invalid config', () => {
      const result = service.updateConfig({
        durationSeconds: 10,
        warningThresholdSeconds: 30,
        enabled: true,
      });

      expect(result).not.toBeNull();
      expect(result?.reason).toContain('at least 30 seconds');
    });

    it('should save valid config to sessionStorage', () => {
      spyOn(sessionStorage, 'setItem');

      const validConfig = {
        durationSeconds: 180,
        warningThresholdSeconds: 30,
        enabled: true,
      };

      const result = service.updateConfig(validConfig);

      expect(result).toBeNull();
      expect(sessionStorage.setItem).toHaveBeenCalled();
    });

    it('should load config from sessionStorage on initialization', () => {
      const customConfig = {
        durationSeconds: 300,
        warningThresholdSeconds: 60,
        enabled: true,
      };

      sessionStorage.setItem(
        'melior-agent:idle-timeout-config',
        JSON.stringify(customConfig)
      );

      // Create a fresh TestBed and service instance to test loading
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          IdleTimeoutService,
          {
            provide: ConversationStorageService,
            useValue: jasmine.createSpyObj('ConversationStorageService', [], {
              lastMessageAt: jasmine.createSpy('lastMessageAt').and.returnValue(null),
            }),
          },
          {
            provide: LiveKitConnectionService,
            useValue: jasmine.createSpyObj('LiveKitConnectionService', ['disconnect']),
          },
        ],
      });

      const newService: IdleTimeoutService = TestBed.inject(IdleTimeoutService);

      expect(newService.config().durationSeconds).toBe(300);
      expect(newService.config().warningThresholdSeconds).toBe(60);
    });

    it('should use default config if sessionStorage is empty', () => {
      sessionStorage.clear();

      // Create a fresh TestBed and service instance
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          IdleTimeoutService,
          {
            provide: ConversationStorageService,
            useValue: jasmine.createSpyObj('ConversationStorageService', [], {
              lastMessageAt: jasmine.createSpy('lastMessageAt').and.returnValue(null),
            }),
          },
          {
            provide: LiveKitConnectionService,
            useValue: jasmine.createSpyObj('LiveKitConnectionService', ['disconnect']),
          },
        ],
      });

      const newService: IdleTimeoutService = TestBed.inject(IdleTimeoutService);

      expect(newService.config()).toEqual(DEFAULT_IDLE_TIMEOUT_CONFIG);
    });

    it('should apply custom timeout duration when configured', fakeAsync(() => {
      const customConfig = {
        durationSeconds: 60,
        warningThresholdSeconds: 15,
        enabled: true,
      };

      service.updateConfig(customConfig);
      service.startTimer();

      expect(service.timerState().timeRemaining).toBe(60);

      flush();
    }));
  });

  describe('Warning State - User Story 2', () => {
    it('should set isWarning true when timeRemaining <= 30', fakeAsync(() => {
      service.startTimer();

      // Fast forward to warning threshold
      tick((DEFAULT_IDLE_TIMEOUT_CONFIG.durationSeconds - 30) * 1000);

      expect(service.timerState().isWarning).toBe(true);

      flush();
    }));

    it('should set isWarning false when timeRemaining > 30', fakeAsync(() => {
      service.startTimer();

      tick(5000); // Just 5 seconds in

      expect(service.timerState().isWarning).toBe(false);

      flush();
    }));

    it('should update isWarning when timer resets during warning period', fakeAsync(() => {
      service.startTimer();

      // Fast forward to warning period
      tick((DEFAULT_IDLE_TIMEOUT_CONFIG.durationSeconds - 20) * 1000);
      expect(service.timerState().isWarning).toBe(true);

      // Reset timer
      service.resetTimer();

      // Should no longer be in warning
      expect(service.timerState().isWarning).toBe(false);

      flush();
    }));
  });

  describe('Formatted Time', () => {
    it('should format time as MM:SS', fakeAsync(() => {
      service.startTimer();
      expect(service.formattedTimeRemaining()).toBe('02:00'); // 120 seconds = 2:00
      flush();
    }));

    it('should format single digit seconds with leading zero', fakeAsync(() => {
      service.startTimer();
      tick(115000); // 115 seconds elapsed, 5 seconds remaining

      expect(service.formattedTimeRemaining()).toBe('00:05');

      flush();
    }));

    it('should format time correctly for values over 1 minute', fakeAsync(() => {
      const customConfig = {
        durationSeconds: 300,
        warningThresholdSeconds: 30,
        enabled: true,
      };

      service.updateConfig(customConfig);
      service.startTimer();

      expect(service.formattedTimeRemaining()).toBe('05:00');

      flush();
    }));
  });
});
