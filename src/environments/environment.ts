/**
 * Production environment configuration
 * DO NOT commit actual LiveKit credentials to version control
 */
export const environment = {
  production: true,
  livekit: {
    serverUrl: 'wss://meliority-ovsmyj9c.livekit.cloud', // Set via environment variable or deployment config
  },
};
