# Service Contracts: Voice Chat Transcription App

**Feature**: 001-voice-chat-transcription  
**Date**: 2025-10-24  
**Purpose**: Define service contracts and interfaces for LiveKit integration

## Overview

This document defines the service contracts (interfaces) between the Angular application and the LiveKit voice service. Since LiveKit uses WebRTC and real-time events (not REST APIs), these contracts define the expected event interfaces and service methods.

## Contract Type

**Pattern**: Event-Driven WebRTC Integration  
**Protocol**: WebRTC over WebSocket with LiveKit SDK  
**Data Format**: Real-time audio streams + JSON events

---

## 1. Connection Service Contract

### ILiveKitConnectionService

Defines the contract for managing LiveKit voice connections.

```typescript
/**
 * Service interface for LiveKit connection management
 */
export interface ILiveKitConnectionService {
  /**
   * Current connection state (Signal)
   */
  readonly connectionState: Signal<ConnectionState>;

  /**
   * Current session information (Signal)
   */
  readonly currentSession: Signal<VoiceSession | null>;

  /**
   * Connection quality metrics (Signal)
   */
  readonly connectionQuality: Signal<ConnectionQuality>;

  /**
   * Initiate connection to LiveKit room
   * @param config LiveKit connection configuration
   * @returns Promise that resolves when connected or rejects on error
   */
  connect(config: LiveKitConfig): Promise<void>;

  /**
   * Disconnect from current LiveKit session
   * @returns Promise that resolves when disconnected
   */
  disconnect(): Promise<void>;

  /**
   * Attempt manual reconnection after error
   * @returns Promise that resolves when reconnected
   */
  reconnect(): Promise<void>;

  /**
   * Get current microphone permission status
   * @returns Promise with permission state
   */
  checkMicrophonePermission(): Promise<PermissionState>;

  /**
   * Request microphone permission from user
   * @returns Promise with granted permission
   */
  requestMicrophonePermission(): Promise<boolean>;
}
```

### Connection Events

```typescript
/**
 * Events emitted by connection service
 */
export interface ConnectionServiceEvents {
  /**
   * Emitted when connection state changes
   */
  onConnectionStateChange: Observable<ConnectionState>;

  /**
   * Emitted when connection quality changes
   */
  onConnectionQualityChange: Observable<ConnectionQuality>;

  /**
   * Emitted when connection error occurs
   */
  onConnectionError: Observable<ConnectionError>;

  /**
   * Emitted when reconnection attempt starts
   */
  onReconnectionAttempt: Observable<{ attempt: number; maxAttempts: number }>;
}
```

---

## 2. Transcription Service Contract

### ITranscriptionService

Defines the contract for managing real-time transcription.

```typescript
/**
 * Service interface for transcription management
 */
export interface ITranscriptionService {
  /**
   * All transcription messages for current session (Signal)
   */
  readonly transcriptions: Signal<readonly TranscriptionMessage[]>;

  /**
   * Current interim (non-final) transcription (Signal)
   */
  readonly interimTranscription: Signal<InterimTranscription | null>;

  /**
   * Total message count (Computed Signal)
   */
  readonly messageCount: Signal<number>;

  /**
   * Start listening for transcriptions from LiveKit room
   * @param room Connected LiveKit Room instance
   */
  startTranscription(room: Room): void;

  /**
   * Stop listening for transcriptions
   */
  stopTranscription(): void;

  /**
   * Clear all transcriptions
   */
  clearTranscriptions(): void;

  /**
   * Get transcriptions filtered by speaker
   * @param speaker Speaker to filter by
   * @returns Filtered messages
   */
  getMessagesBySpeaker(speaker: Speaker): TranscriptionMessage[];

  /**
   * Export transcription history as text
   * @returns Formatted transcription text
   */
  exportTranscriptionText(): string;
}
```

### Transcription Events

```typescript
/**
 * Events emitted by transcription service
 */
export interface TranscriptionServiceEvents {
  /**
   * Emitted when a new final transcription is received
   */
  onTranscriptionReceived: Observable<TranscriptionMessage>;

  /**
   * Emitted when interim transcription updates
   */
  onInterimTranscription: Observable<InterimTranscription>;

  /**
   * Emitted when transcription error occurs
   */
  onTranscriptionError: Observable<Error>;
}
```

