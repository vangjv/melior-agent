import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TokenService } from './token.service';
import { TokenRequest, TokenResponse, TokenApiError } from '../models/token.model';
import { environment } from '../../environments/environment';

describe('TokenService', () => {
  let service: TokenService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TokenService]
    });
    service = TestBed.inject(TokenService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('generateToken() - Success Scenarios', () => {
    it('should successfully generate token with valid request', (done) => {
      const request: TokenRequest = {
        roomName: 'test-room',
        participantIdentity: 'user-123'
      };

      const mockResponse: TokenResponse = {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        roomName: 'test-room',
        participantIdentity: 'user-123'
      };

      service.generateToken(request).subscribe({
        next: (response) => {
          expect(response).toEqual(mockResponse);
          expect(response.token).toBeTruthy();
          expect(response.roomName).toBe(request.roomName);
          expect(response.participantIdentity).toBe(request.participantIdentity);
          done();
        },
        error: (error) => {
          fail(`Should not have failed: ${error.message}`);
        }
      });

      const req = httpMock.expectOne(`${environment.tokenApiUrl}/token`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);
      req.flush(mockResponse);
    });

    it('should include optional expirationMinutes in request', (done) => {
      const request: TokenRequest = {
        roomName: 'test-room',
        participantIdentity: 'user-123',
        expirationMinutes: 30
      };

      const mockResponse: TokenResponse = {
        token: 'mock-token',
        expiresAt: new Date(Date.now() + 1800000).toISOString(),
        roomName: 'test-room',
        participantIdentity: 'user-123'
      };

      service.generateToken(request).subscribe({
        next: (response) => {
          expect(response.expiresAt).toBeTruthy();
          done();
        }
      });

      const req = httpMock.expectOne(`${environment.tokenApiUrl}/token`);
      expect(req.request.body.expirationMinutes).toBe(30);
      req.flush(mockResponse);
    });
  });

  describe('generateToken() - 400 Validation Errors', () => {
    it('should handle 400 Bad Request with validation errors', (done) => {
      const request: TokenRequest = {
        roomName: '',  // Invalid: empty
        participantIdentity: 'user-123'
      };

      service.generateToken(request).subscribe({
        next: () => {
          fail('Should have thrown validation error');
        },
        error: (error: TokenApiError) => {
          expect(error.statusCode).toBe(400);
          expect(error.message).toContain('Room name is required');
          expect(error.details).toBeDefined();
          done();
        }
      });

      // No HTTP call should be made for client-side validation
      httpMock.expectNone(`${environment.tokenApiUrl}/token`);
    });

    it('should handle invalid room name characters', (done) => {
      const request: TokenRequest = {
        roomName: 'test room!@#',  // Invalid: special chars
        participantIdentity: 'user-123'
      };

      service.generateToken(request).subscribe({
        next: () => {
          fail('Should have thrown validation error');
        },
        error: (error: TokenApiError) => {
          expect(error.statusCode).toBe(400);
          expect(error.message).toContain('alphanumeric');
          done();
        }
      });

      httpMock.expectNone(`${environment.tokenApiUrl}/token`);
    });

    it('should handle backend 400 error with details', fakeAsync(() => {
      const request: TokenRequest = {
        roomName: 'test-room',
        participantIdentity: 'user-123'
      };

      const mockError = {
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid room configuration',
        details: {
          roomName: ['Room does not exist']
        }
      };

      let result: any;
      let error: TokenApiError | undefined;

      service.generateToken(request).subscribe({
        next: (response) => {
          result = response;
        },
        error: (err: TokenApiError) => {
          error = err;
        }
      });

      const req = httpMock.expectOne(`${environment.tokenApiUrl}/token`);
      req.flush(mockError, { status: 400, statusText: 'Bad Request' });
      tick();

      expect(error).toBeDefined();
      expect(error?.statusCode).toBe(400);
      expect(error?.message).toContain('Invalid room');
      expect(error?.details).toEqual(mockError.details);
      expect(result).toBeUndefined();
    }));
  });

  describe('generateToken() - 500 Server Errors with Retry', () => {
    it('should retry on 500 error and eventually succeed', fakeAsync(() => {
      const request: TokenRequest = {
        roomName: 'test-room',
        participantIdentity: 'user-123'
      };

      const mockResponse: TokenResponse = {
        token: 'mock-token',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        roomName: 'test-room',
        participantIdentity: 'user-123'
      };

      let result: TokenResponse | undefined;
      let error: any;

      service.generateToken(request).subscribe({
        next: (response) => {
          result = response;
        },
        error: (err) => {
          error = err;
        }
      });

      // First attempt - fails
      let req = httpMock.expectOne(`${environment.tokenApiUrl}/token`);
      req.flush({ message: 'Internal server error' }, { status: 500, statusText: 'Internal Server Error' });
      tick(1000);

      // Second attempt - fails
      req = httpMock.expectOne(`${environment.tokenApiUrl}/token`);
      req.flush({ message: 'Internal server error' }, { status: 500, statusText: 'Internal Server Error' });
      tick(1000);

      // Third attempt - succeeds
      req = httpMock.expectOne(`${environment.tokenApiUrl}/token`);
      req.flush(mockResponse);
      tick();

      expect(result).toBeDefined();
      expect(result?.token).toBe('mock-token');
      expect(error).toBeUndefined();
    }));

    it('should fail after max retries with 500 error', fakeAsync(() => {
      const request: TokenRequest = {
        roomName: 'test-room',
        participantIdentity: 'user-123'
      };

      let result: any;
      let error: TokenApiError | undefined;

      service.generateToken(request).subscribe({
        next: (response) => {
          result = response;
        },
        error: (err: TokenApiError) => {
          error = err;
        }
      });

      // Fail all 3 attempts (1 initial + 2 retries)
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne(`${environment.tokenApiUrl}/token`);
        req.flush({ message: 'Server error' }, { status: 500, statusText: 'Internal Server Error' });
        tick(1000);
      }

      expect(error).toBeDefined();
      expect(error?.statusCode).toBe(500);
      expect(error?.message).toContain('Token generation failed');
      expect(result).toBeUndefined();
    }));

    it('should handle network errors with user-friendly message', fakeAsync(() => {
      const request: TokenRequest = {
        roomName: 'test-room',
        participantIdentity: 'user-123'
      };

      let result: any;
      let error: TokenApiError | undefined;

      service.generateToken(request).subscribe({
        next: (response) => {
          result = response;
        },
        error: (err: TokenApiError) => {
          error = err;
        }
      });

      // Network error will be retried 2 times (3 attempts total)
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne(`${environment.tokenApiUrl}/token`);
        req.error(new ProgressEvent('error'));
        tick(1000);
      }

      expect(error).toBeDefined();
      expect(error?.statusCode).toBe(0);
      expect(error?.message).toContain('Unable to connect');
      expect(result).toBeUndefined();
    }));
  });

  describe('validateTokenRequest()', () => {
    it('should validate correct request', () => {
      const request: TokenRequest = {
        roomName: 'test-room',
        participantIdentity: 'user-123'
      };

      const result = service.validateTokenRequest(request);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject empty room name', () => {
      const request: TokenRequest = {
        roomName: '',
        participantIdentity: 'user-123'
      };

      const result = service.validateTokenRequest(request);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Room name is required');
    });

    it('should reject invalid room name characters', () => {
      const request: TokenRequest = {
        roomName: 'test room!',
        participantIdentity: 'user-123'
      };

      const result = service.validateTokenRequest(request);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('alphanumeric'))).toBe(true);
    });

    it('should reject room name exceeding 128 characters', () => {
      const request: TokenRequest = {
        roomName: 'a'.repeat(129),
        participantIdentity: 'user-123'
      };

      const result = service.validateTokenRequest(request);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('128 characters'))).toBe(true);
    });

    it('should reject empty participant identity', () => {
      const request: TokenRequest = {
        roomName: 'test-room',
        participantIdentity: ''
      };

      const result = service.validateTokenRequest(request);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Participant identity is required');
    });

    it('should reject invalid expiration minutes', () => {
      const request: TokenRequest = {
        roomName: 'test-room',
        participantIdentity: 'user-123',
        expirationMinutes: 2000  // Exceeds max
      };

      const result = service.validateTokenRequest(request);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('1440 minutes'))).toBe(true);
    });
  });
});
