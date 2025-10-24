# Research: Voice Chat Transcription App

**Feature**: 001-voice-chat-transcription  
**Date**: 2025-10-24  
**Purpose**: Resolve technical unknowns and establish best practices for implementation

## Research Tasks

### 1. LiveKit Angular Integration

**Unknown**: Verify if `@livekit/components-angular` package exists or identify correct LiveKit package for Angular

**Decision**: Use `livekit-client` SDK with custom Angular service wrapper

**Rationale**: 
- LiveKit provides `livekit-client` as the core JavaScript/TypeScript SDK for WebRTC functionality
- There is no official `@livekit/components-angular` package as of 2025
- LiveKit does provide `@livekit/components-react` for React, but Angular requires custom integration
- The `livekit-client` package (latest: ~2.x) provides all necessary APIs for room connection, audio tracks, and transcription
- Creating a custom Angular service wrapper provides better control over state management with Angular Signals

**Alternatives Considered**:
- **LiveKit React Components**: Not compatible with Angular framework
- **Direct WebRTC APIs**: Too low-level, LiveKit SDK abstracts complexity and provides better reliability
- **Alternative services (Twilio, Agora)**: LiveKit specifically mentioned in requirements, provides excellent transcription support

**Implementation Approach**:
```typescript
// Use livekit-client with Angular service pattern
import { Room, RoomEvent, Track } from 'livekit-client';

// Wrap in Angular service with Signal-based state management
export class LiveKitConnectionService {
  private room = signal<Room | null>(null);
  connectionState = signal<ConnectionState>('disconnected');
  // ... service implementation
}
```

### 2. Real-Time Transcription Implementation

**Unknown**: Best practices for handling LiveKit transcription streams in Angular

**Decision**: Use LiveKit's built-in transcription events with RxJS streams converted to Signals

**Rationale**:
- LiveKit SDK emits transcription data through `RoomEvent.TranscriptionReceived` events
- Angular Signals provide reactive state updates that trigger UI rendering efficiently
- RxJS `fromEvent` can convert LiveKit events to observables, then use `toSignal()` for Angular integration
- This pattern ensures automatic change detection with OnPush strategy

**Best Practices**:
- Subscribe to `RoomEvent.TranscriptionReceived` on connection establishment
- Store transcription messages in a Signal array: `transcriptions = signal<TranscriptionMessage[]>([])`
- Use `computed()` to derive UI state (e.g., filtered messages, message count)
- Implement virtual scrolling for lists >100 messages using `@angular/cdk/scrolling`
- Add ARIA live regions for accessibility announcements

**Code Pattern**:
```typescript
room.on(RoomEvent.TranscriptionReceived, (segments: TranscriptionSegment[]) => {
  this.transcriptions.update(current => [...current, ...this.mapToMessages(segments)]);
});
```

### 3. Mobile Performance Optimization

**Unknown**: Best practices for mobile performance with real-time audio and transcription

**Decision**: Implement progressive enhancement with performance budgets

**Rationale**:
- Mobile devices have limited CPU, memory, and battery compared to desktop
- WebRTC audio processing is CPU-intensive; UI rendering must remain lightweight
- OnPush change detection strategy reduces unnecessary rendering cycles
- Virtual scrolling prevents DOM bloat with long transcription lists
- Service Worker caching for app shell reduces initial load time

**Best Practices**:
- **Change Detection**: OnPush strategy on all components, update state via Signals only
- **Bundle Size**: Lazy load non-critical features, tree-shake unused Material components
- **Memory Management**: Limit transcription history to last 500 messages, implement cleanup
- **Network**: Compress audio if possible, handle network quality degradation gracefully
- **Battery**: Use `wakeLock` API to prevent screen sleep during active sessions
- **Performance Monitoring**: Add performance marks for connection time, transcription latency

**Performance Budget**:
- Initial bundle: <300KB gzipped
- Runtime memory: <100MB for 15min session
- Time to Interactive: <3s on 4G
- Transcription latency: <500ms
- Frame rate: Maintain 60fps during UI updates

### 4. Microphone Permission Handling

**Unknown**: Best practices for requesting and managing microphone permissions

**Decision**: Request permissions on connect action with clear error handling

**Rationale**:
- Modern browsers require user gesture to prompt for microphone access
- Requesting on connect button click provides clear user intent context
- Early detection of permission denial allows showing helpful error messages
- Permission state can persist across sessions (browser-dependent)

**Best Practices**:
- Use `navigator.mediaDevices.getUserMedia({ audio: true })` before LiveKit connection
- Check permission state first with `navigator.permissions.query({ name: 'microphone' })`
- Show clear error messages if permission denied with instructions to enable
- Handle permission revocation during active session gracefully
- Provide fallback UI when permissions not granted

