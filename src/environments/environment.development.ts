/**
 * Development environment configuration
 * IMPORTANT: Create environment.development.local.ts for your personal configuration
 * DO NOT commit actual credentials or local URLs to version control
 */
export const environment = {
  production: false,
  tokenApiUrl: 'http://localhost:7071/api',  // Backend token API (002-livekit-token-api)
  liveKitUrl: 'ws://localhost:7880'           // Local LiveKit server or wss://your-project.livekit.cloud
};
