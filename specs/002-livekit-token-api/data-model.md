# Data Model: LiveKit Token Generation API

**Feature**: 002-livekit-token-api  
**Date**: October 24, 2025  
**Status**: Phase 1 Design

## Overview

This document defines the TypeScript interfaces and data structures for the LiveKit token generation API. All models use strict TypeScript typing with no `any` types, following the MeliorAgent constitution.

---

## Core Entities

### TokenRequest

Represents an incoming HTTP request to generate a LiveKit access token.

**Purpose**: Validate and structure the parameters needed for token generation.

**Lifecycle**: Created when HTTP request is received, validated before processing, discarded after token generation.

**TypeScript Interface**:
```typescript
export interface TokenRequest {
  /**
   * The LiveKit room name the participant will join.
   * Must match pattern: ^[a-zA-Z0-9_-]+$
   * Max length: 255 characters
   */
  roomName: string;

  /**
   * Unique identifier for the participant.
   * Typically user ID or session ID from frontend.
   * Must match pattern: ^[a-zA-Z0-9_-]+$
   * Max length: 255 characters
   */
  participantIdentity: string;

  /**
   * Optional token expiration in seconds from now.
   * Default: 3600 (1 hour)
   * Min: 60, Max: 86400 (24 hours)
   */
  expirationSeconds?: number;

  /**
   * Optional participant name for display purposes.
   * If not provided, uses participantIdentity.
   */
  participantName?: string;
}
```

**Validation Rules**:
- `roomName`: Required, non-empty, matches `^[a-zA-Z0-9_-]+$`, max 255 chars
- `participantIdentity`: Required, non-empty, matches `^[a-zA-Z0-9_-]+$`, max 255 chars
- `expirationSeconds`: Optional, integer, range 60-86400
- `participantName`: Optional, max 255 chars

**Zod Schema** (for runtime validation):
```typescript
import { z } from 'zod';

export const TokenRequestSchema = z.object({
  roomName: z.string()
    .min(1, 'Room name is required')
    .max(255, 'Room name too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Room name contains invalid characters'),
  
  participantIdentity: z.string()
    .min(1, 'Participant identity is required')
    .max(255, 'Participant identity too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Participant identity contains invalid characters'),
  
  expirationSeconds: z.number()
    .int('Expiration must be an integer')
    .min(60, 'Minimum expiration is 60 seconds')
    .max(86400, 'Maximum expiration is 24 hours')
    .optional()
    .default(3600),
  
  participantName: z.string()
    .max(255, 'Participant name too long')
    .optional()
});
```

---

### TokenResponse

Represents the successful token generation result returned to the frontend.

**Purpose**: Provide the frontend with the access token and metadata needed to connect to LiveKit.

**Lifecycle**: Created after successful token generation, serialized to JSON, sent in HTTP response.

**TypeScript Interface**:
```typescript
export interface TokenResponse {
  /**
   * The JWT access token for LiveKit authentication.
   * This is a signed JWT containing room name, identity, and permissions.
   */
  token: string;

  /**
   * ISO 8601 timestamp when the token expires.
   * Example: "2025-10-24T15:30:00Z"
   */
  expiresAt: string;

  /**
   * The room name this token is valid for.
   * Included for frontend validation/debugging.
   */
  roomName: string;

  /**
   * The participant identity encoded in the token.
   * Included for frontend validation/debugging.
   */
  participantIdentity: string;
}
```

**Example JSON Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2025-10-24T16:30:00Z",
  "roomName": "consultation-room-123",
  "participantIdentity": "user-abc-456"
}
```

---

### ErrorResponse

Represents error conditions with structured error information for debugging.

**Purpose**: Provide consistent error format with actionable information for frontend developers.

**Lifecycle**: Created when validation or processing fails, serialized to JSON, sent in HTTP error response.

**TypeScript Interface**:
```typescript
export interface ErrorResponse {
  /**
   * HTTP status code (also included in response status).
   * Example: 400, 500
   */
  statusCode: number;

  /**
   * Machine-readable error code for programmatic handling.
   * Examples: "VALIDATION_ERROR", "MISSING_CREDENTIALS", "TOKEN_GENERATION_FAILED"
   */
  errorCode: string;

  /**
   * Human-readable error message for developers.
   * Should be descriptive enough for troubleshooting.
   */
  message: string;

  /**
   * Optional array of validation errors for field-level issues.
   * Only present when errorCode is "VALIDATION_ERROR".
   */
  validationErrors?: ValidationError[];

  /**
   * ISO 8601 timestamp when the error occurred.
   */
  timestamp: string;
}

export interface ValidationError {
  /**
   * The field that failed validation.
   * Example: "roomName", "participantIdentity"
   */
  field: string;

  /**
   * Description of the validation failure.
   * Example: "Room name contains invalid characters"
   */
  message: string;
}
```

**Error Code Enumeration**:
```typescript
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  MISSING_CREDENTIALS = 'MISSING_CREDENTIALS',
  TOKEN_GENERATION_FAILED = 'TOKEN_GENERATION_FAILED',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}
