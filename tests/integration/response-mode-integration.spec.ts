/**
 * Integration tests for Response Mode Toggle feature
 * T059: Tests full mode toggle flow with mocked LiveKit Room and data channel
 * T115: Tests receiving chat messages and verifying display
 */
import { TestBed } from '@angular/core/testing';
import { ResponseModeService } from '../../src/app/services/response-mode.service';
import { ChatStorageService } from '../../src/app/services/chat-storage.service';
import { Room, RoomEvent, DataPacket_Kind } from 'livekit-client';

describe('Response Mode Integration Tests', () => {
  let service: ResponseModeService;
  let chatStorageService: ChatStorageService;
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
      providers: [ResponseModeService, ChatStorageService],
    });

    service = TestBed.inject(ResponseModeService);
    chatStorageService = TestBed.inject(ChatStorageService);
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

  describe('Chat message integration (User Story 3 - T115)', () => {
    it('should receive AgentChatMessage and store it in ChatStorageService', () => {
      service.initialize(mockRoom);

      // Initially no messages
      expect(chatStorageService.getHistory().length).toBe(0);

      // Simulate receiving a chat message from agent
      const chatMessage = {
        type: 'chat_message',
        message: 'Hello from the agent',
        timestamp: Date.now(),
      };
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(chatMessage));

      dataReceivedCallback(data, null, DataPacket_Kind.RELIABLE, null);

      // Verify message was added to chat storage
      const messages = chatStorageService.getHistory();
      expect(messages.length).toBe(1);
      expect(messages[0].content).toBe('Hello from the agent');
      expect(messages[0].sender).toBe('agent');
      expect(messages[0].timestamp).toBeDefined();
    });

    it('should handle multiple chat messages in sequence', () => {
      service.initialize(mockRoom);

      const encoder = new TextEncoder();

      // Send first message
      const message1 = {
        type: 'chat_message',
        message: 'First message',
        timestamp: Date.now(),
      };
      dataReceivedCallback(
        encoder.encode(JSON.stringify(message1)),
        null,
        DataPacket_Kind.RELIABLE,
        null
      );

      // Send second message
      const message2 = {
        type: 'chat_message',
        message: 'Second message',
        timestamp: Date.now() + 1000,
      };
      dataReceivedCallback(
        encoder.encode(JSON.stringify(message2)),
        null,
        DataPacket_Kind.RELIABLE,
        null
      );

      // Verify both messages are stored
      const messages = chatStorageService.getHistory();
      expect(messages.length).toBe(2);
      expect(messages[0].content).toBe('First message');
      expect(messages[1].content).toBe('Second message');
    });

    it('should clear chat history on cleanup', () => {
      service.initialize(mockRoom);

      // Add some messages
      const chatMessage = {
        type: 'chat_message',
        message: 'Test message',
        timestamp: Date.now(),
      };
      const encoder = new TextEncoder();
      dataReceivedCallback(
        encoder.encode(JSON.stringify(chatMessage)),
        null,
        DataPacket_Kind.RELIABLE,
        null
      );

      expect(chatStorageService.getHistory().length).toBe(1);

      // Cleanup should clear history
      service.cleanup();

      expect(chatStorageService.getHistory().length).toBe(0);
    });

    it('should handle chat messages with special characters correctly', () => {
      service.initialize(mockRoom);

      const specialMessage = {
        type: 'chat_message',
        message: 'Hello! How are you? 😊 I\'m here to help with "quotes" and <html>',
        timestamp: Date.now(),
      };
      const encoder = new TextEncoder();
      dataReceivedCallback(
        encoder.encode(JSON.stringify(specialMessage)),
        null,
        DataPacket_Kind.RELIABLE,
        null
      );

      const messages = chatStorageService.getHistory();
      expect(messages.length).toBe(1);
      expect(messages[0].content).toContain('😊');
      expect(messages[0].content).toContain('"quotes"');
      expect(messages[0].content).toContain('<html>');
    });
  });

  describe('Disconnect/reconnect cycle with mode persistence (User Story 4 - T131)', () => {
    const STORAGE_KEY = 'melior-agent-response-mode';

    beforeEach(() => {
      localStorage.clear();
    });

    afterEach(() => {
      localStorage.clear();
    });

    it('should persist mode preference across disconnect/reconnect cycle', (done) => {
      const publishDataSpy = mockRoom.localParticipant.publishData as jasmine.Spy;
      publishDataSpy.and.returnValue(Promise.resolve());

      // Initialize service
      service.initialize(mockRoom);

      // Change mode to chat
      const setModePromise = service.setMode('chat');

      setTimeout(() => {
        // Simulate confirmation
        const confirmMessage = {
          type: 'response_mode_updated',
          mode: 'chat',
        };
        const encoder = new TextEncoder();
        dataReceivedCallback(
          encoder.encode(JSON.stringify(confirmMessage)),
          null,
          DataPacket_Kind.RELIABLE,
          null
        );

        setTimeout(async () => {
          await setModePromise;

          // Verify mode is chat
          expect(service.currentMode()).toBe('chat');

          // Verify localStorage was updated
          expect(localStorage.getItem(STORAGE_KEY)).toBe('chat');

          // Disconnect
          service.cleanup();

          // Mode should reset to voice on disconnect
          expect(service.currentMode()).toBe('voice');
          expect(chatStorageService.getHistory().length).toBe(0);

          // But localStorage should still have chat preference
          expect(localStorage.getItem(STORAGE_KEY)).toBe('chat');

          // Reconnect - create new service instance to simulate fresh connection
          const newService = TestBed.inject(ResponseModeService);

          // Should load chat preference from localStorage
          expect(newService.currentMode()).toBe('chat');

          // Initialize with new connection
          newService.initialize(mockRoom);

          // Should auto-request the saved preference after 500ms
          setTimeout(() => {
            expect(publishDataSpy).toHaveBeenCalled();

            // Find the call that sent set_response_mode for chat
            const calls = publishDataSpy.calls.all();
            const chatModeCall = calls.find((call) => {
              const data = call.args[0] as Uint8Array;
              const decoder = new TextDecoder();
              const message = JSON.parse(decoder.decode(data));
              return message.type === 'set_response_mode' && message.mode === 'chat';
            });

            expect(chatModeCall).toBeDefined();

            newService.cleanup();
            done();
          }, 600);
        }, 50);
      }, 50);
    });

    it('should handle reconnection when localStorage has invalid value', () => {
      // Set invalid mode in localStorage
      localStorage.setItem(STORAGE_KEY, 'invalid-mode');

      // Create service - should fallback to default
      const newService = TestBed.inject(ResponseModeService);

      expect(newService.currentMode()).toBe('voice');
      expect(newService.isConfirmed()).toBe(true);

      newService.cleanup();
    });

    it('should clear chat history on disconnect even if mode is chat', (done) => {
      service.initialize(mockRoom);

      // Add chat messages
      const encoder = new TextEncoder();
      const message1 = {
        type: 'chat_message',
        message: 'Message 1',
        timestamp: Date.now(),
      };
      dataReceivedCallback(
        encoder.encode(JSON.stringify(message1)),
        null,
        DataPacket_Kind.RELIABLE,
        null
      );

      const message2 = {
        type: 'chat_message',
        message: 'Message 2',
        timestamp: Date.now(),
      };
      dataReceivedCallback(
        encoder.encode(JSON.stringify(message2)),
        null,
        DataPacket_Kind.RELIABLE,
        null
      );

      setTimeout(() => {
        expect(chatStorageService.getHistory().length).toBe(2);

        // Disconnect
        service.cleanup();

        // Chat history should be cleared
        expect(chatStorageService.getHistory().length).toBe(0);

        done();
      }, 50);
    });
  });
});