---

## 3. LiveKit Room Events Contract

### LiveKit SDK Events Used

Documents the LiveKit SDK events that the application consumes.

```typescript
/**
 * LiveKit Room events consumed by the application
 * Source: livekit-client SDK
 */
export enum LiveKitRoomEvents {
  /**
   * Emitted when connection to room is established
   */
  CONNECTED = 'connected',

  /**
   * Emitted when disconnected from room
   */
  DISCONNECTED = 'disconnected',

  /**
   * Emitted when reconnection is in progress
   */
  RECONNECTING = 'reconnecting',

  /**
   * Emitted when successfully reconnected
   */
  RECONNECTED = 'reconnected',

  /**
   * Emitted when connection quality changes
   */
  CONNECTION_QUALITY_CHANGED = 'connectionQualityChanged',

  /**
   * Emitted when transcription data is received
   */
  TRANSCRIPTION_RECEIVED = 'transcriptionReceived',

  /**
   * Emitted when a participant joins the room
   */
  PARTICIPANT_CONNECTED = 'participantConnected',

  /**
   * Emitted when a participant leaves the room
   */
  PARTICIPANT_DISCONNECTED = 'participantDisconnected',

  /**
   * Emitted when audio track is published
   */
  TRACK_PUBLISHED = 'trackPublished',

  /**
   * Emitted when audio track is unpublished
   */
  TRACK_UNPUBLISHED = 'trackUnpublished',
}
```

### LiveKit Transcription Segment Interface

```typescript
/**
 * Transcription segment from LiveKit SDK
 * Maps to our TranscriptionMessage model
 */
export interface LiveKitTranscriptionSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  final: boolean;
  language: string;
  participantIdentity?: string;
}

/**
 * Maps LiveKit segment to application TranscriptionMessage
 */
export function mapLiveKitSegmentToMessage(
  segment: LiveKitTranscriptionSegment,
  localParticipantId: string
): TranscriptionMessage {
  return {
    id: segment.id,
    speaker: segment.participantIdentity === localParticipantId ? 'user' : 'agent',
    text: segment.text,
    timestamp: new Date(segment.startTime),
    isFinal: segment.final,
    language: segment.language,
  };
}
```

---

## 4. Configuration Service Contract

### IConfigurationService

Defines how the application retrieves LiveKit configuration.

```typescript
/**
 * Service interface for application configuration
 */
export interface IConfigurationService {
  /**
   * Get LiveKit connection configuration
   * This would typically call a backend API to get a token
   * @returns Promise with LiveKit config
   */
  getLiveKitConfig(): Promise<LiveKitConfig>;

  /**
   * Get application feature flags
   * @returns Feature configuration
   */
  getFeatureFlags(): Promise<FeatureFlags>;
}

export interface FeatureFlags {
  readonly enableVirtualScrolling: boolean;
  readonly enableTranscriptionExport: boolean;
  readonly enableAutoGainControl: boolean;
  readonly enableEchoCancellation: boolean;
  readonly enableNoiseSuppression: boolean;
  readonly maxTranscriptionHistory: number;
}
```

---

## 5. Component Contracts

### Voice Chat Component Interface

```typescript
/**
 * Public interface for VoiceChatComponent
 */
export interface IVoiceChatComponent {
  /**
   * Current connection state
   */
  readonly connectionState: Signal<ConnectionState>;

  /**
   * Transcription messages
   */
  readonly transcriptions: Signal<readonly TranscriptionMessage[]>;

  /**
   * Initiate connection
   */
  connect(): void;

  /**
   * Disconnect from session
   */
  disconnect(): void;

  /**
   * Retry connection after error
   */
  retry(): void;
}
```

### Connection Button Component Interface

