# Data Model: Voice Chat Transcription App

**Feature**: 001-voice-chat-transcription  
**Date**: 2025-10-24  
**Purpose**: Define TypeScript interfaces and models for all entities

## Overview

This document defines the TypeScript data models for the voice chat transcription application. All models use strict typing and follow Angular best practices with readonly properties where appropriate.

## Core Entities

### 1. Connection State

Represents the state of the LiveKit voice connection using a discriminated union for type-safe state management.

```typescript
/**
 * Connection state discriminated union
 * Enables exhaustive type checking in switch/if statements
 */
export type ConnectionState = 
  | DisconnectedState
  | ConnectingState
  | ConnectedState
  | ReconnectingState
  | ErrorState;

export interface DisconnectedState {
  readonly status: 'disconnected';
}

export interface ConnectingState {
  readonly status: 'connecting';
  readonly startedAt: Date;
}

export interface ConnectedState {
  readonly status: 'connected';
  readonly roomName: string;
  readonly sessionId: string;
  readonly connectedAt: Date;
  readonly connectionQuality: ConnectionQuality;
}

export interface ReconnectingState {
  readonly status: 'reconnecting';
  readonly attempt: number;
  readonly maxAttempts: number;
  readonly lastError?: ConnectionError;
}

export interface ErrorState {
  readonly status: 'error';
  readonly error: ConnectionError;
}

export type ConnectionQuality = 'excellent' | 'good' | 'poor' | 'unknown';
```

**Validation Rules**:
- `attempt` must be >= 1 and <= `maxAttempts`
- `maxAttempts` default value: 5
- `sessionId` must be a valid UUID when in connected state
- `connectedAt` must be >= `startedAt` from connecting state

**State Transitions**:
```
disconnected -> connecting -> connected -> reconnecting -> connected
                   ↓              ↓            ↓
                 error         error        error
                   ↓              ↓            ↓
              disconnected   disconnected  disconnected
```

### 2. Connection Error

Represents errors that can occur during connection lifecycle.

```typescript
/**
 * Connection error with categorized error codes
 */
export interface ConnectionError {
  readonly code: ConnectionErrorCode;
  readonly message: string;
  readonly timestamp: Date;
  readonly originalError?: unknown;
  readonly recoverable: boolean;
}

export type ConnectionErrorCode =
  | 'PERMISSION_DENIED'
  | 'MICROPHONE_NOT_FOUND'
  | 'NETWORK_ERROR'
  | 'SERVER_UNAVAILABLE'
  | 'AUTHENTICATION_FAILED'
  | 'ROOM_NOT_FOUND'
  | 'TIMEOUT'
  | 'UNKNOWN';

/**
 * Maps error codes to user-friendly messages
 */
export const ERROR_MESSAGES: Record<ConnectionErrorCode, string> = {
  PERMISSION_DENIED: 'Microphone access denied. Please grant permission in your browser settings.',
  MICROPHONE_NOT_FOUND: 'No microphone detected. Please connect a microphone and try again.',
  NETWORK_ERROR: 'Network connection lost. Please check your internet connection.',
  SERVER_UNAVAILABLE: 'Voice service is currently unavailable. Please try again later.',
  AUTHENTICATION_FAILED: 'Failed to authenticate. Please refresh and try again.',
  ROOM_NOT_FOUND: 'Voice chat room not found. Please contact support.',
  TIMEOUT: 'Connection timeout. Please try again.',
  UNKNOWN: 'An unexpected error occurred. Please try again.',
};
```

**Validation Rules**:
- `message` must not be empty
- `timestamp` must be a valid Date object
- `recoverable` determines if auto-retry should be attempted

### 3. Transcription Message

Represents a single transcribed utterance from either the user or the agent.

```typescript
/**
 * Transcription message entity
 */
export interface TranscriptionMessage {
  readonly id: string;
  readonly speaker: Speaker;
  readonly text: string;
  readonly timestamp: Date;
  readonly confidence?: number;
  readonly isFinal: boolean;
  readonly language?: string;
}

export type Speaker = 'user' | 'agent';

/**
 * Partial transcription for interim results
 */
export interface InterimTranscription {
  readonly speaker: Speaker;
  readonly text: string;
  readonly timestamp: Date;
}
```

**Validation Rules**:
- `id` must be unique across all messages in a session
- `text` must not be empty for final transcriptions
- `confidence` must be between 0.0 and 1.0 if provided
- `isFinal` indicates if this is a final or interim transcription
- `timestamp` must be in chronological order within a session
- `language` follows ISO 639-1 format (e.g., 'en', 'es')

**Field Descriptions**:
- `id`: Unique identifier (UUID recommended)
- `speaker`: Who spoke the message
- `text`: Transcribed text content
- `timestamp`: When the message was spoken
- `confidence`: Speech recognition confidence score (0-1)
- `isFinal`: True if transcription is final, false if interim/streaming
- `language`: Detected or configured language code

