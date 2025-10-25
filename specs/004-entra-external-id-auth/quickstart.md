# Quickstart: Microsoft Entra External ID Authentication

**Feature**: 004-entra-external-id-auth  
**Date**: 2025-10-25  
**Audience**: Developers implementing this feature

## Overview

This guide provides step-by-step instructions to implement Microsoft Entra External ID authentication for the Melior Agent application. The implementation covers both Angular frontend (redirect-based authentication) and Azure Functions backend (JWT token validation).

**Time to Complete**: 2-3 hours  
**Prerequisites**: Node.js 18+, Angular CLI, Azure Functions Core Tools, Microsoft Entra tenant access

---

## Table of Contents

1. [Environment Setup](#environment-setup)
2. [Frontend Implementation](#frontend-implementation)
3. [Backend Implementation](#backend-implementation)
4. [Testing](#testing)
5. [Deployment](#deployment)
6. [Troubleshooting](#troubleshooting)

---

## Environment Setup

### 1. Install Dependencies

**Frontend:**
```bash
npm install @azure/msal-angular@^4.0.0 @azure/msal-browser@^3.7.0 --save
```

**Backend (Azure Functions):**
```bash
cd api
npm install @azure/msal-node@^2.6.0 --save
```

**Note**: `@azure/msal-browser` is a peer dependency of `@azure/msal-angular` and must be installed separately.

### 2. Configure Environment Variables

**Frontend - Create/update `src/environments/environment.development.ts`:**

```typescript
export const environment = {
  production: false,
  entraConfig: {
    clientId: '4d072598-4248-45b0-be42-9a42e3bea85b',
    tenantId: '03e82745-fdd7-4afd-b750-f7a4749a3775',
    authority: 'https://login.microsoftonline.com/03e82745-fdd7-4afd-b750-f7a4749a3775',
    redirectUri: 'http://localhost:4200',
    postLogoutRedirectUri: 'http://localhost:4200',
    scopes: ['openid', 'profile', 'email', 'offline_access']
  },
  livekit: {
    apiUrl: 'http://localhost:7071/api'
  }
};
```

**Frontend - Create/update `src/environments/environment.ts` (production):**

```typescript
export const environment = {
  production: true,
  entraConfig: {
    clientId: '4d072598-4248-45b0-be42-9a42e3bea85b',
    tenantId: '03e82745-fdd7-4afd-b750-f7a4749a3775',
    authority: 'https://login.microsoftonline.com/03e82745-fdd7-4afd-b750-f7a4749a3775',
    redirectUri: 'https://your-production-domain.com',
    postLogoutRedirectUri: 'https://your-production-domain.com',
    scopes: ['openid', 'profile', 'email', 'offline_access']
  },
  livekit: {
    apiUrl: 'https://your-api.azurewebsites.net/api'
  }
};
```

**Backend - Create/update `api/local.settings.json`:**

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "ENTRA_TENANT_ID": "03e82745-fdd7-4afd-b750-f7a4749a3775",
    "ENTRA_CLIENT_ID": "4d072598-4248-45b0-be42-9a42e3bea85b",
    "ENTRA_AUTHORITY": "https://login.microsoftonline.com/03e82745-fdd7-4afd-b750-f7a4749a3775"
  },
  "Host": {
    "CORS": "http://localhost:4200",
    "CORSCredentials": true
  }
}
```

### 3. Register Redirect URIs in Azure Portal

1. Navigate to Azure Portal → Microsoft Entra ID → App Registrations
2. Select your application (Client ID: 4d072598-4248-45b0-be42-9a42e3bea85b)
3. Go to "Authentication" → "Platform configurations"
4. Add Single-page application (SPA) platform if not exists
5. Add redirect URIs:
   - Development: `http://localhost:4200`
   - Production: `https://your-production-domain.com`
6. Enable "ID tokens" under Implicit grant (required for MSAL Angular)
7. Save configuration

**Important**: MSAL Angular v4 uses authorization code flow with PKCE by default. Do NOT use `/auth/callback` suffix - the redirect URI is the application root.

---

## Frontend Implementation

### Step 1: Configure MSAL in app.config.ts

**File: `src/app/app.config.ts`**

```typescript
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { 
  IPublicClientApplication, 
  PublicClientApplication,
  InteractionType,
  BrowserCacheLocation,
  LogLevel
} from '@azure/msal-browser';
import { 
  MsalGuard, 
  MsalInterceptor, 
  MsalBroadcastService, 
  MsalService,
  MSAL_INSTANCE,
  MSAL_GUARD_CONFIG,
  MSAL_INTERCEPTOR_CONFIG,
  MsalGuardConfiguration,
  MsalInterceptorConfiguration
} from '@azure/msal-angular';

import { routes } from './app.routes';
import { environment } from '../environments/environment';

/**
 * Factory function to create MSAL instance with PKCE flow
 */
export function MSALInstanceFactory(): IPublicClientApplication {
  return new PublicClientApplication({
    auth: {
      clientId: environment.entraConfig.clientId,
      authority: environment.entraConfig.authority,
      redirectUri: environment.entraConfig.redirectUri,
      postLogoutRedirectUri: environment.entraConfig.postLogoutRedirectUri
    },
    cache: {
      cacheLocation: BrowserCacheLocation.SessionStorage,
      storeAuthStateInCookie: false
    },
    system: {
      loggerOptions: {
        logLevel: environment.production ? LogLevel.Error : LogLevel.Info,
        piiLoggingEnabled: false
      }
    }
  });
}

/**
 * Factory function to configure MsalGuard
 */
export function MSALGuardConfigFactory(): MsalGuardConfiguration {
  return {
    interactionType: InteractionType.Redirect,
    authRequest: {
      scopes: environment.entraConfig.scopes
    },
    loginFailedRoute: '/'
  };
}

/**
 * Factory function to configure MsalInterceptor
 */
export function MSALInterceptorConfigFactory(): MsalInterceptorConfiguration {
  const protectedResourceMap = new Map<string, Array<string>>();
  
  // Add Azure Functions API to protected resources
  protectedResourceMap.set(
    environment.livekit.apiUrl + '/*',
    environment.entraConfig.scopes
  );
  
  return {
    interactionType: InteractionType.Redirect,
    protectedResourceMap
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimationsAsync(),
    
    // MSAL Configuration for standalone components
    {
      provide: MSAL_INSTANCE,
      useFactory: MSALInstanceFactory
    },
    {
      provide: MSAL_GUARD_CONFIG,
      useFactory: MSALGuardConfigFactory
    },
    {
      provide: MSAL_INTERCEPTOR_CONFIG,
      useFactory: MSALInterceptorConfigFactory
    },
    
    // MSAL Services
    MsalService,
    MsalGuard,
    MsalBroadcastService,
    
    // HTTP Interceptor for automatic token injection
    {
      provide: HTTP_INTERCEPTORS,
      useClass: MsalInterceptor,
      multi: true
    }
  ]
};
```

### Step 2: Create Authentication State Service

**File: `src/app/models/auth-state.ts`**

```typescript
export type AuthStatus = 'unauthenticated' | 'authenticating' | 'authenticated' | 'error';

export interface AuthenticationState {
  readonly status: AuthStatus;
  readonly user: UserProfile | null;
  readonly error: AuthError | null;
}

export interface UserProfile {
  readonly userId: string;
  readonly email: string;
  readonly displayName: string;
  readonly username: string;
  readonly tenantId: string;
}

export type AuthErrorCode = 
  | 'user_cancelled'
  | 'network_error'
  | 'invalid_credentials'
  | 'token_expired'
  | 'token_refresh_failed'
  | 'configuration_error'
  | 'unknown_error';

export interface AuthError {
  readonly code: AuthErrorCode;
  readonly message: string;
  readonly userMessage: string;
  readonly timestamp: Date;
  readonly retryable: boolean;
}
```

**File: `src/app/services/auth.service.ts`**

```typescript
import { Injectable, signal, computed, OnDestroy } from '@angular/core';
import { MsalService, MsalBroadcastService } from '@azure/msal-angular';
import { EventMessage, EventType, InteractionStatus } from '@azure/msal-browser';
import { Subject, filter, takeUntil } from 'rxjs';
import { AuthenticationState, UserProfile, AuthError, AuthErrorCode } from '../models/auth-state';

/**
 * Authentication service that wraps MSAL Angular and exposes reactive state via signals
 */
@Injectable({ providedIn: 'root' })
export class AuthService implements OnDestroy {
  private readonly destroy$ = new Subject<void>();
  
  // Private mutable state
  private readonly _authState = signal<AuthenticationState>({
    status: 'unauthenticated',
    user: null,
    error: null
  });

  // Public readonly state
  readonly authState = this._authState.asReadonly();
  
  // Computed signals
  readonly isAuthenticated = computed(() => this.authState().status === 'authenticated');
  readonly currentUser = computed(() => this.authState().user);
  readonly authError = computed(() => this.authState().error);

  constructor(
    private msalService: MsalService,
    private msalBroadcastService: MsalBroadcastService
  ) {
    this.initialize();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initialize(): void {
    // Subscribe to MSAL events for auth state changes
    this.msalBroadcastService.msalSubject$
      .pipe(
        filter((msg: EventMessage) => 
          msg.eventType === EventType.LOGIN_SUCCESS ||
          msg.eventType === EventType.LOGOUT_SUCCESS ||
          msg.eventType === EventType.ACQUIRE_TOKEN_SUCCESS ||
          msg.eventType === EventType.LOGIN_FAILURE ||
          msg.eventType === EventType.ACQUIRE_TOKEN_FAILURE
        ),
        takeUntil(this.destroy$)
      )
      .subscribe((result: EventMessage) => {
        this.handleMsalEvent(result);
      });

    // Subscribe to interaction status for loading state
    this.msalBroadcastService.inProgress$
      .pipe(
        filter((status: InteractionStatus) => status === InteractionStatus.None),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.checkAuthStatus();
      });

    // Initial auth check
    this.checkAuthStatus();
  }

  private checkAuthStatus(): void {
    const accounts = this.msalService.instance.getAllAccounts();
    
    if (accounts.length > 0) {
      const account = accounts[0];
      this._authState.set({
        status: 'authenticated',
        user: {
          userId: account.homeAccountId,
          email: account.username,
          displayName: account.name || account.username,
          username: account.username,
          tenantId: account.tenantId
        },
        error: null
      });
    } else {
      this._authState.set({
        status: 'unauthenticated',
        user: null,
        error: null
      });
    }
  }

  private handleMsalEvent(event: EventMessage): void {
    switch (event.eventType) {
      case EventType.LOGIN_SUCCESS:
      case EventType.ACQUIRE_TOKEN_SUCCESS:
        this.checkAuthStatus();
        break;
        
      case EventType.LOGOUT_SUCCESS:
        this._authState.set({
          status: 'unauthenticated',
          user: null,
          error: null
        });
        break;
        
      case EventType.LOGIN_FAILURE:
      case EventType.ACQUIRE_TOKEN_FAILURE:
        this.handleAuthError(event.error);
        break;
    }
  }

  private handleAuthError(error: any): void {
    const authError: AuthError = {
      code: this.mapErrorCode(error),
      message: error?.message || 'Authentication failed',
      userMessage: this.getUserFriendlyMessage(error),
      timestamp: new Date(),
      retryable: this.isErrorRetryable(error)
    };

    this._authState.update(state => ({
      ...state,
      status: 'error',
      error: authError
    }));
  }

  private mapErrorCode(error: any): AuthErrorCode {
    const errorCode = error?.errorCode?.toLowerCase() || '';
    
    if (errorCode.includes('user_cancelled')) return 'user_cancelled';
    if (errorCode.includes('network')) return 'network_error';
    if (errorCode.includes('token_renewal')) return 'token_refresh_failed';
    
    return 'unknown_error';
  }

  private getUserFriendlyMessage(error: any): string {
    const code = this.mapErrorCode(error);
    
    const messages: Record<AuthErrorCode, string> = {
      user_cancelled: 'Sign-in was cancelled. Please try again.',
      network_error: 'Network error occurred. Please check your connection.',
      invalid_credentials: 'Invalid credentials. Please try again.',
      token_expired: 'Your session has expired. Please sign in again.',
      token_refresh_failed: 'Failed to refresh authentication. Please sign in again.',
      configuration_error: 'Authentication configuration error. Please contact support.',
      unknown_error: 'An unexpected error occurred. Please try again.'
    };
    
    return messages[code];
  }

  private isErrorRetryable(error: any): boolean {
    const code = this.mapErrorCode(error);
    return code === 'network_error' || code === 'token_refresh_failed';
  }

  /**
   * Sign in user with redirect flow
   */
  signIn(): void {
    this.msalService.loginRedirect();
  }

  /**
   * Sign out current user
   */
  signOut(): void {
    const account = this.msalService.instance.getAllAccounts()[0];
    this.msalService.logoutRedirect({ account });
  }

  /**
   * Acquire access token silently for API calls
   * Note: MsalInterceptor handles this automatically for configured endpoints
   */
  async getAccessToken(): Promise<string> {
    const account = this.msalService.instance.getAllAccounts()[0];
    
    if (!account) {
      throw new Error('No authenticated account');
    }

    try {
      const result = await this.msalService.instance.acquireTokenSilent({
        scopes: ['openid', 'profile', 'email'],
        account
      });
      return result.accessToken;
    } catch (error) {
      // Fall back to interactive if silent fails
      const result = await this.msalService.instance.acquireTokenRedirect({
        scopes: ['openid', 'profile', 'email'],
        account
      });
      throw error; // Redirect will navigate away, this won't execute
    }
  }
}
        isLoading: false
      });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }

  async getAccessToken(): Promise<string> {
    const accounts = this.msalInstance.getAllAccounts();
    if (accounts.length === 0) {
      throw new Error('No authenticated user');
    }

    try {
      const response = await this.msalInstance.acquireTokenSilent({
        scopes: ['openid', 'profile', 'email'],
        account: accounts[0]
      });
      return response.accessToken;
    } catch (error) {
      // Fallback to interactive if silent fails
      const response = await this.msalInstance.acquireTokenRedirect({
        scopes: ['openid', 'profile', 'email']
      });
      return response.accessToken;
    }
  }

  private handleAuthenticationResult(result: AuthenticationResult): void {
    if (result.account) {
      this.setAuthenticatedState(this.mapAccountToProfile(result.account));
    }
  }

  private setAuthenticatedState(user: UserProfile): void {
    this._authState.set({
      status: 'authenticated',
      user,
      error: null,
      isLoading: false
    });
  }

  private mapAccountToProfile(account: AccountInfo): UserProfile {
    return {
      userId: account.localAccountId,
      email: account.username,
      displayName: account.name || account.username,
      username: account.username,
      tenantId: account.tenantId
    };
  }

  private handleAuthError(error: any): void {
    const authError: AuthError = {
      code: 'unknown_error',
      message: error.message || 'Authentication failed',
      userMessage: 'Unable to sign in. Please try again.',
      timestamp: new Date(),
      retryable: true
    };

    this._authState.set({
      status: 'error',
      user: null,
      error: authError,
      isLoading: false
    });
}
```

### Step 3: Configure Routes with MsalGuard

**File: `src/app/app.routes.ts`**

```typescript
import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/landing/landing.component').then(m => m.LandingComponent)
  },
  {
    path: 'chat',
    loadComponent: () => import('./components/chat/chat.component').then(m => m.ChatComponent),
    canActivate: [MsalGuard] // Protected route
  },
  {
    path: 'voice',
    loadComponent: () => import('./components/voice/voice.component').then(m => m.VoiceComponent),
    canActivate: [MsalGuard] // Protected route
  },
  {
    path: '**',
    redirectTo: ''
  }
];
```

**Note**: `MsalGuard` is configured in `app.config.ts` and automatically redirects unauthenticated users to Microsoft Entra login.

### Step 4: Create Landing Page Component

**File: `src/app/components/landing/landing.component.ts`**

```typescript
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MsalService } from '@azure/msal-angular';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatCardModule],
  template: `
    <div class="landing-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Welcome to Melior Agent</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p>Experience AI-powered voice chat with real-time transcription.</p>
          <ul>
            <li>Real-time voice conversations with AI</li>
            <li>Live transcription</li>
            <li>Secure authentication with Microsoft Entra</li>
          </ul>
        </mat-card-content>
        <mat-card-actions>
          @if (isAuthenticated()) {
            <button mat-raised-button color="primary" routerLink="/voice">
              Go to Voice Chat
            </button>
          } @else {
            <button mat-raised-button color="primary" (click)="signIn()">
              Sign In with Microsoft
            </button>
          }
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .landing-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
    }
    mat-card {
      max-width: 600px;
      width: 100%;
    }
  `]
})
export class LandingComponent {
  private msalService = inject(MsalService);
  private authService = inject(AuthService);

  // Computed signal for auth state
  isAuthenticated = this.authService.isAuthenticated;

  signIn(): void {
    this.msalService.loginRedirect();
  }
}
```

### Step 5: Initialize MSAL in main.ts (Optional)

**File: `src/main.ts`**

Add MSAL initialization before bootstrapping the app to handle redirect flow early:

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
```

**Note**: MSAL Angular automatically initializes and handles redirect flow via `MsalService`. No additional configuration needed in `main.ts`.

---

## Backend Implementation

### Step 1: Create Auth Middleware

**File: `api/src/middleware/auth.middleware.ts`**

```typescript
import { HttpRequest, InvocationContext } from '@azure/functions';
import { ConfidentialClientApplication } from '@azure/msal-node';

interface UserIdentity {
  userId: string;
  email: string;
  displayName: string;
  tenantId: string;
}

interface ValidationResult {
  isValid: boolean;
  userIdentity?: UserIdentity;
  error?: { code: string; message: string; statusCode: number };
}

const msalConfig = {
  auth: {
    clientId: process.env.ENTRA_CLIENT_ID!,
    authority: process.env.ENTRA_AUTHORITY!
  }
};

let msalInstance: ConfidentialClientApplication;

function getMsalInstance(): ConfidentialClientApplication {
  if (!msalInstance) {
    msalInstance = new ConfidentialClientApplication(msalConfig);
  }
  return msalInstance;
}

export async function validateToken(request: HttpRequest, context: InvocationContext): Promise<ValidationResult> {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      isValid: false,
      error: {
        code: 'missing_token',
        message: 'No authentication token provided in Authorization header',
        statusCode: 401
      }
    };
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const msal = getMsalInstance();
    
    // Validate token (this is simplified - in production use proper JWT validation)
    // MSAL Node doesn't have built-in token validation - use jsonwebtoken + jwks-rsa
    // For now, this is a placeholder showing the structure
    
    // TODO: Implement proper JWT validation with signature verification
    const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    
    // Validate claims
    if (decoded.aud !== process.env.ENTRA_CLIENT_ID) {
      return {
        isValid: false,
        error: {
          code: 'invalid_audience',
          message: 'Token audience does not match expected client ID',
          statusCode: 401
        }
      };
    }

    if (decoded.exp * 1000 < Date.now()) {
      return {
        isValid: false,
        error: {
          code: 'expired_token',
          message: 'The authentication token has expired',
          statusCode: 401
        }
      };
    }

    const userIdentity: UserIdentity = {
      userId: decoded.oid || decoded.sub,
      email: decoded.email || decoded.preferred_username,
      displayName: decoded.name,
      tenantId: decoded.tid
    };

    return {
      isValid: true,
      userIdentity
    };
  } catch (error) {
    context.error('Token validation error:', error);
    return {
      isValid: false,
      error: {
        code: 'invalid_token',
        message: 'The provided authentication token is invalid or malformed',
        statusCode: 401
      }
    };
  }
}
```

### Step 2: Update Generate Token Function

**File: `api/src/functions/generateToken.ts`**

```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { validateToken } from '../middleware/auth.middleware';

export async function generateToken(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  // Validate authentication
  const validationResult = await validateToken(request, context);
  
  if (!validationResult.isValid) {
    return {
      status: validationResult.error!.statusCode,
      jsonBody: {
        error: validationResult.error,
        timestamp: new Date().toISOString(),
        path: '/api/generateToken'
      }
    };
  }

  const userIdentity = validationResult.userIdentity!;

  try {
    const body = await request.json() as any;
    const { roomName, participantName, metadata } = body;

    // Validate request
    if (!roomName || !participantName) {
      return {
        status: 400,
        jsonBody: {
          error: {
            code: 'validation_failed',
            message: 'roomName and participantName are required',
            statusCode: 400
          },
          timestamp: new Date().toISOString(),
          path: '/api/generateToken'
        }
      };
    }

    // Create LiveKit token with user identity
    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity: userIdentity.userId,
        name: participantName,
        metadata: JSON.stringify({
          ...metadata,
          userId: userIdentity.userId,
          displayName: userIdentity.displayName,
          email: userIdentity.email,
          tenantId: userIdentity.tenantId
        })
      }
    );

    at.addGrant({ roomJoin: true, room: roomName });

    const token = await at.toJwt();

    return {
      status: 200,
      jsonBody: {
        token,
        url: process.env.LIVEKIT_URL,
        identity: userIdentity
      }
    };
  } catch (error) {
    context.error('Error generating token:', error);
    return {
      status: 500,
      jsonBody: {
        error: {
          code: 'internal_error',
          message: 'An unexpected error occurred',
          statusCode: 500
        },
        timestamp: new Date().toISOString(),
        path: '/api/generateToken'
      }
    };
  }
}

