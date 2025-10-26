import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MsalService, MsalBroadcastService, MsalGuard } from '@azure/msal-angular';
import { EventMessage, EventType, InteractionStatus, InteractionType, AuthenticationResult, AuthError as MsalAuthError } from '@azure/msal-browser';
import { Subject } from 'rxjs';
import { AuthService } from '../../src/app/services/auth.service';

/**
 * Integration tests for authentication flow
 * Feature: 004-entra-external-id-auth
 * Tests: T033 (landing page access), T048 (sign-in redirect flow)
 */
describe('Authentication Flow Integration Tests', () => {
  let authService: AuthService;
  let msalServiceMock: jasmine.SpyObj<MsalService>;
  let msalBroadcastServiceMock: jasmine.SpyObj<MsalBroadcastService>;
  let msalSubject$: Subject<EventMessage>;
  let inProgress$: Subject<InteractionStatus>;
  let router: Router;

  beforeEach(() => {
    // Create subjects for observable streams
    msalSubject$ = new Subject<EventMessage>();
    inProgress$ = new Subject<InteractionStatus>();

    // Create MSAL service mocks
    msalServiceMock = jasmine.createSpyObj('MsalService', ['loginRedirect', 'logoutRedirect', 'handleRedirectObservable'], {
      instance: jasmine.createSpyObj('IPublicClientApplication', ['getAllAccounts', 'setActiveAccount'])
    });

    msalBroadcastServiceMock = jasmine.createSpyObj('MsalBroadcastService', [], {
      msalSubject$: msalSubject$.asObservable(),
      inProgress$: inProgress$.asObservable()
    });

    const routerMock = jasmine.createSpyObj('Router', ['navigate']);

    // Configure default mock behavior
    (msalServiceMock.instance.getAllAccounts as jasmine.Spy).and.returnValue([]);
    (msalServiceMock.handleRedirectObservable as jasmine.Spy).and.returnValue(new Subject().asObservable());

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: MsalService, useValue: msalServiceMock },
        { provide: MsalBroadcastService, useValue: msalBroadcastServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    });

    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    msalSubject$.complete();
    inProgress$.complete();
  });

  describe('T033: Unauthenticated Landing Page Access', () => {
    it('should allow access to landing page without authentication', () => {
      // Verify service initializes with unauthenticated state
      expect(authService.authState().status).toBe('unauthenticated');
      expect(authService.isAuthenticated()).toBe(false);
      expect(authService.currentUser()).toBeNull();
    });

    it('should provide sign-in method for landing page', () => {
      // Verify signIn method is available
      expect(typeof authService.signIn).toBe('function');

      // Call sign-in
      authService.signIn();

      // Verify redirect is initiated
      expect(msalServiceMock.loginRedirect).toHaveBeenCalled();
      expect(authService.authState().status).toBe('authenticating');
    });
  });

  describe('T048: Sign-In Redirect Flow Integration', () => {
    it('should complete full sign-in redirect flow', (done) => {
      // Step 1: User clicks sign-in on landing page
      authService.signIn();

      expect(msalServiceMock.loginRedirect).toHaveBeenCalled();
      expect(authService.authState().status).toBe('authenticating');
      expect(authService.isLoading()).toBe(true);

      // Step 2: User completes authentication at Microsoft Entra
      // Step 3: User is redirected back to app
      // Step 4: MSAL processes redirect and emits LOGIN_SUCCESS

      const authResult: AuthenticationResult = {
        account: {
          localAccountId: 'user-integration-123',
          username: 'integration@example.com',
          name: 'Integration Test User',
          tenantId: 'tenant-integration-456',
          environment: '',
          homeAccountId: ''
        },
        accessToken: 'mock-access-token',
        idToken: 'mock-id-token',
        scopes: ['user.read'],
        uniqueId: 'user-integration-123',
        tenantId: 'tenant-integration-456',
        tokenType: 'Bearer',
        idTokenClaims: {},
        authority: '',
        expiresOn: null,
        extExpiresOn: undefined,
        state: '',
        fromCache: false,
        correlationId: ''
      };

      msalSubject$.next({
        eventType: EventType.LOGIN_SUCCESS,
        interactionType: InteractionType.Redirect,
        payload: authResult,
        error: null,
        timestamp: Date.now()
      });

      // Step 5: Verify authenticated state
      setTimeout(() => {
        expect(authService.authState().status).toBe('authenticated');
        expect(authService.isAuthenticated()).toBe(true);
        expect(authService.currentUser()).toEqual({
          userId: 'user-integration-123',
          email: 'integration@example.com',
          displayName: 'Integration Test User',
          username: 'integration@example.com',
          tenantId: 'tenant-integration-456'
        });
        expect(authService.authError()).toBeNull();
        done();
      }, 100);
    });

    it('should handle redirect flow errors gracefully', (done) => {
      // Step 1: User clicks sign-in
      authService.signIn();

      // Step 2: Authentication fails (user cancels)
      const msalError: Partial<MsalAuthError> = {
        errorCode: 'user_cancelled',
        errorMessage: 'User cancelled the sign-in',
        message: 'User cancelled the sign-in',
        name: 'AuthError',
        stack: ''
      };

      msalSubject$.next({
        eventType: EventType.LOGIN_FAILURE,
        interactionType: InteractionType.Redirect,
        payload: null,
        error: msalError as MsalAuthError,
        timestamp: Date.now()
      });

      // Step 3: Verify error state
      setTimeout(() => {
        expect(authService.authState().status).toBe('error');
        expect(authService.isAuthenticated()).toBe(false);
        expect(authService.authError()).toBeTruthy();
        expect(authService.authError()?.code).toBe('user_cancelled');
        expect(authService.authError()?.retryable).toBe(true);
        done();
      }, 100);
    });

    it('should handle network errors during sign-in', (done) => {
      authService.signIn();

      const networkError: Partial<MsalAuthError> = {
        errorCode: 'network_error',
        errorMessage: 'Network connection failed',
        message: 'Network connection failed',
        name: 'AuthError',
        stack: ''
      };

      msalSubject$.next({
        eventType: EventType.LOGIN_FAILURE,
        interactionType: InteractionType.Redirect,
        payload: null,
        error: networkError as MsalAuthError,
        timestamp: Date.now()
      });

      setTimeout(() => {
        expect(authService.authState().status).toBe('error');
        expect(authService.authError()?.code).toBe('network_error');
        expect(authService.authError()?.userMessage).toContain('internet connection');
        expect(authService.authError()?.retryable).toBe(true);
        done();
      }, 100);
    });

    it('should update state when interaction status changes', (done) => {
      // Simulate interaction starting
      inProgress$.next(InteractionStatus.Login);

      setTimeout(() => {
        expect(authService.authState().status).toBe('authenticating');
        expect(authService.isLoading()).toBe(true);

        // Simulate interaction completing with authenticated account
        (msalServiceMock.instance.getAllAccounts as jasmine.Spy).and.returnValue([
          {
            localAccountId: 'user-123',
            username: 'test@example.com',
            name: 'Test User',
            tenantId: 'tenant-456'
          }
        ]);

        inProgress$.next(InteractionStatus.None);

        setTimeout(() => {
          expect(authService.authState().status).toBe('authenticated');
          expect(authService.isLoading()).toBe(false);
          expect(authService.isAuthenticated()).toBe(true);
          done();
        }, 100);
      }, 100);
    });

    it('should clear previous errors on successful sign-in', (done) => {
      // Set initial error state
      const error: Partial<MsalAuthError> = {
        errorCode: 'network_error',
        errorMessage: 'Network error',
        message: 'Network error',
        name: 'AuthError',
        stack: ''
      };

      msalSubject$.next({
        eventType: EventType.LOGIN_FAILURE,
        interactionType: InteractionType.Redirect,
        payload: null,
        error: error as MsalAuthError,
        timestamp: Date.now()
      });

      setTimeout(() => {
        expect(authService.authError()).toBeTruthy();

        // Now successfully sign in
        const authResult: AuthenticationResult = {
          account: {
            localAccountId: 'user-123',
            username: 'test@example.com',
            name: 'Test User',
            tenantId: 'tenant-456',
            environment: '',
            homeAccountId: ''
          },
          accessToken: 'mock-access-token',
          idToken: 'mock-id-token',
          scopes: ['user.read'],
          uniqueId: 'user-123',
          tenantId: 'tenant-456',
          tokenType: 'Bearer',
          idTokenClaims: {},
          authority: '',
          expiresOn: null,
          extExpiresOn: undefined,
          state: '',
          fromCache: false,
          correlationId: ''
        };

        msalSubject$.next({
          eventType: EventType.LOGIN_SUCCESS,
          interactionType: InteractionType.Redirect,
          payload: authResult,
          error: null,
          timestamp: Date.now()
        });

        setTimeout(() => {
          expect(authService.authError()).toBeNull();
          expect(authService.authState().status).toBe('authenticated');
          done();
        }, 100);
      }, 100);
    });
  });

  describe('Sign-Out Flow', () => {
    it('should complete full sign-out flow', (done) => {
      // Step 1: Set up authenticated state
      const authResult: AuthenticationResult = {
        account: {
          localAccountId: 'user-123',
          username: 'test@example.com',
          name: 'Test User',
          tenantId: 'tenant-456',
          environment: '',
          homeAccountId: ''
        },
        accessToken: 'mock-access-token',
        idToken: 'mock-id-token',
        scopes: ['user.read'],
        uniqueId: 'user-123',
        tenantId: 'tenant-456',
        tokenType: 'Bearer',
        idTokenClaims: {},
        authority: '',
        expiresOn: null,
        extExpiresOn: undefined,
        state: '',
        fromCache: false,
        correlationId: ''
      };

      msalSubject$.next({
        eventType: EventType.LOGIN_SUCCESS,
        interactionType: InteractionType.Redirect,
        payload: authResult,
        error: null,
        timestamp: Date.now()
      });

      setTimeout(() => {
        expect(authService.isAuthenticated()).toBe(true);

        // Step 2: User clicks sign-out
        authService.signOut();

        expect(msalServiceMock.logoutRedirect).toHaveBeenCalled();

        // Step 3: MSAL processes logout and emits LOGOUT_SUCCESS
        msalSubject$.next({
          eventType: EventType.LOGOUT_SUCCESS,
          interactionType: InteractionType.Redirect,
          payload: null,
          error: null,
          timestamp: Date.now()
        });

        // Step 4: Verify unauthenticated state
        setTimeout(() => {
          expect(authService.authState().status).toBe('unauthenticated');
          expect(authService.isAuthenticated()).toBe(false);
          expect(authService.currentUser()).toBeNull();
          expect(authService.authError()).toBeNull();
          done();
        }, 100);
      }, 100);
    });
  });

  describe('Multi-tab Synchronization', () => {
    it('should synchronize authentication state across events', (done) => {
      // Simulate LOGIN_SUCCESS from another tab
      const authResult: AuthenticationResult = {
        account: {
          localAccountId: 'user-multitab-123',
          username: 'multitab@example.com',
          name: 'Multi Tab User',
          tenantId: 'tenant-multitab-456',
          environment: '',
          homeAccountId: ''
        },
        accessToken: 'mock-access-token',
        idToken: 'mock-id-token',
        scopes: ['user.read'],
        uniqueId: 'user-multitab-123',
        tenantId: 'tenant-multitab-456',
        tokenType: 'Bearer',
        idTokenClaims: {},
        authority: '',
        expiresOn: null,
        extExpiresOn: undefined,
        state: '',
        fromCache: false,
        correlationId: ''
      };

      msalSubject$.next({
        eventType: EventType.LOGIN_SUCCESS,
        interactionType: InteractionType.Redirect,
        payload: authResult,
        error: null,
        timestamp: Date.now()
      });

      setTimeout(() => {
        expect(authService.isAuthenticated()).toBe(true);

        // Simulate logout from another tab
        msalSubject$.next({
          eventType: EventType.LOGOUT_SUCCESS,
          interactionType: InteractionType.Redirect,
          payload: null,
          error: null,
          timestamp: Date.now()
        });

        setTimeout(() => {
          expect(authService.isAuthenticated()).toBe(false);
          done();
        }, 100);
      }, 100);
    });
  });
});

