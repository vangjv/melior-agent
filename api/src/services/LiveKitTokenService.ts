/**
 * LiveKitTokenService.ts
 * Service for generating LiveKit access tokens.
 */

import { AccessToken } from 'livekit-server-sdk';
import { TokenResponse } from '../models/TokenResponse';
import { loadLiveKitConfig } from '../utils/config';

/**
 * Interface for LiveKit token generation (enables dependency injection and testing).
 */
export interface ILiveKitTokenGenerator {
  generateToken(
    roomName: string,
    participantIdentity: string,
    options?: {
      expirationSeconds?: number;
      participantName?: string;
    }
  ): Promise<string>;
}

/**
 * Real LiveKit token generator using the LiveKit SDK.
 */
export class LiveKitTokenGenerator implements ILiveKitTokenGenerator {
  private apiKey: string;
  private apiSecret: string;

  constructor() {
    const config = loadLiveKitConfig();
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
  }

  async generateToken(
    roomName: string,
    participantIdentity: string,
    options?: {
      expirationSeconds?: number;
      participantName?: string;
    }
  ): Promise<string> {
    const expirationSeconds = options?.expirationSeconds || 3600;
    const participantName = options?.participantName || participantIdentity;

    // Create AccessToken instance
    const token = new AccessToken(this.apiKey, this.apiSecret, {
      identity: participantIdentity,
      name: participantName,
      ttl: expirationSeconds
    });

    // Grant audio permissions
    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true
    });

    // Generate JWT
    return await token.toJwt();
  }
}

/**
 * Service for generating LiveKit access tokens.
 */
export class LiveKitTokenService {
  constructor(private tokenGenerator: ILiveKitTokenGenerator) {}

  /**
   * Generates a LiveKit access token for a participant to join a room.
   *
   * @param roomName - The LiveKit room name
   * @param participantIdentity - Unique participant identifier
   * @param expirationSeconds - Token expiration in seconds (default: 3600)
   * @param participantName - Display name for participant (default: participantIdentity)
   * @returns TokenResponse with JWT token and metadata
   */
  async generateToken(
    roomName: string,
    participantIdentity: string,
    expirationSeconds: number = 3600,
    participantName?: string
  ): Promise<TokenResponse> {
    // Generate the JWT token
    const token = await this.tokenGenerator.generateToken(
      roomName,
      participantIdentity,
      {
        expirationSeconds,
        participantName
      }
    );

    // Calculate expiration timestamp
    const expiresAt = new Date(Date.now() + expirationSeconds * 1000).toISOString();

    return {
      token,
      expiresAt,
      roomName,
      participantIdentity
    };
  }
}
