# Data Model: Auto-Disconnect on Idle Activity

**Feature**: 006-auto-disconnect-idle  
**Phase**: 1 - Design & Contracts  
**Date**: 2025-10-27

## Overview

This document defines the TypeScript interfaces and types for the idle timeout feature. All types follow strict TypeScript conventions and align with existing project patterns.

---

## Core Entities

### IdleTimeoutConfig

Represents configuration for idle timeout behavior.

**Purpose**: Stores user preferences for timeout duration and warning threshold.

**Fields**:

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `durationSeconds` | `number` | Yes | `120` | Total idle time before auto-disconnect (in seconds). Must be >= 30 and <= 3600. |
| `warningThresholdSeconds` | `number` | Yes | `30` | Time before timeout to show warning (in seconds). Must be > 0 and < durationSeconds. |
| `enabled` | `boolean` | Yes | `true` | Whether idle timeout monitoring is active. |

**Validation Rules**:
- `durationSeconds` must be between 30 and 3600 (30 seconds to 60 minutes)
- `warningThresholdSeconds` must be less than `durationSeconds`
- `warningThresholdSeconds` must be at least 5 seconds
- All numeric values must be positive integers

**Example**:
```typescript
const config: IdleTimeoutConfig = {
  durationSeconds: 120,
  warningThresholdSeconds: 30,
  enabled: true
};
```

**Storage**: Persisted in browser sessionStorage under key `melior-agent:idle-timeout-config`

---

### IdleTimerState

Represents the current state of the idle timeout timer.

**Purpose**: Tracks active timer status and remaining time for UI display.

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `isActive` | `boolean` | Yes | Whether the timer is currently running. |
| `timeRemaining` | `number` | Yes | Seconds remaining until timeout (0 when inactive). |
| `isWarning` | `boolean` | Yes | Whether the warning threshold has been reached. |
| `lastActivity` | `Date \| null` | Yes | Timestamp of last activity that reset the timer (null if no activity). |

**Computed Properties** (via Angular computed signals):
- `percentRemaining`: `(timeRemaining / totalDuration) * 100`
- `formattedTime`: Time displayed as "MM:SS" format

**State Transitions**:
1. **Inactive → Active**: When voice chat connection established
2. **Active → Reset**: When transcription or chat message received
3. **Active → Warning**: When `timeRemaining <= warningThresholdSeconds`
4. **Warning → Timeout**: When `timeRemaining === 0`
5. **Active → Inactive**: When user manually disconnects

**Example**:
```typescript
const state: IdleTimerState = {
  isActive: true,
  timeRemaining: 45,
  isWarning: true,
  lastActivity: new Date('2025-10-27T10:30:00Z')
};
```

---

### ActivityEvent

Discriminated union type representing events that reset the idle timer.

**Purpose**: Type-safe representation of user activity for timer reset logic.

**Type Definition**:
```typescript
type ActivityEvent = 
  | TranscriptionActivityEvent
  | ChatMessageActivityEvent;

interface TranscriptionActivityEvent {
  type: 'transcription';
  timestamp: Date;
  isFinal: boolean;
}

interface ChatMessageActivityEvent {
  type: 'chat-message';
  timestamp: Date;
  sender: 'user' | 'agent';
}
```

**Validation Rules**:
- Only final transcriptions reset timer (`isFinal === true`)
- Both user and agent messages reset timer
- `timestamp` must be a valid Date object

**Example**:
```typescript
// Transcription event
const transcriptionEvent: ActivityEvent = {
  type: 'transcription',
  timestamp: new Date(),
  isFinal: true
};

// Chat message event
const chatEvent: ActivityEvent = {
  type: 'chat-message',
  timestamp: new Date(),
  sender: 'user'
};
```

---

## Supporting Types

### IdleTimeoutValidationError

Error type for configuration validation failures.

```typescript
interface IdleTimeoutValidationError {
  field: keyof IdleTimeoutConfig;
  value: unknown;
  reason: string;
}
```

**Example**:
```typescript
const error: IdleTimeoutValidationError = {
  field: 'durationSeconds',
  value: 15,
  reason: 'Duration must be at least 30 seconds'
};
```

---

### IdleTimeoutEvent

Event emitted when timeout occurs for analytics/logging.

```typescript
interface IdleTimeoutEvent {
  eventType: 'idle-timeout';
  timestamp: Date;
  lastActivity: Date | null;
  durationSeconds: number;
  sessionDuration: number; // Total session time in seconds
}
```

