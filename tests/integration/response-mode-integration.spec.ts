/**
 * Integration tests for Response Mode Toggle feature
 * T059: Tests full mode toggle flow with mocked LiveKit Room and data channel
 */
import { TestBed } from '@angular/core/testing';
import { ResponseModeService } from '../../src/app/services/response-mode.service';
import { Room, RoomEvent, DataPacket_Kind } from 'livekit-client';

describe('Response Mode Integration Tests', () => {
  let service: ResponseModeService;
  let mockRoom: jasmine.SpyObj<Room>;
  let dataReceivedCallback: Function;

  beforeEach(() => {
    // Create comprehensive mock Room with all needed methods
    mockRoom = jasmine.createSpyObj<Room>(
      'Room',
      ['on', 'off'],
      {
        localParticipant: jasmine.createSpyObj('LocalParticipant', ['publishData']),
      }
    );

    // Capture the data received callback
    mockRoom.on.and.callFake((event: any, callback: any) => {
      if (event === RoomEvent.DataReceived) {
        dataReceivedCallback = callback;
      }
      return mockRoom;
    });

    TestBed.configureTestingModule({
      providers: [ResponseModeService],
    });

    service = TestBed.inject(ResponseModeService);
  });

  afterEach(() => {
    service.cleanup();
  });

  describe('Full mode toggle flow', () => {
    it('should complete full cycle: initialize -> send mode change -> receive confirmation', async () => {
      // Setup
      const publishDataSpy = mockRoom.localParticipant.publishData as jasmine.Spy;
      publishDataSpy.and.returnValue(Promise.resolve());

      // Step 1: Initialize service
      service.initialize(mockRoom);

      expect(service.isDataChannelAvailable()).toBe(true);
      expect(service.currentMode()).toBe('voice');
      expect(service.isConfirmed()).toBe(true);

      // Step 2: Request mode change to chat
      const setModePromise = service.setMode('chat');

      // Verify pending state
      expect(service.isConfirmed()).toBe(false);
      expect(service.isPending()).toBe(true);

      // Verify message was sent
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(publishDataSpy).toHaveBeenCalled();

      const callArgs = publishDataSpy.calls.mostRecent().args;
      const data = callArgs[0] as Uint8Array;
      const decoder = new TextDecoder();
      const message = JSON.parse(decoder.decode(data));

      expect(message.type).toBe('set_response_mode');
      expect(message.mode).toBe('chat');

      // Step 3: Simulate agent confirmation
      const confirmationMessage = {
        type: 'response_mode_updated',
        mode: 'chat',
      };
      const encoder = new TextEncoder();
      const confirmationData = encoder.encode(JSON.stringify(confirmationMessage));

      dataReceivedCallback(confirmationData, null, DataPacket_Kind.RELIABLE, null);

      // Step 4: Verify promise resolves and state updates
      await expectAsync(setModePromise).toBeResolved();

      expect(service.currentMode()).toBe('chat');
      expect(service.isConfirmed()).toBe(true);
      expect(service.isPending()).toBe(false);
      expect(service.errorMessage()).toBeNull();
    });

    it('should handle toggle mode correctly', async () => {
      const publishDataSpy = mockRoom.localParticipant.publishData as jasmine.Spy;
      publishDataSpy.and.returnValue(Promise.resolve());

      service.initialize(mockRoom);

      // Toggle from voice to chat
      const togglePromise1 = service.toggleMode();

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Simulate confirmation
      const chatConfirmation = {
        type: 'response_mode_updated',
        mode: 'chat',
      };
      const encoder = new TextEncoder();
      dataReceivedCallback(
        encoder.encode(JSON.stringify(chatConfirmation)),
        null,
        DataPacket_Kind.RELIABLE,
        null
      );

      await expectAsync(togglePromise1).toBeResolved();
      expect(service.currentMode()).toBe('chat');

      // Toggle from chat back to voice
      const togglePromise2 = service.toggleMode();

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Simulate confirmation
      const voiceConfirmation = {
        type: 'response_mode_updated',
        mode: 'voice',
      };
      dataReceivedCallback(
        encoder.encode(JSON.stringify(voiceConfirmation)),
        null,
        DataPacket_Kind.RELIABLE,
        null
      );

      await expectAsync(togglePromise2).toBeResolved();
      expect(service.currentMode()).toBe('voice');
    });

    it('should handle data channel unavailable gracefully', async () => {
      // Don't initialize service
      expect(service.isDataChannelAvailable()).toBe(false);

      // Attempt to set mode should throw
      await expectAsync(service.setMode('chat')).toBeRejectedWithError(
        'Data channel not available'
      );

      // State should remain unchanged
      expect(service.currentMode()).toBe('voice');
      expect(service.isConfirmed()).toBe(true);
    });

    it('should handle connection lifecycle correctly', async () => {
      // Initialize
      service.initialize(mockRoom);
      expect(service.isDataChannelAvailable()).toBe(true);

      // Cleanup (disconnect)
      service.cleanup();
      expect(service.isDataChannelAvailable()).toBe(false);
      expect(service.currentMode()).toBe('voice'); // Reset to default
      expect(service.isConfirmed()).toBe(true);

      // Re-initialize
      service.initialize(mockRoom);
      expect(service.isDataChannelAvailable()).toBe(true);
    });

    it('should clear pending operations on cleanup', async () => {
      const publishDataSpy = mockRoom.localParticipant.publishData as jasmine.Spy;
      publishDataSpy.and.returnValue(Promise.resolve());

      service.initialize(mockRoom);

      // Start mode change
      const setModePromise = service.setMode('chat');
      expect(service.isPending()).toBe(true);

      // Cleanup while pending
      service.cleanup();

      // Promise should reject
      await expectAsync(setModePromise).toBeRejectedWithError(
        /Service cleanup - connection closed/
      );

      // State should be reset
      expect(service.isPending()).toBe(false);
      expect(service.isConfirmed()).toBe(true);
    });

    it('should handle malformed messages without crashing', () => {
      service.initialize(mockRoom);

      // Send malformed JSON
      const encoder = new TextEncoder();
      const malformedData = encoder.encode('not valid json{]');

      // Should not throw
      expect(() => {
        dataReceivedCallback(malformedData, null, DataPacket_Kind.RELIABLE, null);
      }).not.toThrow();

      // State should remain unchanged
      expect(service.currentMode()).toBe('voice');
      expect(service.isConfirmed()).toBe(true);
    });

    it('should handle unknown message types gracefully', () => {
      service.initialize(mockRoom);

      const unknownMessage = {
        type: 'unknown_message_type',
        someData: 'value',
      };
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(unknownMessage));

      // Should not throw
      expect(() => {
        dataReceivedCallback(data, null, DataPacket_Kind.RELIABLE, null);
      }).not.toThrow();

      // State should remain unchanged
      expect(service.currentMode()).toBe('voice');
      expect(service.isConfirmed()).toBe(true);
    });

    it('should handle rapid mode changes correctly', async () => {
      const publishDataSpy = mockRoom.localParticipant.publishData as jasmine.Spy;
      publishDataSpy.and.returnValue(Promise.resolve());

      service.initialize(mockRoom);

      // First mode change
      const promise1 = service.setMode('chat');

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Second mode change before first is confirmed (should override)
      const promise2 = service.setMode('voice');

      // Only confirm the second mode change
      const encoder = new TextEncoder();
      const voiceConfirmation = {
        type: 'response_mode_updated',
        mode: 'voice',
      };
      dataReceivedCallback(
        encoder.encode(JSON.stringify(voiceConfirmation)),
        null,
        DataPacket_Kind.RELIABLE,
        null
      );

      // Second promise should resolve
      await expectAsync(promise2).toBeResolved();
      expect(service.currentMode()).toBe('voice');
      expect(service.isConfirmed()).toBe(true);
    });

    it('should handle AgentChatMessage (for User Story 3)', () => {
      service.initialize(mockRoom);

      const chatMessage = {
        type: 'chat_message',
        message: 'Hello from agent',
        timestamp: Date.now(),
      };
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(chatMessage));

      // Should not throw (handling will be added in US3)
      expect(() => {
        dataReceivedCallback(data, null, DataPacket_Kind.RELIABLE, null);
      }).not.toThrow();

      // Currently just logs, no state change expected
      expect(service.currentMode()).toBe('voice');
    });
  });

  describe('Error scenarios', () => {
    it('should handle publishData failure', async () => {
      const publishDataSpy = mockRoom.localParticipant.publishData as jasmine.Spy;
      publishDataSpy.and.returnValue(Promise.reject(new Error('Network error')));

      service.initialize(mockRoom);

      await expectAsync(service.setMode('chat')).toBeRejectedWithError(/Network error/);

      // Should revert to confirmed state
      expect(service.isConfirmed()).toBe(true);
      expect(service.errorMessage()).toContain('Failed to send mode change request');
    });

    it('should auto-clear error messages after 5 seconds', async () => {
      jasmine.clock().install();

      const publishDataSpy = mockRoom.localParticipant.publishData as jasmine.Spy;
      publishDataSpy.and.returnValue(Promise.reject(new Error('Test error')));

      service.initialize(mockRoom);

      try {
        await service.setMode('chat');
      } catch (error) {
        // Expected
      }

      expect(service.errorMessage()).toBeTruthy();

      // Fast-forward time
      jasmine.clock().tick(5000);

      expect(service.errorMessage()).toBeNull();

      jasmine.clock().uninstall();
    });
  });
});
