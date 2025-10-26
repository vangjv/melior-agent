/**
 * User identity information extracted from validated JWT token
 * Feature: 004-entra-external-id-auth
 */
export interface UserIdentity {
  readonly userId: string;           // Object ID from token (oid claim)
  readonly email: string;            // Email from token claims
  readonly displayName: string;      // Display name from token
  readonly tenantId: string;         // Tenant ID from token
  readonly roles?: string[];         // Optional: User roles (for future RBAC)
}
