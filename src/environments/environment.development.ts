/**
 * Development environment configuration
 * IMPORTANT: Create environment.development.local.ts for your personal LiveKit credentials
 * DO NOT commit actual credentials to version control
 */
export const environment = {
  production: false,
  livekit: {
    serverUrl: 'wss://your-project.livekit.cloud', // Replace with your LiveKit server URL
    // Note: In production, get token from backend API
    // For development, generate tokens at https://cloud.livekit.io
  },
};