### 4. Voice Session

Represents the overall user interaction session with the voice agent.

```typescript
/**
 * Voice session entity
 * Tracks the complete conversation lifecycle
 */
export interface VoiceSession {
  readonly sessionId: string;
  readonly startTime: Date;
  readonly endTime?: Date;
  readonly transcriptions: readonly TranscriptionMessage[];
  readonly connectionQuality: ConnectionQuality;
  readonly metadata: SessionMetadata;
}

export interface SessionMetadata {
  readonly roomName: string;
  readonly participantId: string;
  readonly agentVersion?: string;
  readonly userAgent: string;
  readonly platform: 'ios' | 'android' | 'web';
  readonly totalDuration?: number; // in seconds
}
```

**Validation Rules**:
- `sessionId` must be a valid UUID
- `startTime` must be <= current time
- `endTime` must be >= `startTime` if provided
- `transcriptions` array is readonly to prevent external mutations
- `totalDuration` calculated as `(endTime - startTime) / 1000` when session ends
- `userAgent` captured from `navigator.userAgent`

**Relationships**:
- One session contains many transcription messages
- Session lifetime spans from connect to disconnect
- Transcriptions persist after session ends

### 5. LiveKit Configuration

Represents the configuration needed to connect to LiveKit service.

```typescript
/**
 * LiveKit connection configuration
 */
export interface LiveKitConfig {
  readonly serverUrl: string;
  readonly token: string;
  readonly roomName: string;
  readonly options?: RoomOptions;
}

export interface RoomOptions {
  readonly adaptiveStream?: boolean;
  readonly dynacast?: boolean;
  readonly audioCaptureDefaults?: AudioCaptureOptions;
  readonly reconnectPolicy?: ReconnectPolicy;
}

export interface AudioCaptureOptions {
  readonly autoGainControl?: boolean;
  readonly echoCancellation?: boolean;
  readonly noiseSuppression?: boolean;
  readonly sampleRate?: number;
  readonly channelCount?: number;
}

export interface ReconnectPolicy {
  readonly maxRetries: number;
  readonly retryDelayMs: number;
  readonly maxRetryDelayMs: number;
}
```

**Default Values**:
```typescript
export const DEFAULT_ROOM_OPTIONS: RoomOptions = {
  adaptiveStream: true,
  dynacast: true,
  audioCaptureDefaults: {
    autoGainControl: true,
    echoCancellation: true,
    noiseSuppression: true,
    sampleRate: 48000,
    channelCount: 1,
  },
  reconnectPolicy: {
    maxRetries: 5,
    retryDelayMs: 1000,
    maxRetryDelayMs: 30000,
  },
};
```