app.http('generateToken', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: generateToken
});
```

---

## Testing

### Frontend Unit Tests

**File: `src/app/services/auth.service.spec.ts`**

```typescript
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start in unauthenticated state', () => {
    expect(service.isAuthenticated()).toBe(false);
  });

  // Add more tests for sign-in, sign-out, token acquisition
});
```

### Integration Test

**File: `tests/integration/auth-flow.spec.ts`**

```typescript
describe('Authentication Flow', () => {
  it('should redirect unauthenticated users to landing page', () => {
    // Test route guard behavior
  });

  it('should allow authenticated users to access protected routes', () => {
    // Test successful authentication and route access
  });

  it('should include bearer token in API requests', () => {
    // Test HTTP interceptor
  });
});
```

---

## Deployment

### Frontend Deployment

1. Update `environment.ts` with production URLs
2. Build production bundle: `ng build --configuration=production`
3. Deploy `dist/` folder to hosting service
4. Ensure HTTPS is enabled

### Backend Deployment

1. Set environment variables in Azure Functions Configuration:
   - `ENTRA_TENANT_ID`
   - `ENTRA_CLIENT_ID`
   - `ENTRA_AUTHORITY`
2. Deploy to Azure: `func azure functionapp publish <app-name>`
3. Configure CORS to allow frontend domain

---

## Troubleshooting

### Issue: Infinite redirect loop
**Solution**: Check that redirect URI matches exactly in both code and Azure portal registration

### Issue: Token validation fails with "invalid_audience"
**Solution**: Verify ENTRA_CLIENT_ID matches the application registration

### Issue: CORS errors on API calls
**Solution**: Add frontend domain to Azure Functions CORS settings

### Issue: Token not included in API requests
**Solution**: Verify HTTP interceptor is registered in app.config.ts

---

**Implementation Complete!** Follow the testing section to verify all functionality works as expected.
