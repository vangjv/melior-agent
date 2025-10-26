/**
 * Development environment configuration
 * IMPORTANT: Create environment.development.local.ts for your personal configuration
 * DO NOT commit actual credentials or local URLs to version control
 */
export const environment = {
  production: false,
  tokenApiUrl: 'http://localhost:7071/api',  // Backend token API (002-livekit-token-api)
  liveKitUrl: 'wss://meliority-ovsmyj9c.livekit.cloud',         // Local LiveKit server or wss://your-project.livekit.cloud

  // Microsoft Entra External ID configuration (004-entra-external-id-auth)
  entraConfig: {
    clientId: '4d072598-4248-45b0-be42-9a42e3bea85b',
    tenantId: '03e82745-fdd7-4afd-b750-f7a4749a3775',
    authority: 'https://login.microsoftonline.com/03e82745-fdd7-4afd-b750-f7a4749a3775',
    redirectUri: 'http://localhost:4200',
    postLogoutRedirectUri: 'http://localhost:4200',
    scopes: ['openid', 'profile', 'email', 'offline_access', 'api://4d072598-4248-45b0-be42-9a42e3bea85b/access_as_user']
  }
};