```typescript
/**
 * Public interface for ConnectionButtonComponent
 */
export interface IConnectionButtonComponent {
  /**
   * Input: Current connection state
   */
  connectionState: InputSignal<ConnectionState>;

  /**
   * Output: User clicked button
   */
  buttonClick: OutputEmitterRef<void>;

  /**
   * Output: Connection action requested
   */
  connectionAction: OutputEmitterRef<'connect' | 'disconnect' | 'reconnect'>;
}
```

### Transcription Display Component Interface

```typescript
/**
 * Public interface for TranscriptionDisplayComponent
 */
export interface ITranscriptionDisplayComponent {
  /**
   * Input: Messages to display
   */
  messages: InputSignal<readonly TranscriptionMessage[]>;

  /**
   * Input: Enable auto-scroll
   */
  autoScroll: InputSignal<boolean>;

  /**
   * Input: Enable virtual scrolling (for long lists)
   */
  virtualScrolling: InputSignal<boolean>;

  /**
   * Output: User toggled auto-scroll
   */
  autoScrollToggle: OutputEmitterRef<boolean>;

  /**
   * Scroll to latest message
   */
  scrollToLatest(): void;

  /**
   * Scroll to specific message
   */
  scrollToMessage(messageId: string): void;
}
```

---

## 6. Error Handling Contract

### Error Handler Interface

```typescript
/**
 * Global error handler for LiveKit errors
 */
export interface ILiveKitErrorHandler {
  /**
   * Handle connection error
   * @param error Error object
   * @returns Processed ConnectionError
   */
  handleConnectionError(error: unknown): ConnectionError;

  /**
   * Handle transcription error
   * @param error Error object
   * @returns Processed error message
   */
  handleTranscriptionError(error: unknown): string;

  /**
   * Determine if error is recoverable
   * @param error Error object
   * @returns True if auto-retry should be attempted
   */
  isRecoverable(error: ConnectionError): boolean;
}
```

---

## 7. Testing Contracts

### Mock LiveKit Room Interface

```typescript
/**
 * Mock LiveKit Room for testing
 * Implements subset of Room API needed for tests
 */
export interface IMockLiveKitRoom {
  state: 'connected' | 'disconnected' | 'reconnecting';
  
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  
  simulateDisconnection(): void;
  simulateReconnection(): void;
  simulateTranscription(segment: LiveKitTranscriptionSegment): void;
  simulateConnectionQualityChange(quality: ConnectionQuality): void;
  
  on(event: string, callback: (...args: any[]) => void): void;
  off(event: string, callback: (...args: any[]) => void): void;
}
```

---

## Contract Summary

### Service Dependencies

```
┌─────────────────────────────┐
│   VoiceChatComponent        │
│  (Smart Component)          │
└──────────┬──────────────────┘
           │
           ├─── uses ───> ILiveKitConnectionService
           │                      │
           │                      └─── wraps ───> LiveKit SDK Room
           │
           └─── uses ───> ITranscriptionService
                                  │
                                  └─── listens to ───> LiveKit Transcription Events
```

### Event Flow

```
User Action (Connect Button)
    ↓
VoiceChatComponent.connect()
    ↓
ILiveKitConnectionService.connect()
    ↓
LiveKit SDK Room.connect()
    ↓
RoomEvent.CONNECTED emitted
    ↓
ConnectionState Signal updates
    ↓
UI updates (Angular Signals + OnPush)
    ↓
ITranscriptionService.startTranscription()
    ↓
RoomEvent.TRANSCRIPTION_RECEIVED emitted
    ↓
Transcriptions Signal updates
    ↓
Transcription Display Component renders
```

### Key Contracts Delivered

1. **ILiveKitConnectionService**: Connection lifecycle management
2. **ITranscriptionService**: Real-time transcription handling
3. **LiveKit Event Mappings**: SDK events to application models
4. **Component Interfaces**: Input/output contracts for all components
5. **Error Handling**: Standardized error processing
6. **Testing Mocks**: Mock interfaces for unit testing

All contracts support:
- ✅ Type-safe Angular Signals
- ✅ Observable event streams (RxJS)
- ✅ Testable with dependency injection
- ✅ Clear separation of concerns
- ✅ Immutable data patterns