**Error Handling Pattern**:
```typescript
try {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  // Proceed with LiveKit connection
} catch (error) {
  if (error.name === 'NotAllowedError') {
    // Show permission denied error to user
  } else if (error.name === 'NotFoundError') {
    // No microphone detected
  }
}
```

### 5. Network Interruption Handling

**Unknown**: Best practices for handling network disconnections during active voice sessions

**Decision**: Implement automatic reconnection with exponential backoff

**Rationale**:
- Mobile networks frequently experience brief interruptions (switching towers, tunnel)
- LiveKit SDK provides connection quality monitoring and automatic reconnection
- Exponential backoff prevents overwhelming server during outages
- User should be informed of connection status without disruptive interruptions

**Best Practices**:
- Listen to `RoomEvent.Disconnected` and `RoomEvent.Reconnecting` events
- Show subtle connection quality indicator (good/poor/reconnecting)
- Preserve transcription state during reconnection attempts
- Implement max retry limit (3-5 attempts) before requiring manual reconnection
- Use `RoomEvent.ConnectionQualityChanged` to show proactive warnings

**Reconnection Pattern**:
```typescript
room.on(RoomEvent.Reconnecting, () => {
  this.connectionState.set('reconnecting');
});

room.on(RoomEvent.Reconnected, () => {
  this.connectionState.set('connected');
});

room.on(RoomEvent.Disconnected, (reason) => {
  // Implement retry logic with exponential backoff
});
```

### 6. Accessibility for Dynamic Transcription

**Unknown**: WCAG 2.1 AA compliance patterns for real-time transcription updates

**Decision**: Use ARIA live regions with polite announcements and keyboard navigation

**Rationale**:
- Screen readers need to announce new transcriptions without interrupting existing announcements
- `aria-live="polite"` allows screen readers to queue announcements naturally
- Keyboard users need to navigate through transcription history
- High contrast mode must be supported for users with visual impairments

**Best Practices**:
- Wrap transcription display in `<div role="log" aria-live="polite" aria-atomic="false">`
- Each message should be a separate `<article>` or `<div role="article">` for clear structure
- Use semantic HTML: `<time>` for timestamps, `<p>` for text content
- Provide keyboard shortcuts: Space to pause/resume auto-scroll, arrow keys to navigate messages
- Ensure 4.5:1 contrast ratio for text, use Angular Material's theme system
- Support OS-level font size scaling without breaking layout

**Accessibility Pattern**:
```html
<div role="log" aria-live="polite" aria-label="Conversation transcription">
  @for (message of transcriptions(); track message.id) {
    <article [attr.aria-label]="message.speaker + ' said at ' + message.timestamp">
      <span class="speaker">{{ message.speaker }}</span>
      <time [dateTime]="message.timestamp">{{ message.timestamp | date }}</time>
      <p>{{ message.text }}</p>
    </article>
  }
</div>
```

### 7. TypeScript Type Safety with LiveKit SDK

**Unknown**: Best practices for typing LiveKit SDK interactions in strict TypeScript

**Decision**: Create strict TypeScript interfaces wrapping LiveKit types

**Rationale**:
- LiveKit SDK provides TypeScript types but may need augmentation for strict mode
- Custom interfaces provide abstraction layer for easier testing and future SDK updates
- Discriminated unions for connection states enable exhaustive type checking

**Type Definitions**:
```typescript
// Connection State (discriminated union)
export type ConnectionState = 
  | { status: 'disconnected' }
  | { status: 'connecting' }
  | { status: 'connected'; roomName: string; sessionId: string }
  | { status: 'reconnecting'; attempt: number }
  | { status: 'error'; error: ConnectionError };

export interface ConnectionError {
  code: 'PERMISSION_DENIED' | 'NETWORK_ERROR' | 'SERVER_UNAVAILABLE' | 'UNKNOWN';
  message: string;
  originalError?: unknown;
}

// Transcription Message
export interface TranscriptionMessage {
  id: string;
  speaker: 'user' | 'agent';
  text: string;
  timestamp: Date;
  confidence?: number;
  isFinal: boolean;
}

// Session Model
export interface VoiceSession {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  transcriptions: TranscriptionMessage[];
  connectionQuality: 'excellent' | 'good' | 'poor';
}
```

## Summary

All technical unknowns have been resolved. The implementation will use:
- **LiveKit Integration**: `livekit-client` SDK with custom Angular service wrapper
- **State Management**: Angular Signals for reactive state, RxJS for event streaming
- **Performance**: OnPush change detection, virtual scrolling, performance budgets
- **Accessibility**: ARIA live regions, semantic HTML, keyboard navigation
- **Type Safety**: Strict TypeScript with discriminated unions and custom interfaces
- **Error Handling**: Permission management, network reconnection, graceful degradation

No additional research required. Ready to proceed to Phase 1 (Design & Contracts).
