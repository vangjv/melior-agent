/**
 * Production environment configuration
 * DO NOT commit actual LiveKit credentials to version control
 */
export const environment = {
  production: true,
  livekit: {
    serverUrl: '', // Set via environment variable or deployment config
  },
};
