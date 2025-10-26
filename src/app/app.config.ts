import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
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
 * Feature: 004-entra-external-id-auth
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
      storeAuthStateInCookie: false  // Not needed for modern browsers
    },
    system: {
      loggerOptions: {
        logLevel: environment.production ? LogLevel.Error : LogLevel.Info,
        piiLoggingEnabled: false  // Never enable in production
      }
    }
  });
}

/**
 * Factory function to configure MsalGuard for route protection
 * Feature: 004-entra-external-id-auth
 */
export function MSALGuardConfigFactory(): MsalGuardConfiguration {
  return {
    interactionType: InteractionType.Redirect,
    authRequest: {
      scopes: environment.entraConfig.scopes
    },
    loginFailedRoute: '/'  // Redirect to landing page on auth failure
  };
}

/**
 * Factory function to configure MsalInterceptor for automatic token injection
 * Feature: 004-entra-external-id-auth
 */
export function MSALInterceptorConfigFactory(): MsalInterceptorConfiguration {
  const protectedResourceMap = new Map<string, Array<string>>();

  // Add Azure Functions API to protected resources for automatic token injection
  protectedResourceMap.set(
    environment.tokenApiUrl + '/*',
    environment.entraConfig.scopes
  );

  return {
    interactionType: InteractionType.Redirect,
    protectedResourceMap
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(
      withFetch(),
      withInterceptorsFromDi()  // Required for MSAL interceptor
    ),

    // MSAL Configuration for standalone components (004-entra-external-id-auth)
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

    // HTTP Interceptor for automatic token injection to protected APIs
    {
      provide: HTTP_INTERCEPTORS,
      useClass: MsalInterceptor,
      multi: true
    }
  ]
};

