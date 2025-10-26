/**
 * Production environment configuration
 * Set via environment variables or deployment config
 * DO NOT commit actual URLs to version control
 */
export const environment = {
  production: true,
  tokenApiUrl: 'http://localhost:7071/api',  // Azure Functions backend
  liveKitUrl: 'wss://meliority-ovsmyj9c.livekit.cloud',  // LiveKit Cloud server

  // Microsoft Entra External ID configuration (004-entra-external-id-auth)
  entraConfig: {
    clientId: '4d072598-4248-45b0-be42-9a42e3bea85b',
    tenantId: '03e82745-fdd7-4afd-b750-f7a4749a3775',
    authority: 'https://login.microsoftonline.com/03e82745-fdd7-4afd-b750-f7a4749a3775',
    redirectUri: 'https://your-production-domain.com',  // Update with actual production domain
    postLogoutRedirectUri: 'https://your-production-domain.com',  // Update with actual production domain
    scopes: ['openid', 'profile', 'email', 'offline_access']
  }
};
