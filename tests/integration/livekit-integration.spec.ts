import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { LiveKitConnectionService } from '../../src/app/services/livekit-connection.service';
import { TokenService } from '../../src/app/services/token.service';
import { Room } from 'livekit-client';
import { environment } from '../../src/environments/environment';

describe('LiveKit Integration Tests', () => {
  let service: LiveKitConnectionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [LiveKitConnectionService, TokenService],
    });
    service = TestBed.inject(LiveKitConnectionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // T033: Integration test for token acquisition + connection flow
  describe('Token Acquisition and Connection Flow', () => {
    it('should obtain token from backend API then connect to LiveKit', async () => {
      const config = {
        serverUrl: environment.liveKitUrl,
        roomName: 'test-room',
        participantIdentity: 'test-user',
      };

      // Mock microphone permission
      spyOn(navigator.mediaDevices, 'getUserMedia').and.returnValue(
        Promise.resolve({
          getTracks: () => [{ stop: () => {} }],
        } as unknown as MediaStream)
      );

      // Start connection (will fail at LiveKit connection but that's OK for this test)
      const connectPromise = service.connect(config).catch(() => {
        // Expected to fail at LiveKit connection - we're testing token acquisition
      });

      // Expect HTTP POST to token API
      const req = httpMock.expectOne(`${environment.tokenApiUrl}/token`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        roomName: config.roomName,
        participantIdentity: config.participantIdentity,
        expirationMinutes: 60,
      });

      // Respond with mock token
      req.flush({
        token: 'mock-livekit-token',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        roomName: config.roomName,
        participantIdentity: config.participantIdentity,
      });

      await connectPromise;

      // Verify no pending HTTP requests
      httpMock.verify();
    });

    it('should handle backend API errors during token acquisition', async () => {
      const config = {
        serverUrl: environment.liveKitUrl,
        roomName: 'test-room',
        participantIdentity: 'test-user',
      };

      // Mock microphone permission
      spyOn(navigator.mediaDevices, 'getUserMedia').and.returnValue(
        Promise.resolve({
          getTracks: () => [{ stop: () => {} }],
        } as unknown as MediaStream)
      );

      // Start connection
      const connectPromise = service.connect(config);

      // Expect HTTP POST to token API
      const req = httpMock.expectOne(`${environment.tokenApiUrl}/token`);

      // Respond with error
      req.flush(
        { error: 'Bad Request', message: 'Invalid room name' },
        { status: 400, statusText: 'Bad Request' }
      );

      // Verify connection failed with appropriate error
      await expectAsync(connectPromise).toBeRejected();

      const state = service.connectionState();
      expect(state.status).toBe('error');
      if (state.status === 'error') {
        expect(state.error.code).toBe('AUTHENTICATION_FAILED');
      }
    });

    it('should retry on backend API server errors', async () => {
      const config = {
        serverUrl: environment.liveKitUrl,
        roomName: 'test-room',
        participantIdentity: 'test-user',
      };

      // Mock microphone permission
      spyOn(navigator.mediaDevices, 'getUserMedia').and.returnValue(
        Promise.resolve({
          getTracks: () => [{ stop: () => {} }],
        } as unknown as MediaStream)
      );

      // Start connection
      const connectPromise = service.connect(config).catch(() => {
        // Expected to fail after retries
      });

      // First attempt - server error
      const req1 = httpMock.expectOne(`${environment.tokenApiUrl}/token`);
      req1.flush(
        { error: 'Internal Server Error', message: 'Token generation failed' },
        { status: 500, statusText: 'Internal Server Error' }
      );

      // Wait for retry delay
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Second attempt - server error again
      const req2 = httpMock.expectOne(`${environment.tokenApiUrl}/token`);
      req2.flush(
        { error: 'Internal Server Error', message: 'Token generation failed' },
        { status: 500, statusText: 'Internal Server Error' }
      );

      await connectPromise;

      // Verify error state
      const state = service.connectionState();
      expect(state.status).toBe('error');
      if (state.status === 'error') {
        expect(state.error.code).toBe('SERVER_UNAVAILABLE');
      }
    });
  });

  // T025: Integration test for full connection flow
  describe('Full Connection Flow', () => {
    it('should complete full connect -> connected -> disconnect lifecycle', async () => {
      const config = {
        serverUrl: 'wss://test.livekit.cloud',
        token: 'test-token',
        roomName: 'test-room',
      };

      // Mock microphone permission
      spyOn(navigator.mediaDevices, 'getUserMedia').and.returnValue(
        Promise.resolve({
          getTracks: () => [{ stop: () => {} }],
        } as unknown as MediaStream)
      );

      // This test will be implemented fully after service implementation
      pending('Waiting for LiveKit connection service implementation');

      // Expected flow:
      // 1. Check initial state is disconnected
      // expect(service.connectionState().status).toBe('disconnected');

      // 2. Start connection
      // await service.connect(config);

      // 3. Verify connected state
      // expect(service.connectionState().status).toBe('connected');

      // 4. Disconnect
      // await service.disconnect();

      // 5. Verify disconnected state
      // expect(service.connectionState().status).toBe('disconnected');
    });

    it('should handle permission denial gracefully', async () => {
      const config = {
        serverUrl: 'wss://test.livekit.cloud',
        token: 'test-token',
        roomName: 'test-room',
      };

      const permissionError = new DOMException('Permission denied', 'NotAllowedError');
      spyOn(navigator.mediaDevices, 'getUserMedia').and.returnValue(
        Promise.reject(permissionError)
      );

      pending('Waiting for error handling implementation');

      // Expected flow:
      // try {
      //   await service.connect(config);
      //   fail('Should have thrown permission error');
      // } catch (error) {
      //   const state = service.connectionState();
      //   expect(state.status).toBe('error');
      //   if (state.status === 'error') {
      //     expect(state.error.code).toBe('PERMISSION_DENIED');
      //   }
      // }
    });

    it('should maintain connection quality monitoring during active session', async () => {
      pending('Waiting for connection quality monitoring implementation');

      // Expected behavior:
      // 1. Connect to room
      // 2. Verify connectionQuality signal is reactive
      // 3. Simulate quality change event from LiveKit
      // 4. Verify signal updated correctly
    });
  });

  // T051: Integration test for connect-disconnect lifecycle
  describe('Connect-Disconnect Lifecycle (User Story 3)', () => {
    it('should complete connect -> disconnect cycle and return to initial state', async () => {
      const config = {
        serverUrl: 'wss://test.livekit.cloud',
        token: 'test-token',
        roomName: 'test-room',
      };

      // This test requires actual LiveKit infrastructure
      pending('Requires LiveKit server infrastructure for integration testing');

      // Expected flow:
      // 1. Initial state should be disconnected
      // expect(service.connectionState().status).toBe('disconnected');

      // 2. Connect
      // await service.connect(config);
      // expect(service.connectionState().status).toBe('connected');

      // 3. Disconnect
      // await service.disconnect();
      // expect(service.connectionState().status).toBe('disconnected');

      // 4. Verify all resources cleaned up
      // expect(service['_room']).toBeUndefined();

      // 5. Verify can reconnect after disconnect
      // await service.connect(config);
      // expect(service.connectionState().status).toBe('connected');
    });

    it('should handle unexpected disconnections', async () => {
      pending('Requires LiveKit server infrastructure for integration testing');

      // Expected behavior:
      // 1. Establish connection
      // 2. Simulate network disconnection
      // 3. Verify state transitions to error or reconnecting
      // 4. Verify error message is user-friendly
    });
  });
});