**Example**:
```typescript
const timeoutEvent: IdleTimeoutEvent = {
  eventType: 'idle-timeout',
  timestamp: new Date(),
  lastActivity: new Date('2025-10-27T10:30:00Z'),
  durationSeconds: 120,
  sessionDuration: 450
};
```

---

## Default Values

### Default Configuration

```typescript
export const DEFAULT_IDLE_TIMEOUT_CONFIG: IdleTimeoutConfig = {
  durationSeconds: 120,        // 2 minutes
  warningThresholdSeconds: 30, // 30 seconds warning
  enabled: true
};
```

### Validation Constants

```typescript
export const IDLE_TIMEOUT_CONSTRAINTS = {
  MIN_DURATION_SECONDS: 30,
  MAX_DURATION_SECONDS: 3600,
  MIN_WARNING_THRESHOLD_SECONDS: 5,
  STORAGE_KEY: 'melior-agent:idle-timeout-config'
} as const;
```

---

## Relationships to Existing Models

### Integration with ConversationStorageService

The idle timeout service monitors `ConversationStorageService.lastMessageAt` signal:

```typescript
// Existing signal in ConversationStorageService
readonly lastMessageAt: Signal<Date | null>;

// Used by IdleTimeoutService to detect activity
effect(() => {
  const lastActivity = this.conversationService.lastMessageAt();
  if (lastActivity && this._state().isActive) {
    this.resetTimer();
  }
});
```

### Integration with LiveKitConnectionService

The idle timeout service triggers disconnection via connection service:

```typescript
// Calls existing method
await this.connectionService.disconnect();
```

---

## Type Contracts

Full TypeScript interface definitions are available in `/contracts/idle-timeout-types.ts`.

### File Structure

```typescript
// src/app/models/idle-timeout-config.ts
export interface IdleTimeoutConfig { /* ... */ }
export const DEFAULT_IDLE_TIMEOUT_CONFIG: IdleTimeoutConfig;
export const IDLE_TIMEOUT_CONSTRAINTS: { /* ... */ };

// src/app/models/idle-timer-state.ts
export interface IdleTimerState { /* ... */ }

// src/app/models/activity-event.ts
export type ActivityEvent = /* ... */;
export interface TranscriptionActivityEvent { /* ... */ }
export interface ChatMessageActivityEvent { /* ... */ }
```

---

## Validation Logic

### Configuration Validation

```typescript
function validateConfig(config: IdleTimeoutConfig): IdleTimeoutValidationError[] {
  const errors: IdleTimeoutValidationError[] = [];
  
  if (config.durationSeconds < 30 || config.durationSeconds > 3600) {
    errors.push({
      field: 'durationSeconds',
      value: config.durationSeconds,
      reason: 'Duration must be between 30 and 3600 seconds'
    });
  }
  
  if (config.warningThresholdSeconds < 5) {
    errors.push({
      field: 'warningThresholdSeconds',
      value: config.warningThresholdSeconds,
      reason: 'Warning threshold must be at least 5 seconds'
    });
  }
  
  if (config.warningThresholdSeconds >= config.durationSeconds) {
    errors.push({
      field: 'warningThresholdSeconds',
      value: config.warningThresholdSeconds,
      reason: 'Warning threshold must be less than duration'
    });
  }
  
  return errors;
}
```

---

## State Machine Diagram

```
┌─────────────┐
│  Inactive   │
│ (isActive:  │
│   false)    │
└──────┬──────┘
       │ Connection established
       │
       ▼
┌─────────────┐
│   Active    │
│ (timeRem:   │
│   120s)     │◄────┐
└──────┬──────┘     │
       │            │ Activity received
       │            │ (reset timer)
       │            │
       ├────────────┘
       │
       │ timeRemaining <= 30s
       │
       ▼
┌─────────────┐
│  Warning    │
│ (isWarning: │
│   true)     │◄────┐
└──────┬──────┘     │
       │            │ Activity received
       │            │ (reset to Active)
       │            │
       ├────────────┘
       │
       │ timeRemaining === 0
       │
       ▼
┌─────────────┐
│  Timeout    │
│ (trigger    │
│ disconnect) │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Inactive   │
└─────────────┘
```

---

## Summary

This data model provides:
- ✅ Type-safe configuration with validation constraints
- ✅ Reactive timer state for UI binding
- ✅ Discriminated union for activity events
- ✅ Integration points with existing services
- ✅ Clear state transitions and validation rules
- ✅ Alignment with project's strict TypeScript conventions

**Next**: Generate type contracts and create quickstart guide.