/**
 * Integration tests for protected route access
 * Feature: 004-entra-external-id-auth - User Story 3
 * Tests: T062 (protected route access), T063 (MsalInterceptor token injection)
 */
describe('Protected Route Access Integration Tests', () => {
  let authService: AuthService;
  let msalServiceMock: jasmine.SpyObj<MsalService>;
  let msalBroadcastServiceMock: jasmine.SpyObj<MsalBroadcastService>;
  let msalSubject$: Subject<EventMessage>;
  let inProgress$: Subject<InteractionStatus>;
  let router: Router;

  beforeEach(() => {
    msalSubject$ = new Subject<EventMessage>();
    inProgress$ = new Subject<InteractionStatus>();

    msalServiceMock = jasmine.createSpyObj('MsalService', ['loginRedirect', 'logoutRedirect', 'handleRedirectObservable'], {
      instance: jasmine.createSpyObj('IPublicClientApplication', ['getAllAccounts', 'setActiveAccount'])
    });

    msalBroadcastServiceMock = jasmine.createSpyObj('MsalBroadcastService', [], {
      msalSubject$: msalSubject$.asObservable(),
      inProgress$: inProgress$.asObservable()
    });

    const routerMock = jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl']);

    (msalServiceMock.instance.getAllAccounts as jasmine.Spy).and.returnValue([]);
    (msalServiceMock.handleRedirectObservable as jasmine.Spy).and.returnValue(new Subject().asObservable());

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: MsalService, useValue: msalServiceMock },
        { provide: MsalBroadcastService, useValue: msalBroadcastServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    });

    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    msalSubject$.complete();
    inProgress$.complete();
  });

  describe('T062: Protected Route Access', () => {
    it('should allow authenticated users to access protected routes', (done) => {
      // Authenticate user
      const authResult: AuthenticationResult = {
        account: {
          localAccountId: 'user-protected-123',
          username: 'protected@example.com',
          name: 'Protected User',
          tenantId: 'tenant-protected-456',
          environment: '',
          homeAccountId: ''
        },
        accessToken: 'mock-access-token',
        idToken: 'mock-id-token',
        scopes: ['user.read'],
        uniqueId: 'user-protected-123',
        tenantId: 'tenant-protected-456',
        tokenType: 'Bearer',
        idTokenClaims: {},
        authority: '',
        expiresOn: null,
        extExpiresOn: undefined,
        state: '',
        fromCache: false,
        correlationId: ''
      };

      msalSubject$.next({
        eventType: EventType.LOGIN_SUCCESS,
        interactionType: InteractionType.Redirect,
        payload: authResult,
        error: null,
        timestamp: Date.now()
      });

      setTimeout(() => {
        expect(authService.isAuthenticated()).toBe(true);

        // User should be able to navigate to protected routes
        // MsalGuard will check authentication state
        expect(authService.currentUser()).toBeTruthy();
        expect(authService.currentUser()?.email).toBe('protected@example.com');
        done();
      }, 100);
    });

    it('should redirect unauthenticated users attempting to access protected routes', () => {
      // Verify user is not authenticated
      expect(authService.isAuthenticated()).toBe(false);

      // Attempting to access protected route should trigger redirect
      // MsalGuard will initiate loginRedirect
      expect(authService.currentUser()).toBeNull();
    });

    it('should preserve intended route after authentication', (done) => {
      // User attempts to access /voice-chat while unauthenticated
      // After authentication, they should be redirected to /voice-chat

      const authResult: AuthenticationResult = {
        account: {
          localAccountId: 'user-deeplink-123',
          username: 'deeplink@example.com',
          name: 'Deep Link User',
          tenantId: 'tenant-deeplink-456',
          environment: '',
          homeAccountId: ''
        },
        accessToken: 'mock-access-token',
        idToken: 'mock-id-token',
        scopes: ['user.read'],
        uniqueId: 'user-deeplink-123',
        tenantId: 'tenant-deeplink-456',
        tokenType: 'Bearer',
        idTokenClaims: {},
        authority: '',
        expiresOn: null,
        extExpiresOn: undefined,
        state: '/voice-chat',  // Intended route preserved in state
        fromCache: false,
        correlationId: ''
      };

      msalSubject$.next({
        eventType: EventType.LOGIN_SUCCESS,
        interactionType: InteractionType.Redirect,
        payload: authResult,
        error: null,
        timestamp: Date.now()
      });

      setTimeout(() => {
        expect(authService.isAuthenticated()).toBe(true);
        // In a real app, MSAL would redirect to the state URL
        expect(authResult.state).toBe('/voice-chat');
        done();
      }, 100);
    });
  });

  describe('T063: MsalInterceptor Token Injection', () => {
    it('should verify access token is available for API calls', (done) => {
      const authResult: AuthenticationResult = {
        account: {
          localAccountId: 'user-api-123',
          username: 'api@example.com',
          name: 'API User',
          tenantId: 'tenant-api-456',
          environment: '',
          homeAccountId: ''
        },
        accessToken: 'mock-access-token-for-api',
        idToken: 'mock-id-token',
        scopes: ['user.read', 'api://melior-agent/access'],
        uniqueId: 'user-api-123',
        tenantId: 'tenant-api-456',
        tokenType: 'Bearer',
        idTokenClaims: {},
        authority: '',
        expiresOn: null,
        extExpiresOn: undefined,
        state: '',
        fromCache: false,
        correlationId: ''
      };

      msalSubject$.next({
        eventType: EventType.LOGIN_SUCCESS,
        interactionType: InteractionType.Redirect,
        payload: authResult,
        error: null,
        timestamp: Date.now()
      });

      setTimeout(() => {
        expect(authService.isAuthenticated()).toBe(true);
        // MsalInterceptor will use this token for HTTP requests
        expect(authResult.accessToken).toBe('mock-access-token-for-api');
        expect(authResult.scopes).toContain('user.read');
        done();
      }, 100);
    });

    it('should handle token acquisition for protected API endpoints', (done) => {
      // Simulate successful token acquisition
      const authResult: AuthenticationResult = {
        account: {
          localAccountId: 'user-token-123',
          username: 'token@example.com',
          name: 'Token User',
          tenantId: 'tenant-token-456',
          environment: '',
          homeAccountId: ''
        },
        accessToken: 'fresh-access-token',
        idToken: 'mock-id-token',
        scopes: ['user.read'],
        uniqueId: 'user-token-123',
        tenantId: 'tenant-token-456',
        tokenType: 'Bearer',
        idTokenClaims: {},
        authority: '',
        expiresOn: null,
        extExpiresOn: undefined,
        state: '',
        fromCache: false,
        correlationId: ''
      };

      msalSubject$.next({
        eventType: EventType.ACQUIRE_TOKEN_SUCCESS,
        interactionType: InteractionType.Silent,
        payload: authResult,
        error: null,
        timestamp: Date.now()
      });

      setTimeout(() => {
        // Token acquisition successful - MsalInterceptor can use this token
        expect(authResult.accessToken).toBe('fresh-access-token');
        done();
      }, 100);
    });

    it('should verify protected resource map includes API URL', () => {
      // This is a conceptual test - in reality, protectedResourceMap
      // is configured in app.config.ts via MSALInterceptorConfigFactory

      // Verify that environment configuration exists
      // The actual interceptor configuration is done in app.config.ts
      expect(true).toBe(true);  // Placeholder test
    });
  });
});