```

**Example JSON Response** (400 Bad Request):
```json
{
  "statusCode": 400,
  "errorCode": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "validationErrors": [
    {
      "field": "roomName",
      "message": "Room name contains invalid characters"
    }
  ],
  "timestamp": "2025-10-24T15:30:00Z"
}
```

**Example JSON Response** (500 Internal Server Error):
```json
{
  "statusCode": 500,
  "errorCode": "TOKEN_GENERATION_FAILED",
  "message": "Failed to generate LiveKit token",
  "timestamp": "2025-10-24T15:30:00Z"
}
```

---

### LiveKitConfig

Internal configuration model for LiveKit SDK initialization.

**Purpose**: Type-safe access to LiveKit API credentials from environment variables.

**Lifecycle**: Loaded once at startup (or on first request), cached in memory for subsequent requests.

**TypeScript Interface**:
```typescript
export interface LiveKitConfig {
  /**
   * LiveKit API key from Azure App Settings.
   * Environment variable: LIVEKIT_API_KEY
   */
  apiKey: string;

  /**
   * LiveKit API secret from Azure App Settings.
   * Environment variable: LIVEKIT_API_SECRET
   */
  apiSecret: string;

  /**
   * Optional LiveKit server URL.
   * Environment variable: LIVEKIT_URL
   * Default: not used for token generation (tokens are server-agnostic)
   */
  serverUrl?: string;
}
```

**Configuration Loading**:
```typescript
export function loadLiveKitConfig(): LiveKitConfig {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error('LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be configured');
  }

  return {
    apiKey,
    apiSecret,
    serverUrl: process.env.LIVEKIT_URL
  };
}
```

---

## Entity Relationships

```text
┌─────────────────┐
│ HTTP Request    │
│ (JSON Body)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      validates      ┌──────────────────┐
│ TokenRequest    │◄─────────────────── │ TokenRequest     │
│ (validated)     │                      │ Schema (Zod)     │
└────────┬────────┘                      └──────────────────┘
         │
         │ uses
         ▼
┌─────────────────┐      reads          ┌──────────────────┐
│ LiveKitToken    │◄─────────────────── │ LiveKitConfig    │
│ Service         │                      │ (from env vars)  │
└────────┬────────┘                      └──────────────────┘
         │
         ├── Success ──► TokenResponse ──► HTTP 200 + JSON
         │
         └── Failure ──► ErrorResponse ──► HTTP 4xx/5xx + JSON
```

---

## State Transitions

### Token Request Processing Flow

```text
[HTTP Request Received]
         │
         ▼
[Parse JSON Body] ──── Parse Error ──► [ErrorResponse: 400]
         │
         ▼
[Validate with Zod] ── Validation Error ──► [ErrorResponse: 400]
         │
         ▼
[Load LiveKitConfig] ── Missing Credentials ──► [ErrorResponse: 500]
         │
         ▼
[Generate Token] ──── Generation Error ──► [ErrorResponse: 500]
         │
         ▼
[Build TokenResponse]
         │
         ▼
[Return HTTP 200]
```

---

## Type Safety Guarantees

1. **No `any` Types**: All interfaces use explicit types
2. **Runtime Validation**: Zod schemas validate request payloads at runtime
3. **Compile-time Checks**: TypeScript compiler ensures type correctness
4. **Discriminated Unions**: Error codes use string literal types for exhaustiveness checking
5. **Immutability**: All interfaces represent immutable data structures

---

## Testing Considerations

### Unit Test Fixtures
```typescript
export const mockTokenRequest: TokenRequest = {
  roomName: 'test-room',
  participantIdentity: 'test-user',
  expirationSeconds: 3600,
  participantName: 'Test User'
};

export const mockTokenResponse: TokenResponse = {
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock.token',
  expiresAt: '2025-10-24T16:30:00Z',
  roomName: 'test-room',
  participantIdentity: 'test-user'
};

export const mockLiveKitConfig: LiveKitConfig = {
  apiKey: 'test-api-key',
  apiSecret: 'test-api-secret'
};
```

### Validation Test Cases
- Valid request with all fields
- Valid request with minimal fields (no optional params)
- Invalid room name (special characters, too long)
- Invalid participant identity (special characters, too long)
- Invalid expiration (too short, too long, non-integer)
- Missing required fields

---

## Security Considerations

1. **No Sensitive Data in Logs**: Never log `apiSecret` or generated tokens
2. **Input Sanitization**: Validate all string inputs match allowed patterns
3. **Token Scope**: Tokens are room-specific and time-limited
4. **No Token Storage**: Tokens generated on-demand, not cached or persisted
5. **Environment Variables**: Credentials never hardcoded, always from secure configuration

---

## Next Steps

- Define OpenAPI contract for `/api/token` endpoint
- Implement TypeScript interfaces in `api/src/models/`
- Create Zod validation schemas
- Write unit tests for validation logic
