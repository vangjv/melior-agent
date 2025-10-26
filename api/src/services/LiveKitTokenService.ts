/**
 * LiveKitTokenService.ts
 * Service for generating LiveKit access tokens.
 */

import { AccessToken } from 'livekit-server-sdk';
import { TokenResponse } from '../models/TokenResponse';
import { loadLiveKitConfig } from '../utils/config';

/**
 * Interface for LiveKit token generation (enables dependency injection and testing).
 * Feature: 004-entra-external-id-auth - metadata option added
 */
export interface ILiveKitTokenGenerator {
  generateToken(
    roomName: string,
    participantIdentity: string,
    options?: {
      expirationSeconds?: number;
      participantName?: string;
      metadata?: Record<string, any>;  // User identity metadata
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
      metadata?: Record<string, any>;  // Feature: 004-entra-external-id-auth
    }
  ): Promise<string> {
    const expirationSeconds = options?.expirationSeconds || 3600;
    const participantName = options?.participantName || participantIdentity;

    // Create AccessToken instance
    const token = new AccessToken(this.apiKey, this.apiSecret, {
      identity: participantIdentity,
      name: participantName,
      ttl: expirationSeconds,
      // Feature: 004-entra-external-id-auth - Include user metadata in token
      metadata: options?.metadata ? JSON.stringify(options.metadata) : undefined
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
   * Feature: 004-entra-external-id-auth - metadata parameter added
   *
   * @param roomName - The LiveKit room name
   * @param participantIdentity - Unique participant identifier
   * @param expirationSeconds - Token expiration in seconds (default: 3600)
   * @param participantName - Display name for participant (default: participantIdentity)
   * @param metadata - Optional user identity metadata from authentication
   * @returns TokenResponse with JWT token and metadata
   */
  async generateToken(
    roomName: string,
    participantIdentity: string,
    expirationSeconds: number = 3600,
    participantName?: string,
    metadata?: Record<string, any>
  ): Promise<TokenResponse> {
    // Generate the JWT token
    const token = await this.tokenGenerator.generateToken(
      roomName,
      participantIdentity,
      {
        expirationSeconds,
        participantName,
        metadata
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