**Validation Rules**:
- `serverUrl` must be a valid WebSocket URL (ws:// or wss://)
- `token` must be a non-empty string (JWT format)
- `roomName` must match regex: `^[a-zA-Z0-9_-]+$` (alphanumeric, underscore, hyphen)
- `maxRetries` must be >= 0
- `retryDelayMs` must be > 0
- `maxRetryDelayMs` must be >= `retryDelayMs`

### 6. Token Request/Response Models

Represents the data models for communicating with the backend token API (002-livekit-token-api).

```typescript
/**
 * Request payload for token generation API
 */
export interface TokenRequest {
  readonly roomName: string;
  readonly participantIdentity: string;
  readonly expirationMinutes?: number;
}

/**
 * Success response from token generation API
 */
export interface TokenResponse {
  readonly token: string;
  readonly expiresAt: string;  // ISO 8601 timestamp
  readonly roomName: string;
  readonly participantIdentity: string;
}

/**
 * Error response from token generation API
 */
export interface TokenApiError {
  readonly statusCode: number;
  readonly error: string;
  readonly message: string;
  readonly details?: Record<string, string[]>;  // Validation errors
}
```

**Validation Rules**:
- `roomName` must match regex: `^[a-zA-Z0-9_-]+$`, max length 128 characters
- `participantIdentity` must be non-empty string, max length 64 characters
- `expirationMinutes` if provided must be between 1 and 1440 (24 hours)
- `expiresAt` must be a valid ISO 8601 timestamp
- `token` must be a valid JWT string (format validated by LiveKit SDK)

**Usage Pattern**:
```typescript
// Request token from backend API
const request: TokenRequest = {
  roomName: 'voice-session-123',
  participantIdentity: 'user-abc',
  expirationMinutes: 60
};

// Use token to connect to LiveKit
const response: TokenResponse = await tokenService.generateToken(request);
const config: LiveKitConfig = {
  serverUrl: environment.liveKitUrl,
  token: response.token,
  roomName: response.roomName
};
```

**Error Handling**:
```typescript
try {
  const token = await tokenService.generateToken(request);
} catch (error) {
  if (isTokenApiError(error)) {
    // Handle specific API errors
    if (error.statusCode === 400) {
      // Show validation errors from error.details
    } else if (error.statusCode === 500) {
      // Retry or show generic error
    }
  }
}

function isTokenApiError(error: unknown): error is TokenApiError {
  return typeof error === 'object' && 
         error !== null && 
         'statusCode' in error;
}
```

**Integration Notes**:
- Backend API endpoint: `POST /api/token`
- See `specs/002-livekit-token-api/contracts/token-api.openapi.yaml` for full API specification
- CORS must be configured on backend to allow frontend origin
- HTTP client should implement retry logic for 5xx errors

## UI Models

### 7. Connection Button State

Represents the state of the connection button UI component.

```typescript
/**
 * Connection button UI state
 */
export interface ConnectionButtonState {
  readonly label: string;
  readonly disabled: boolean;
  readonly loading: boolean;
  readonly variant: 'connect' | 'disconnect' | 'reconnect';
  readonly ariaLabel: string;
}

/**
 * Derives button state from connection state
 */
export function deriveButtonState(connectionState: ConnectionState): ConnectionButtonState {
  switch (connectionState.status) {
    case 'disconnected':
      return {
        label: 'Connect',
        disabled: false,
        loading: false,
        variant: 'connect',
        ariaLabel: 'Connect to voice agent',
      };
    case 'connecting':
      return {
        label: 'Connecting...',
        disabled: true,
        loading: true,
        variant: 'connect',
        ariaLabel: 'Connecting to voice agent',
      };
    case 'connected':
      return {
        label: 'Disconnect',
        disabled: false,
        loading: false,
        variant: 'disconnect',
        ariaLabel: 'Disconnect from voice agent',
      };
    case 'reconnecting':
      return {
        label: `Reconnecting (${connectionState.attempt}/${connectionState.maxAttempts})`,
        disabled: true,
        loading: true,
        variant: 'reconnect',
        ariaLabel: `Reconnecting to voice agent, attempt ${connectionState.attempt}`,
      };
    case 'error':
      return {
        label: 'Reconnect',
        disabled: false,
        loading: false,
        variant: 'reconnect',
        ariaLabel: 'Reconnect to voice agent after error',
      };
  }
}
```

### 7. Transcription Display State

Represents the state of the transcription display component.

```typescript
/**
 * Transcription display UI state
 */
export interface TranscriptionDisplayState {
  readonly messages: readonly TranscriptionMessage[];
  readonly interimMessage?: InterimTranscription;
  readonly autoScroll: boolean;
  readonly virtualScrollEnabled: boolean;
  readonly emptyStateMessage: string;
}

/**
 * Filters and sorts messages for display
 */
export interface TranscriptionFilters {
  readonly speaker?: Speaker;
  readonly dateRange?: { start: Date; end: Date };
  readonly searchQuery?: string;
}
```

## Type Guards

Utility functions for type-safe narrowing of discriminated unions.

```typescript
/**
 * Type guards for connection states
 */
export function isConnectedState(state: ConnectionState): state is ConnectedState {
  return state.status === 'connected';
}

export function isErrorState(state: ConnectionState): state is ErrorState {
  return state.status === 'error';
}

export function isReconnectingState(state: ConnectionState): state is ReconnectingState {
  return state.status === 'reconnecting';
}

/**
 * Type guard for final transcriptions
 */
export function isFinalTranscription(
  message: TranscriptionMessage | InterimTranscription
): message is TranscriptionMessage {
  return 'isFinal' in message && message.isFinal === true;
}
```

## Validation Utilities

```typescript
/**
 * Validates transcription message
 */
export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
}

export function validateTranscriptionMessage(
  message: TranscriptionMessage
): ValidationResult {
  const errors: string[] = [];

  if (!message.id || message.id.trim() === '') {
    errors.push('Message ID is required');
  }

  if (message.isFinal && (!message.text || message.text.trim() === '')) {
    errors.push('Final transcription text cannot be empty');
  }

  if (message.confidence !== undefined && 
      (message.confidence < 0 || message.confidence > 1)) {
    errors.push('Confidence must be between 0 and 1');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

## Model Relationships

```
VoiceSession (1) ──── contains ──── (many) TranscriptionMessage
     │
     │ has
     │
     └── ConnectionState (1)
              │
              │ may have
              │
              └── ConnectionError (0..1)
```

## Summary

All entities from the feature specification have been modeled with strict TypeScript types:

1. **ConnectionState**: Discriminated union for type-safe connection lifecycle
2. **ConnectionError**: Categorized error handling with recovery flags
3. **TranscriptionMessage**: Core message entity with speaker, text, and metadata
4. **VoiceSession**: Session container with metadata and transcription history
5. **LiveKitConfig**: Configuration for LiveKit service connection
6. **UI Models**: Button and display states derived from core entities

These models support:
- ✅ Type-safe state transitions
- ✅ Validation rules for data integrity
- ✅ Accessibility through ARIA labels
- ✅ Performance optimization (readonly arrays, computed states)
- ✅ Testability through pure functions and type guards
