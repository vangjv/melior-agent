import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timer, of } from 'rxjs';
import { retry, catchError, retryWhen, mergeMap, tap } from 'rxjs/operators';
import { TokenRequest, TokenResponse, TokenApiError } from '../models/token.model';
import { environment } from '../../environments/environment';

/**
 * Service interface for LiveKit token acquisition
 * Communicates with Azure Functions backend API (002-livekit-token-api)
 */
export interface ITokenService {
  /**
   * Generate a LiveKit access token via backend API
   * @param request Token request parameters
   * @returns Observable with token response
   * @throws TokenApiError on validation or server errors
   */
  generateToken(request: TokenRequest): Observable<TokenResponse>;

  /**
   * Validate token request before sending to backend
   * @param request Token request to validate
   * @returns Validation result with errors if invalid
   */
  validateTokenRequest(request: TokenRequest): { valid: boolean; errors: string[] };
}

/**
 * Token Service implementation
 * Handles secure token acquisition from backend API
 */
@Injectable({ providedIn: 'root' })
export class TokenService implements ITokenService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.tokenApiUrl;

  /**
   * Generate LiveKit access token from backend API
   */
  generateToken(request: TokenRequest): Observable<TokenResponse> {
    // Validate request before sending
    const validation = this.validateTokenRequest(request);
    if (!validation.valid) {
      const error: TokenApiError = {
        name: 'ValidationError',
        statusCode: 400,
        error: 'Bad Request',
        message: validation.errors.join(', '),
        details: { validation: validation.errors }
      };
      return throwError(() => error);
    }

    return this.http.post<TokenResponse>(`${this.apiUrl}/token`, request).pipe(
      retryWhen(errors =>
        errors.pipe(
          mergeMap((error: HttpErrorResponse, index) => {
            // Only retry on server errors (5xx) or network errors (0)
            const shouldRetry = (error.status === 0 || error.status >= 500) && index < 2;
            if (shouldRetry) {
              return timer(1000); // 1 second delay between retries
            }
            return throwError(() => error);
          })
        )
      ),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Validate token request parameters
   */
  validateTokenRequest(request: TokenRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Room name validation
    if (!request.roomName || request.roomName.trim() === '') {
      errors.push('Room name is required');
    } else if (!/^[a-zA-Z0-9_-]+$/.test(request.roomName)) {
      errors.push('Room name must contain only alphanumeric characters, dashes, and underscores');
    } else if (request.roomName.length > 128) {
      errors.push('Room name must be 128 characters or less');
    }

    // Participant identity validation
    if (!request.participantIdentity || request.participantIdentity.trim() === '') {
      errors.push('Participant identity is required');
    } else if (request.participantIdentity.length > 64) {
      errors.push('Participant identity must be 64 characters or less');
    }

    // Expiration validation (if provided)
    if (request.expirationMinutes !== undefined) {
      if (request.expirationMinutes < 1 || request.expirationMinutes > 1440) {
        errors.push('Expiration must be between 1 and 1440 minutes (24 hours)');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Handle HTTP errors from backend API
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    const tokenError: TokenApiError = {
      name: 'TokenApiError',
      statusCode: error.status,
      error: error.statusText,
      message: this.getErrorMessage(error),
      details: error.error?.details
    };

    return throwError(() => tokenError);
  }

  /**
   * Extract user-friendly error message from HTTP error
   */
  private getErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return 'Unable to connect to token service. Please verify the backend API is running.';
    }

    if (error.status === 400) {
      return error.error?.message || 'Invalid request. Please check your session details.';
    }

    if (error.status === 500) {
      return 'Token generation failed on server. Please try again later.';
    }

    return error.error?.message || 'An unexpected error occurred. Please try again.';
  }
}
