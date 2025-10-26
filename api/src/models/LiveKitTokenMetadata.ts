/**
 * Extended metadata to include in LiveKit token for authenticated users
 * Feature: 004-entra-external-id-auth
 */
export interface LiveKitTokenMetadata {
  readonly userId: string;           // Microsoft Entra user ID
  readonly displayName: string;      // User's display name for LiveKit UI
  readonly email?: string;           // Optional: User email
  readonly tenantId: string;         // Tenant ID for multi-tenant scenarios
}