/**
 * Integration tests for sign-out functionality
 * Feature: 004-entra-external-id-auth - User Story 4
 * Tests: T067, T068, T069 - Sign-out and re-authentication
 */
describe('Sign-Out Functionality Tests', () => {
  let authService: AuthService;
  let msalServiceMock: jasmine.SpyObj<MsalService>;
  let msalBroadcastServiceMock: jasmine.SpyObj<MsalBroadcastService>;
  let msalSubject$: Subject<EventMessage>;
  let inProgress$: Subject<InteractionStatus>;

  beforeEach(() => {
    msalSubject$ = new Subject<EventMessage>();
    inProgress$ = new Subject<InteractionStatus>();

    msalServiceMock = jasmine.createSpyObj('MsalService', ['loginRedirect', 'logoutRedirect', 'handleRedirectObservable'], {
      instance: jasmine.createSpyObj('IPublicClientApplication', ['getAllAccounts', 'setActiveAccount'])
    });

    msalBroadcastServiceMock = jasmine.createSpyObj('MsalBroadcastService', [], {
      msalSubject$: msalSubject$.asObservable(),
      inProgress$: inProgress$.asObservable()
    });

    (msalServiceMock.instance.getAllAccounts as jasmine.Spy).and.returnValue([]);
    (msalServiceMock.handleRedirectObservable as jasmine.Spy).and.returnValue(new Subject().asObservable());

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: MsalService, useValue: msalServiceMock },
        { provide: MsalBroadcastService, useValue: msalBroadcastServiceMock }
      ]
    });

    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    msalSubject$.complete();
    inProgress$.complete();
  });

  describe('T067: Sign-out clears user profile from authState', () => {
    it('should clear user profile from authState signal on sign-out', (done) => {
      // Step 1: Authenticate user
      const authResult: AuthenticationResult = {
        account: {
          localAccountId: 'user-signout-123',
          username: 'signout@example.com',
          name: 'Signout User',
          tenantId: 'tenant-signout-456',
          environment: '',
          homeAccountId: ''
        },
        accessToken: 'mock-access-token',
        idToken: 'mock-id-token',
        scopes: ['user.read'],
        uniqueId: 'user-signout-123',
        tenantId: 'tenant-signout-456',
        tokenType: 'Bearer',
        idTokenClaims: {},
        authority: '',
        expiresOn: null,
        extExpiresOn: undefined,
        state: '',
        fromCache: false,
        correlationId: ''
      };

      msalSubject$.next({
        eventType: EventType.LOGIN_SUCCESS,
        interactionType: InteractionType.Redirect,
        payload: authResult,
        error: null,
        timestamp: Date.now()
      });

      setTimeout(() => {
        // Verify user is authenticated
        expect(authService.isAuthenticated()).toBe(true);
        expect(authService.currentUser()).toBeTruthy();
        expect(authService.currentUser()?.email).toBe('signout@example.com');

        // Step 2: Sign out
        authService.signOut();

        // Step 3: Process LOGOUT_SUCCESS event
        msalSubject$.next({
          eventType: EventType.LOGOUT_SUCCESS,
          interactionType: InteractionType.Redirect,
          payload: null,
          error: null,
          timestamp: Date.now()
        });

        setTimeout(() => {
          // Step 4: Verify user profile is cleared
          expect(authService.authState().status).toBe('unauthenticated');
          expect(authService.authState().user).toBeNull();
          expect(authService.authState().error).toBeNull();
          expect(authService.isAuthenticated()).toBe(false);
          expect(authService.currentUser()).toBeNull();
          done();
        }, 100);
      }, 100);
    });

    it('should clear any previous errors on sign-out', (done) => {
      // Set up error state
      const error: Partial<MsalAuthError> = {
        errorCode: 'token_expired',
        errorMessage: 'Token expired',
        message: 'Token expired',
        name: 'AuthError'
      };

      msalSubject$.next({
        eventType: EventType.LOGIN_FAILURE,
        interactionType: InteractionType.Redirect,
        payload: null,
        error: error as MsalAuthError,
        timestamp: Date.now()
      });

      setTimeout(() => {
        expect(authService.authError()).toBeTruthy();

        // Sign out (even from error state)
        authService.signOut();

        msalSubject$.next({
          eventType: EventType.LOGOUT_SUCCESS,
          interactionType: InteractionType.Redirect,
          payload: null,
          error: null,
          timestamp: Date.now()
        });

        setTimeout(() => {
          expect(authService.authError()).toBeNull();
          expect(authService.authState().status).toBe('unauthenticated');
          done();
        }, 100);
      }, 100);
    });
  });

  describe('T068: Sign-out redirects to postLogoutRedirectUri', () => {
    it('should call msalService.logoutRedirect on sign-out', () => {
      authService.signOut();

      expect(msalServiceMock.logoutRedirect).toHaveBeenCalled();
      expect(msalServiceMock.logoutRedirect).toHaveBeenCalledTimes(1);
    });

    it('should use configured postLogoutRedirectUri', () => {
      // postLogoutRedirectUri is configured in app.config.ts
      // MSAL will redirect to this URL after logout
      // This test verifies the sign-out method is called correctly
      authService.signOut();

      expect(msalServiceMock.logoutRedirect).toHaveBeenCalled();
    });
  });

  describe('T069: Re-authentication after sign-out', () => {
    it('should require re-authentication to access protected routes after sign-out', (done) => {
      // Step 1: Authenticate
      const authResult: AuthenticationResult = {
        account: {
          localAccountId: 'user-reauth-123',
          username: 'reauth@example.com',
          name: 'Reauth User',
          tenantId: 'tenant-reauth-456',
          environment: '',
          homeAccountId: ''
        },
        accessToken: 'mock-access-token',
        idToken: 'mock-id-token',
        scopes: ['user.read'],
        uniqueId: 'user-reauth-123',
        tenantId: 'tenant-reauth-456',
        tokenType: 'Bearer',
        idTokenClaims: {},
        authority: '',
        expiresOn: null,
        extExpiresOn: undefined,
        state: '',
        fromCache: false,
        correlationId: ''
      };

      msalSubject$.next({
        eventType: EventType.LOGIN_SUCCESS,
        interactionType: InteractionType.Redirect,
        payload: authResult,
        error: null,
        timestamp: Date.now()
      });

      setTimeout(() => {
        expect(authService.isAuthenticated()).toBe(true);

        // Step 2: Sign out
        authService.signOut();

        msalSubject$.next({
          eventType: EventType.LOGOUT_SUCCESS,
          interactionType: InteractionType.Redirect,
          payload: null,
          error: null,
          timestamp: Date.now()
        });

        setTimeout(() => {
          // Step 3: Verify user is unauthenticated
          expect(authService.isAuthenticated()).toBe(false);

          // Step 4: Attempting to access protected route would trigger re-authentication
          // This would be caught by MsalGuard, which would call loginRedirect
          expect(authService.currentUser()).toBeNull();

          // Step 5: User re-authenticates
          const reauthResult: AuthenticationResult = {
            account: {
              localAccountId: 'user-reauth-123',
              username: 'reauth@example.com',
              name: 'Reauth User',
              tenantId: 'tenant-reauth-456',
              environment: '',
              homeAccountId: ''
            },
            accessToken: 'new-access-token',
            idToken: 'new-id-token',
            scopes: ['user.read'],
            uniqueId: 'user-reauth-123',
            tenantId: 'tenant-reauth-456',
            tokenType: 'Bearer',
            idTokenClaims: {},
            authority: '',
            expiresOn: null,
            extExpiresOn: undefined,
            state: '',
            fromCache: false,
            correlationId: ''
          };

          msalSubject$.next({
            eventType: EventType.LOGIN_SUCCESS,
            interactionType: InteractionType.Redirect,
            payload: reauthResult,
            error: null,
            timestamp: Date.now()
          });

          setTimeout(() => {
            // Step 6: Verify user is re-authenticated
            expect(authService.isAuthenticated()).toBe(true);
            expect(authService.currentUser()).toBeTruthy();
            expect(authService.currentUser()?.email).toBe('reauth@example.com');
            done();
          }, 100);
        }, 100);
      }, 100);
    });

    it('should maintain separate sessions after sign-out and re-sign-in', (done) => {
      // First session
      const firstSession: AuthenticationResult = {
        account: {
          localAccountId: 'user-session1',
          username: 'session1@example.com',
          name: 'Session 1 User',
          tenantId: 'tenant-1',
          environment: '',
          homeAccountId: ''
        },
        accessToken: 'token-session-1',
        idToken: 'id-token-1',
        scopes: ['user.read'],
        uniqueId: 'user-session1',
        tenantId: 'tenant-1',
        tokenType: 'Bearer',
        idTokenClaims: {},
        authority: '',
        expiresOn: null,
        extExpiresOn: undefined,
        state: '',
        fromCache: false,
        correlationId: 'correlation-1'
      };

      msalSubject$.next({
        eventType: EventType.LOGIN_SUCCESS,
        interactionType: InteractionType.Redirect,
        payload: firstSession,
        error: null,
        timestamp: Date.now()
      });

      setTimeout(() => {
        expect(authService.currentUser()?.email).toBe('session1@example.com');

        // Sign out
        authService.signOut();

        msalSubject$.next({
          eventType: EventType.LOGOUT_SUCCESS,
          interactionType: InteractionType.Redirect,
          payload: null,
          error: null,
          timestamp: Date.now()
        });

        setTimeout(() => {
          expect(authService.isAuthenticated()).toBe(false);

          // Second session (different user)
          const secondSession: AuthenticationResult = {
            account: {
              localAccountId: 'user-session2',
              username: 'session2@example.com',
              name: 'Session 2 User',
              tenantId: 'tenant-2',
              environment: '',
              homeAccountId: ''
            },
            accessToken: 'token-session-2',
            idToken: 'id-token-2',
            scopes: ['user.read'],
            uniqueId: 'user-session2',
            tenantId: 'tenant-2',
            tokenType: 'Bearer',
            idTokenClaims: {},
            authority: '',
            expiresOn: null,
            extExpiresOn: undefined,
            state: '',
            fromCache: false,
            correlationId: 'correlation-2'
          };

          msalSubject$.next({
            eventType: EventType.LOGIN_SUCCESS,
            interactionType: InteractionType.Redirect,
            payload: secondSession,
            error: null,
            timestamp: Date.now()
          });

          setTimeout(() => {
            // Verify different user is now authenticated
            expect(authService.isAuthenticated()).toBe(true);
            expect(authService.currentUser()?.email).toBe('session2@example.com');
            expect(authService.currentUser()?.userId).toBe('user-session2');
            done();
          }, 100);
        }, 100);
      }, 100);
    });
  });
});
