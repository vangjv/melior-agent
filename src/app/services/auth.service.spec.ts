import { TestBed } from '@angular/core/testing';
import { MsalService, MsalBroadcastService } from '@azure/msal-angular';
import { EventMessage, EventType, InteractionStatus, InteractionType, AuthenticationResult, AuthError as MsalAuthError } from '@azure/msal-browser';
import { Subject } from 'rxjs';
import { AuthService } from './auth.service';
import { AuthErrorCode } from '../models/auth-state';

describe('AuthService', () => {
  let service: AuthService;
  let msalServiceMock: jasmine.SpyObj<MsalService>;
  let msalBroadcastServiceMock: jasmine.SpyObj<MsalBroadcastService>;
  let msalSubject$: Subject<EventMessage>;
  let inProgress$: Subject<InteractionStatus>;

  beforeEach(() => {
    // Create subjects for observable streams
    msalSubject$ = new Subject<EventMessage>();
    inProgress$ = new Subject<InteractionStatus>();

    // Create MSAL service mocks
    msalServiceMock = jasmine.createSpyObj('MsalService', ['loginRedirect', 'logoutRedirect'], {
      instance: jasmine.createSpyObj('IPublicClientApplication', ['getAllAccounts'])
    });

    msalBroadcastServiceMock = jasmine.createSpyObj('MsalBroadcastService', [], {
      msalSubject$: msalSubject$.asObservable(),
      inProgress$: inProgress$.asObservable()
    });

    // Configure default mock behavior
    (msalServiceMock.instance.getAllAccounts as jasmine.Spy).and.returnValue([]);

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: MsalService, useValue: msalServiceMock },
        { provide: MsalBroadcastService, useValue: msalBroadcastServiceMock }
      ]
    });

    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    msalSubject$.complete();
    inProgress$.complete();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initialization', () => {
    it('should initialize with unauthenticated state when no accounts exist', () => {
      expect(service.authState().status).toBe('unauthenticated');
      expect(service.authState().user).toBeNull();
      expect(service.authState().error).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
    });

    it('should initialize with authenticated state when account exists', () => {
      // Reset service with existing account
      (msalServiceMock.instance.getAllAccounts as jasmine.Spy).and.returnValue([
        {
          localAccountId: 'user-123',
          username: 'test@example.com',
          name: 'Test User',
          tenantId: 'tenant-456'
        }
      ]);

      // Create new service instance
      const authenticatedService = new AuthService(msalServiceMock, msalBroadcastServiceMock);

      expect(authenticatedService.authState().status).toBe('authenticated');
      expect(authenticatedService.authState().user).toEqual({
        userId: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        username: 'test@example.com',
        tenantId: 'tenant-456'
      });
      expect(authenticatedService.isAuthenticated()).toBe(true);
    });
  });

  describe('signIn()', () => {
    it('should call msalService.loginRedirect()', () => {
      service.signIn();
      expect(msalServiceMock.loginRedirect).toHaveBeenCalled();
    });

    it('should set status to authenticating', () => {
      service.signIn();
      expect(service.authState().status).toBe('authenticating');
      expect(service.isLoading()).toBe(true);
    });

    it('should clear user and error on sign-in', () => {
      // Set initial error state
      service['_authState'].set({
        status: 'error',
        user: null,
        error: {
          code: 'network_error',
          message: 'Network error',
          userMessage: 'Network error occurred',
          timestamp: new Date(),
          retryable: true
        }
      });

      service.signIn();

      expect(service.authState().user).toBeNull();
      expect(service.authState().error).toBeNull();
    });
  });

  describe('signOut()', () => {
    it('should call msalService.logoutRedirect()', () => {
      service.signOut();
      expect(msalServiceMock.logoutRedirect).toHaveBeenCalled();
    });
  });

  describe('LOGIN_SUCCESS event', () => {
    it('should update authState to authenticated on LOGIN_SUCCESS', () => {
      const authResult: AuthenticationResult = {
        account: {
          localAccountId: 'user-789',
          username: 'newuser@example.com',
          name: 'New User',
          tenantId: 'tenant-abc',
          environment: '',
          homeAccountId: ''
        },
        accessToken: 'mock-access-token',
        idToken: 'mock-id-token',
        scopes: ['user.read'],
        uniqueId: 'user-789',
        tenantId: 'tenant-abc',
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

      expect(service.authState().status).toBe('authenticated');
      expect(service.authState().user).toEqual({
        userId: 'user-789',
        email: 'newuser@example.com',
        displayName: 'New User',
        username: 'newuser@example.com',
        tenantId: 'tenant-abc'
      });
      expect(service.authState().error).toBeNull();
      expect(service.isAuthenticated()).toBe(true);
    });

    it('should handle LOGIN_SUCCESS with missing account name', () => {
      const authResult: AuthenticationResult = {
        account: {
          localAccountId: 'user-456',
          username: 'test@example.com',
          name: undefined,
          tenantId: 'tenant-123',
          environment: '',
          homeAccountId: ''
        },
        accessToken: 'mock-access-token',
        idToken: 'mock-id-token',
        scopes: ['user.read'],
        uniqueId: 'user-456',
        tenantId: 'tenant-123',
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

      expect(service.authState().user?.displayName).toBe('test@example.com');
    });
  });

  describe('LOGOUT_SUCCESS event', () => {
    it('should update authState to unauthenticated on LOGOUT_SUCCESS', () => {
      // Set initial authenticated state
      service['_authState'].set({
        status: 'authenticated',
        user: {
          userId: 'user-123',
          email: 'test@example.com',
          displayName: 'Test User',
          username: 'test@example.com',
          tenantId: 'tenant-456'
        },
        error: null
      });

      msalSubject$.next({
        eventType: EventType.LOGOUT_SUCCESS,
        interactionType: InteractionType.Redirect,
        payload: null,
        error: null,
        timestamp: Date.now()
      });

      expect(service.authState().status).toBe('unauthenticated');
      expect(service.authState().user).toBeNull();
      expect(service.authState().error).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe('LOGIN_FAILURE event', () => {
    it('should handle LOGIN_FAILURE with user_cancelled error', () => {
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

      expect(service.authState().status).toBe('error');
      expect(service.authState().error?.code).toBe('user_cancelled');
      expect(service.authState().error?.userMessage).toContain('cancelled');
      expect(service.authState().error?.retryable).toBe(true);
    });

    it('should handle LOGIN_FAILURE with network error', () => {
      const msalError: Partial<MsalAuthError> = {
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
        error: msalError as MsalAuthError,
        timestamp: Date.now()
      });

      expect(service.authState().status).toBe('error');
      expect(service.authState().error?.code).toBe('network_error');
      expect(service.authState().error?.userMessage).toContain('internet connection');
      expect(service.authState().error?.retryable).toBe(true);
    });

    it('should handle LOGIN_FAILURE with configuration error as non-retryable', () => {
      const msalError: Partial<MsalAuthError> = {
        errorCode: 'invalid_client',
        errorMessage: 'Client configuration error',
        message: 'Client configuration error',
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

      expect(service.authState().status).toBe('error');
      expect(service.authState().error?.code).toBe('configuration_error');
      expect(service.authState().error?.retryable).toBe(false);
    });
  });

  describe('inProgress$ handling', () => {
    it('should set status to authenticating when interaction starts', () => {
      inProgress$.next(InteractionStatus.Login);
      expect(service.authState().status).toBe('authenticating');
      expect(service.isLoading()).toBe(true);
    });

    it('should check auth status when interaction completes', () => {
      // Setup authenticated account
      (msalServiceMock.instance.getAllAccounts as jasmine.Spy).and.returnValue([
        {
          localAccountId: 'user-123',
          username: 'test@example.com',
          name: 'Test User',
          tenantId: 'tenant-456'
        }
      ]);

      inProgress$.next(InteractionStatus.None);

      expect(service.authState().status).toBe('authenticated');
    });

    it('should not override authenticating status if already set', () => {
      service['_authState'].set({
        status: 'authenticating',
        user: null,
        error: null
      });

      inProgress$.next(InteractionStatus.Login);

      expect(service.authState().status).toBe('authenticating');
    });
  });

  describe('error mapping', () => {
    const testErrorMapping = (errorCode: string, expectedCode: AuthErrorCode) => {
      const msalError: Partial<MsalAuthError> = {
        errorCode,
        errorMessage: 'Test error',
        message: 'Test error',
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

      expect(service.authState().error?.code).toBe(expectedCode);
    };

    it('should map user_cancelled correctly', () => {
      testErrorMapping('user_cancelled', 'user_cancelled');
    });

    it('should map network errors correctly', () => {
      testErrorMapping('network_error', 'network_error');
    });

    it('should map invalid_grant to invalid_credentials', () => {
      testErrorMapping('invalid_grant', 'invalid_credentials');
    });

    it('should map token_expired correctly', () => {
      testErrorMapping('token_expired', 'token_expired');
    });

    it('should map interaction_required to token_refresh_failed', () => {
      testErrorMapping('interaction_required', 'token_refresh_failed');
    });

    it('should map invalid_client to configuration_error', () => {
      testErrorMapping('invalid_client', 'configuration_error');
    });

    it('should map unknown errors to unknown_error', () => {
      testErrorMapping('some_random_error', 'unknown_error');
    });
  });

  describe('computed signals', () => {
    it('should compute isAuthenticated correctly', () => {
      expect(service.isAuthenticated()).toBe(false);

      service['_authState'].set({
        status: 'authenticated',
        user: {
          userId: 'user-123',
          email: 'test@example.com',
          displayName: 'Test User',
          username: 'test@example.com',
          tenantId: 'tenant-456'
        },
        error: null
      });

      expect(service.isAuthenticated()).toBe(true);
    });

    it('should compute isLoading correctly', () => {
      expect(service.isLoading()).toBe(false);

      service['_authState'].set({
        status: 'authenticating',
        user: null,
        error: null
      });

      expect(service.isLoading()).toBe(true);
    });

    it('should compute currentUser correctly', () => {
      expect(service.currentUser()).toBeNull();

      const user = {
        userId: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        username: 'test@example.com',
        tenantId: 'tenant-456'
      };

      service['_authState'].set({
        status: 'authenticated',
        user,
        error: null
      });

      expect(service.currentUser()).toEqual(user);
    });

    it('should compute authError correctly', () => {
      expect(service.authError()).toBeNull();

      const error = {
        code: 'network_error' as AuthErrorCode,
        message: 'Network error',
        userMessage: 'Network error occurred',
        timestamp: new Date(),
        retryable: true
      };

      service['_authState'].set({
        status: 'error',
        user: null,
        error
      });

      expect(service.authError()).toEqual(error);
    });
  });

  describe('ACQUIRE_TOKEN events', () => {
    it('should check auth status on ACQUIRE_TOKEN_SUCCESS', () => {
      (msalServiceMock.instance.getAllAccounts as jasmine.Spy).and.returnValue([
        {
          localAccountId: 'user-123',
          username: 'test@example.com',
          name: 'Test User',
          tenantId: 'tenant-456'
        }
      ]);

      msalSubject$.next({
        eventType: EventType.ACQUIRE_TOKEN_SUCCESS,
        interactionType: InteractionType.Silent,
        payload: null,
        error: null,
        timestamp: Date.now()
      });

      expect(service.authState().status).toBe('authenticated');
    });

    it('should handle ACQUIRE_TOKEN_FAILURE', () => {
      const msalError: Partial<MsalAuthError> = {
        errorCode: 'interaction_required',
        errorMessage: 'Token refresh failed',
        message: 'Token refresh failed',
        name: 'AuthError',
        stack: ''
      };

      msalSubject$.next({
        eventType: EventType.ACQUIRE_TOKEN_FAILURE,
        interactionType: InteractionType.Silent,
        payload: null,
        error: msalError as MsalAuthError,
        timestamp: Date.now()
      });

      expect(service.authState().status).toBe('error');
      expect(service.authState().error?.code).toBe('token_refresh_failed');
    });
  });

  describe('cleanup', () => {
    it('should complete subscriptions on destroy', () => {
      spyOn(service['destroy$'], 'next');
      spyOn(service['destroy$'], 'complete');

      service.ngOnDestroy();

      expect(service['destroy$'].next).toHaveBeenCalled();
      expect(service['destroy$'].complete).toHaveBeenCalled();
    });
  });
});
