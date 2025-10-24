/**
 * Production environment configuration
 * Set via environment variables or deployment config
 * DO NOT commit actual URLs to version control
 */
export const environment = {
  production: true,
  tokenApiUrl: 'http://localhost:7071/api',  // Azure Functions backend
  liveKitUrl: 'wss://meliority-ovsmyj9c.livekit.cloud'                     // LiveKit Cloud server
};
