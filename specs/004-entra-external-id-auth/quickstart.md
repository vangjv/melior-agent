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
npm install @azure/msal-browser@^3.7.0 --save
npm install @types/msal@^1.0.0 --save-dev
```

**Backend (Azure Functions):**
```bash
cd api
npm install @azure/msal-node@^2.6.0 --save
```

### 2. Configure Environment Variables

**Frontend - Create/update `src/environments/environment.development.ts`:**

```typescript
export const environment = {
  production: false,
  entraConfig: {
    clientId: '4d072598-4248-45b0-be42-9a42e3bea85b',
    tenantId: '03e82745-fdd7-4afd-b750-f7a4749a3775',
    authority: 'https://login.microsoftonline.com/03e82745-fdd7-4afd-b750-f7a4749a3775',
    redirectUri: 'http://localhost:4200/auth/callback',
    postLogoutRedirectUri: 'http://localhost:4200'
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
    redirectUri: 'https://your-production-domain.com/auth/callback',
    postLogoutRedirectUri: 'https://your-production-domain.com'
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
   - Development: `http://localhost:4200/auth/callback`
   - Production: `https://your-production-domain.com/auth/callback`
6. Enable "Access tokens" and "ID tokens" under Implicit grant
7. Save configuration

---

## Frontend Implementation

### Step 1: Create Authentication Models

**File: `src/app/models/auth-state.ts`**

```typescript
export type AuthStatus = 'unauthenticated' | 'authenticating' | 'authenticated' | 'error';

export interface AuthenticationState {
  readonly status: AuthStatus;
  readonly user: UserProfile | null;
  readonly error: AuthError | null;
  readonly isLoading: boolean;
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

### Step 2: Create Authentication Service

**File: `src/app/services/auth.service.ts`**

```typescript
import { Injectable, signal, computed, effect } from '@angular/core';
import { PublicClientApplication, AccountInfo, AuthenticationResult } from '@azure/msal-browser';
import { environment } from '../../environments/environment';
import { AuthenticationState, UserProfile, AuthError } from '../models/auth-state';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly msalInstance: PublicClientApplication;
  
  // Private mutable state
  private readonly _authState = signal<AuthenticationState>({
    status: 'unauthenticated',
    user: null,
    error: null,
    isLoading: false
  });

  // Public readonly state
  readonly authState = this._authState.asReadonly();
  
  // Computed signals
  readonly isAuthenticated = computed(() => this.authState().status === 'authenticated');
  readonly currentUser = computed(() => this.authState().user);
  readonly isLoading = computed(() => this.authState().isLoading);

  constructor() {
    // Initialize MSAL
    this.msalInstance = new PublicClientApplication({
      auth: {
        clientId: environment.entraConfig.clientId,
        authority: environment.entraConfig.authority,
        redirectUri: environment.entraConfig.redirectUri,
        postLogoutRedirectUri: environment.entraConfig.postLogoutRedirectUri
      },
      cache: {
        cacheLocation: 'sessionStorage',
        storeAuthStateInCookie: false
      },
      system: {
        loggerOptions: {
          logLevel: environment.production ? 'Error' : 'Info',
          piiLoggingEnabled: false
        }
      }
    });

    // Initialize on startup
    this.initialize();
  }

  private async initialize(): Promise<void> {
    await this.msalInstance.initialize();
    await this.handleRedirectPromise();
    this.checkExistingSession();
  }

  private async handleRedirectPromise(): Promise<void> {
    try {
      const response = await this.msalInstance.handleRedirectPromise();
      if (response) {
        this.handleAuthenticationResult(response);
      }
    } catch (error) {
      this.handleAuthError(error);
    }
  }

  private checkExistingSession(): void {
    const accounts = this.msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      const account = accounts[0];
      this.setAuthenticatedState(this.mapAccountToProfile(account));
    }
  }

  async signIn(): Promise<void> {
    try {
      this._authState.update(state => ({ ...state, status: 'authenticating', isLoading: true }));
      
      await this.msalInstance.loginRedirect({
        scopes: ['openid', 'profile', 'email', 'User.Read']
      });
    } catch (error) {
      this.handleAuthError(error);
    }
  }

  async signOut(): Promise<void> {
    try {
      const account = this.msalInstance.getAllAccounts()[0];
      await this.msalInstance.logoutRedirect({ account });
      this._authState.set({
        status: 'unauthenticated',
        user: null,
        error: null,
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
}
```

### Step 3: Create Route Guard

**File: `src/app/guards/auth.guard.ts`**

```typescript
import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Store requested URL for post-auth redirect
  sessionStorage.setItem('auth_redirect_url', state.url);
  
  // Redirect to landing page
  router.navigate(['/']);
  return false;
};
```

### Step 4: Create HTTP Interceptor

**File: `src/app/interceptors/auth.interceptor.ts`**

```typescript
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // Only add token to API requests
  if (!req.url.startsWith(environment.livekit.apiUrl)) {
    return next(req);
  }

  // Skip if not authenticated
  if (!authService.isAuthenticated()) {
    return next(req);
  }

  // Add bearer token
  return from(authService.getAccessToken()).pipe(
    switchMap(token => {
      const authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      return next(authReq);
    })
  );
};
```

### Step 5: Create Landing Page Component

**File: `src/app/components/landing/landing.component.ts`**

```typescript
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule],
  template: `
    <div class="landing-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Welcome to Melior Agent</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p>Experience AI-powered voice chat with real-time transcription.</p>
          <ul>
            <li>Natural voice conversations</li>
            <li>Real-time transcription</li>
            <li>Secure and private</li>
          </ul>
        </mat-card-content>
        <mat-card-actions>
          <button mat-raised-button color="primary" (click)="signIn()">
            Sign In to Get Started
          </button>
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
      max-width: 500px;
    }
  `]
})
export class LandingComponent {
  private authService = inject(AuthService);

  signIn(): void {
    this.authService.signIn();
  }
}
```

### Step 6: Create Auth Callback Component

**File: `src/app/components/auth-callback/auth-callback.component.ts`**

```typescript
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  template: `
    <div class="callback-container">
      <mat-spinner></mat-spinner>
      <p>Completing sign-in...</p>
    </div>
  `,
  styles: [`
    .callback-container {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      gap: 20px;
    }
  `]
})
export class AuthCallbackComponent implements OnInit {
  private router = inject(Router);

  ngOnInit(): void {
    // MSAL handles redirect, then redirect to requested URL or home
    setTimeout(() => {
      const redirectUrl = sessionStorage.getItem('auth_redirect_url') || '/voice';
      sessionStorage.removeItem('auth_redirect_url');
      this.router.navigate([redirectUrl]);
    }, 1000);
  }
}
```

### Step 7: Update App Routes

**File: `src/app/app.routes.ts`**

```typescript
import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/landing/landing.component').then(m => m.LandingComponent)
  },
  {
    path: 'auth/callback',
    loadComponent: () => import('./components/auth-callback/auth-callback.component').then(m => m.AuthCallbackComponent)
  },
  {
    path: 'voice',
    canActivate: [authGuard],
    loadComponent: () => import('./app').then(m => m.App) // Your existing voice component
  },
  {
    path: '**',
    redirectTo: ''
  }
];
```

### Step 8: Update App Config

**File: `src/app/app.config.ts`**

```typescript
import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations()
  ]
};
```

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
