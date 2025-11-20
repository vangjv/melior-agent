/**
 * Development environment configuration
 * 
 * SECURITY WARNING: This file is tracked in version control.
 * DO NOT commit real credentials, API keys, or personal URLs to this file.
 * 
 * For local development:
 * 1. Copy environment.development.local.ts.example to environment.development.local.ts
 * 2. Add your real credentials to environment.development.local.ts (this file is .gitignored)
 * 3. The local.ts file will override these placeholder values
 * 
 * These are example/placeholder values only.
 */
export const environment = {
  production: false,
  tokenApiUrl: 'http://localhost:7071/api',  // Backend token API (002-livekit-token-api)
  liveKitUrl: 'wss://your-project.livekit.cloud',  // Replace with your LiveKit Cloud URL

  // Microsoft Entra External ID configuration (004-entra-external-id-auth)
  // Replace these placeholder values with your actual Entra ID configuration
  entraConfig: {
    clientId: 'YOUR_CLIENT_ID_HERE',  // From Azure Portal > App Registrations
    tenantId: 'YOUR_TENANT_ID_HERE',  // From Azure Portal > App Registrations
    authority: 'https://login.microsoftonline.com/YOUR_TENANT_ID_HERE',
    redirectUri: 'http://localhost:4200',
    postLogoutRedirectUri: 'http://localhost:4200',
    scopes: ['openid', 'profile', 'email', 'offline_access']
  }
};
