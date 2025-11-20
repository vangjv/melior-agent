/**
 * Production environment configuration
 * 
 * SECURITY WARNING: This file is tracked in version control.
 * DO NOT commit real credentials, API keys, or production URLs to this file.
 * 
 * For deployment:
 * - Use environment variables or secure configuration management
 * - Replace placeholder values with actual production values during build/deployment
 * - Consider using CI/CD secrets or Azure Key Vault for sensitive values
 */
export const environment = {
  production: true,
  tokenApiUrl: process.env['TOKEN_API_URL'] || 'https://your-api.azurewebsites.net/api',
  liveKitUrl: process.env['LIVEKIT_URL'] || 'wss://your-project.livekit.cloud',

  // Microsoft Entra External ID configuration (004-entra-external-id-auth)
  // Replace these placeholder values with your actual configuration
  entraConfig: {
    clientId: process.env['ENTRA_CLIENT_ID'] || 'YOUR_CLIENT_ID_HERE',
    tenantId: process.env['ENTRA_TENANT_ID'] || 'YOUR_TENANT_ID_HERE',
    authority: process.env['ENTRA_AUTHORITY'] || 'https://login.microsoftonline.com/YOUR_TENANT_ID_HERE',
    redirectUri: process.env['REDIRECT_URI'] || 'https://your-production-domain.com',
    postLogoutRedirectUri: process.env['POST_LOGOUT_REDIRECT_URI'] || 'https://your-production-domain.com',
    scopes: ['openid', 'profile', 'email', 'offline_access']
  }
};
