import { Injectable, signal, computed, OnDestroy, effect } from '@angular/core';
import { MsalService, MsalBroadcastService } from '@azure/msal-angular';
import { EventMessage, EventType, InteractionStatus, AuthenticationResult, AuthError as MsalAuthError } from '@azure/msal-browser';
import { Subject, filter, takeUntil } from 'rxjs';
import { AuthenticationState, UserProfile, AuthError, AuthErrorCode, AuthStatus } from '../models/auth-state';

/**
 * Authentication service that wraps MSAL Angular and exposes reactive state via signals
 * Feature: 004-entra-external-id-auth (T093: Added screen reader announcements)
 *
 * This service:
 * - Bridges MSAL's RxJS observables to Angular Signals for reactive state management
 * - Provides sign-in/sign-out methods
 * - Handles authentication events and errors
 * - Exposes computed signals for derived auth state
 * - Announces auth state changes to screen readers via ARIA live regions
 */
@Injectable({ providedIn: 'root' })
export class AuthService implements OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private liveRegion: HTMLDivElement | null = null;

  // Private mutable state signal
  private readonly _authState = signal<AuthenticationState>({
    status: 'unauthenticated',
    user: null,
    error: null
  });

  // Public readonly state signal
  readonly authState = this._authState.asReadonly();

  // Computed signals for common auth checks
  readonly isAuthenticated = computed(() => this._authState().status === 'authenticated');
  readonly isLoading = computed(() => this._authState().status === 'authenticating');
  readonly currentUser = computed(() => this._authState().user);
  readonly authError = computed(() => this._authState().error);

  constructor(
    private msalService: MsalService,
    private msalBroadcastService: MsalBroadcastService
  ) {
    this.initialize();
    this.initializeLiveRegion();
    this.setupScreenReaderAnnouncements();
  }

  /**
   * Initialize ARIA live region for screen reader announcements
   * T093: Add screen reader announcements for auth state changes
   */
  private initializeLiveRegion(): void {
    if (typeof document === 'undefined') return; // Skip in SSR

    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.setAttribute('class', 'sr-only');
    this.liveRegion.style.position = 'absolute';
    this.liveRegion.style.left = '-10000px';
    this.liveRegion.style.width = '1px';
    this.liveRegion.style.height = '1px';
    this.liveRegion.style.overflow = 'hidden';
    document.body.appendChild(this.liveRegion);
  }

  /**
   * Setup effect to announce auth state changes to screen readers
   * T093: Add screen reader announcements for auth state changes
   */
  private setupScreenReaderAnnouncements(): void {
    effect(() => {
      const state = this._authState();
      this.announceAuthState(state);
    });
  }

  /**
   * Announce authentication state changes to screen readers
   * T093: Add screen reader announcements for auth state changes
   */
  private announceAuthState(state: AuthenticationState): void {
    if (!this.liveRegion) return;

    let message = '';

    switch (state.status) {
      case 'authenticating':
        message = 'Signing in, please wait';
        break;
      case 'authenticated':
        message = `Successfully signed in as ${state.user?.displayName || 'user'}`;
        break;
      case 'unauthenticated':
        message = 'Signed out successfully';
        break;
      case 'error':
        message = `Authentication error: ${state.error?.userMessage || 'Unknown error occurred'}`;
        break;
    }

    if (message) {
      // Clear and set message (forces screen reader announcement)
      this.liveRegion.textContent = '';
      setTimeout(() => {
        if (this.liveRegion) {
          this.liveRegion.textContent = message;
        }
      }, 100);
    }
  }

  /**
   * Initialize authentication state by checking MSAL accounts and subscribing to auth events
   */
  private initialize(): void {
    // Check initial auth status
    this.checkAuthStatus();

    // Subscribe to MSAL authentication events
    this.msalBroadcastService.msalSubject$
      .pipe(
        filter((msg: EventMessage) =>
          msg.eventType === EventType.LOGIN_SUCCESS ||
          msg.eventType === EventType.LOGOUT_SUCCESS ||
          msg.eventType === EventType.LOGIN_FAILURE ||
          msg.eventType === EventType.ACQUIRE_TOKEN_SUCCESS ||
          msg.eventType === EventType.ACQUIRE_TOKEN_FAILURE
        ),
        takeUntil(this.destroy$)
      )
      .subscribe((result: EventMessage) => {
        this.handleMsalEvent(result);
      });

    // Subscribe to interaction status (for loading state)
    this.msalBroadcastService.inProgress$
      .pipe(takeUntil(this.destroy$))
      .subscribe((status: InteractionStatus) => {
        if (status === InteractionStatus.None) {
          // Interaction complete, check auth status
          this.checkAuthStatus();
        } else if (status === InteractionStatus.Login || status === InteractionStatus.Logout) {
          // User-initiated authentication in progress, set loading state
          this._authState.set({
            status: 'authenticating',
            user: null,
            error: null
          });
        }
        // For other statuses like Startup, HandleRedirect, etc., don't change state
      });
  }

  /**
   * Check current authentication status by examining MSAL accounts
   *
   * @remarks
   * This method queries MSAL for all cached accounts and updates the auth state signal.
   * Called during initialization and after MSAL interactions complete.
   *
   * @public
   */
  checkAuthStatus(): void {
    const accounts = this.msalService.instance.getAllAccounts();

    if (accounts.length > 0) {
      // User is authenticated - use first account
      const account = accounts[0];
      const userProfile: UserProfile = {
        userId: account.localAccountId,  // oid claim
        email: account.username,
        displayName: account.name || account.username,
        username: account.username,
        tenantId: account.tenantId
      };

      this._authState.set({
        status: 'authenticated',
        user: userProfile,
        error: null
      });
    } else if (this._authState().status === 'authenticated') {
      // Was authenticated but no longer have account - sign out
      this._authState.set({
        status: 'unauthenticated',
        user: null,
        error: null
      });
    }
  }

  /**
   * Handle MSAL authentication events
   */
  private handleMsalEvent(event: EventMessage): void {
    switch (event.eventType) {
      case EventType.LOGIN_SUCCESS:
        if (event.payload as AuthenticationResult) {
          const result = event.payload as AuthenticationResult;
          const userProfile: UserProfile = {
            userId: result.account?.localAccountId || '',
            email: result.account?.username || '',
            displayName: result.account?.name || result.account?.username || '',
            username: result.account?.username || '',
            tenantId: result.account?.tenantId || ''
          };

          this._authState.set({
            status: 'authenticated',
            user: userProfile,
            error: null
          });
        }
        break;

      case EventType.LOGOUT_SUCCESS:
        this._authState.set({
          status: 'unauthenticated',
          user: null,
          error: null
        });
        break;

      case EventType.LOGIN_FAILURE:
        if (event.error) {
          this.handleAuthError(event.error as MsalAuthError);
        }
        break;

      case EventType.ACQUIRE_TOKEN_SUCCESS:
        // Token acquired successfully - ensure auth state is up to date
        this.checkAuthStatus();
        break;

      case EventType.ACQUIRE_TOKEN_FAILURE:
        if (event.error) {
          this.handleAuthError(event.error as MsalAuthError);
        }
        break;
    }
  }

  /**
   * Handle authentication errors and update state
   */
  private handleAuthError(msalError: MsalAuthError): void {
    const code = this.mapErrorCode(msalError);
    const userMessage = this.getUserFriendlyMessage(code);
    const retryable = this.isErrorRetryable(code);

    const authError: AuthError = {
      code,
      message: msalError.message || 'Unknown authentication error',
      userMessage,
      timestamp: new Date(),
      retryable
    };

    this._authState.set({
      status: 'error',
      user: null,
      error: authError
    });
  }

  /**
   * Map MSAL error to application error code
   */
  private mapErrorCode(msalError: MsalAuthError): AuthErrorCode {
    const errorMessage = msalError.message?.toLowerCase() || '';
    const errorCode = msalError.errorCode?.toLowerCase() || '';

    // User cancelled authentication
    if (errorCode.includes('user_cancelled') || errorCode.includes('user_canceled')) {
      return 'user_cancelled';
    }

    // Network errors
    if (errorCode.includes('network') || errorMessage.includes('network')) {
      return 'network_error';
    }

    // Invalid credentials
    if (errorCode.includes('invalid_grant') || errorMessage.includes('credentials')) {
      return 'invalid_credentials';
    }

    // Token expired
    if (errorCode.includes('token_expired') || errorMessage.includes('expired')) {
      return 'token_expired';
    }

    // Token refresh failed
    if (errorCode.includes('interaction_required') || errorCode.includes('consent_required')) {
      return 'token_refresh_failed';
    }

    // Configuration errors
    if (errorCode.includes('invalid_client') || errorCode.includes('invalid_configuration')) {
      return 'configuration_error';
    }

    // Default to unknown error
    return 'unknown_error';
  }

  /**
   * Get user-friendly error message for display
   */
  private getUserFriendlyMessage(code: AuthErrorCode): string {
    const messages: Record<AuthErrorCode, string> = {
      user_cancelled: 'You cancelled the sign-in process. Please try again if you want to continue.',
      network_error: 'Unable to connect to the authentication service. Please check your internet connection and try again.',
      invalid_credentials: 'The credentials provided were invalid. Please try signing in again.',
      token_expired: 'Your session has expired. Please sign in again to continue.',
      token_refresh_failed: 'Unable to refresh your session. Please sign in again.',
      configuration_error: 'There is a problem with the authentication configuration. Please contact support.',
      unknown_error: 'An unexpected error occurred during authentication. Please try again.'
    };

    return messages[code];
  }

  /**
   * Determine if error is retryable by user
   */
  private isErrorRetryable(code: AuthErrorCode): boolean {
    // Configuration errors are not retryable by user
    return code !== 'configuration_error';
  }

  /**
   * Sign in using Microsoft Entra redirect flow
   *
   * @remarks
   * Initiates the MSAL loginRedirect flow. User will be redirected to Microsoft's
   * authentication page and then back to the application. Auth state is automatically
   * updated when the redirect completes.
   *
   * Sets auth status to 'authenticating' during the redirect process.
   *
   * @public
   * @example
   * ```typescript
   * authService.signIn();
   * ```
   */
  signIn(): void {
    this._authState.set({
      status: 'authenticating',
      user: null,
      error: null
    });

    this.msalService.loginRedirect();
  }

  /**
   * Sign out using Microsoft Entra redirect flow
   *
   * @remarks
   * Initiates the MSAL logoutRedirect flow. Clears local authentication state and
   * redirects to Microsoft's sign-out endpoint, then back to the application's
   * postLogoutRedirectUri (configured in app.config.ts).
   *
   * @public
   * @example
   * ```typescript
   * authService.signOut();
   * ```
   */
  signOut(): void {
    this.msalService.logoutRedirect();
  }

  /**
   * Clean up subscriptions and live region on destroy
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Remove ARIA live region
    if (this.liveRegion && this.liveRegion.parentNode) {
      this.liveRegion.parentNode.removeChild(this.liveRegion);
      this.liveRegion = null;
    }
  }
}
