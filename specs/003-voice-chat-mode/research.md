# Research: Voice/Chat Response Mode Toggle

**Feature**: 003-voice-chat-mode  
**Phase**: 0 - Research & Decision Documentation  
**Date**: 2025-10-24

## Purpose

Document research findings, technology decisions, and design patterns for implementing the voice/chat response mode toggle feature in the Angular voice chat application. All technical unknowns from the planning phase are resolved here to provide clear guidance for implementation.

---

## 1. LiveKit Data Channel Communication Pattern

### Decision
Use LiveKit's `Room.publishData()` for sending messages and `RoomEvent.DataReceived` event for receiving messages with RELIABLE delivery guarantees.

### Rationale
- **Reliability**: RELIABLE data packets ensure message delivery and ordering, critical for mode change confirmations
- **Simplicity**: LiveKit SDK handles the WebRTC data channel complexity, no need for manual setup
- **Proven Pattern**: LiveKit documentation and examples demonstrate this pattern for app-level messaging
- **Existing Integration**: Room instance already available via LiveKitConnectionService

### Implementation Pattern

```typescript
// Sending messages (from Angular service)
const message = { type: 'set_response_mode', mode: 'chat' };
const encoder = new TextEncoder();
const data = encoder.encode(JSON.stringify(message));

await room.localParticipant.publishData(data, {
  reliable: true,
  destinationIdentities: [], // Empty = broadcast to all
});

// Receiving messages (event listener in service)
room.on(RoomEvent.DataReceived, (
  payload: Uint8Array,
  participant?: RemoteParticipant,
  kind?: DataPacket_Kind,
  topic?: string
) => {
  const decoder = new TextDecoder();
  const text = decoder.decode(payload);
  const message = JSON.parse(text);
  // Handle message based on type
});
```

### Alternatives Considered
- **WebSocket side channel**: Rejected - adds complexity, requires separate connection management
- **HTTP polling**: Rejected - high latency, not suitable for real-time communication
- **UNRELIABLE data packets**: Rejected - mode confirmations must be guaranteed

### References
- [LiveKit Data Messages Documentation](https://docs.livekit.io/client-sdk-js/classes/Room.html#publishData)
- [LiveKit Room Events](https://docs.livekit.io/client-sdk-js/enums/RoomEvent.html)

---

## 2. Angular Signal-Based State Management

### Decision
Use Angular Signals for all response mode state with `signal()` for mutable state, `computed()` for derived state, and `effect()` for side effects.

### Rationale
- **Performance**: Signals provide fine-grained reactivity without Zone.js overhead (zoneless change detection)
- **Type Safety**: Full TypeScript support with generic signal types
- **Simplicity**: Cleaner than RxJS for simple state management
- **Angular 20 Best Practice**: Signals are the recommended state management approach in modern Angular

### Implementation Pattern

```typescript
// In ResponseModeService
export class ResponseModeService {
  // Private mutable signals
  private _currentMode = signal<ResponseMode>('voice');
  private _isConfirmed = signal<boolean>(true);
  private _chatMessages = signal<ChatMessageState[]>([]);
  
  // Public readonly signals
  readonly currentMode = this._currentMode.asReadonly();
  readonly isConfirmed = this._isConfirmed.asReadonly();
  readonly chatMessages = this._chatMessages.asReadonly();
  
  // Computed signals for derived state
  readonly isPending = computed(() => !this._isConfirmed());
  readonly buttonLabel = computed(() => 
    this._currentMode() === 'voice' ? 'Voice Mode' : 'Chat Mode'
  );
  
  // Effects for side effects (logging, localStorage)
  constructor() {
    effect(() => {
      const mode = this._currentMode();
      localStorage.setItem('preferredMode', mode);
    });
  }
}
```

### Alternatives Considered
- **RxJS BehaviorSubjects**: Rejected - more verbose, unnecessary for simple state
- **NgRx Store**: Rejected - overkill for component-level state, adds complexity
- **Service with getters/setters**: Rejected - no reactivity, manual change detection needed

### References
- [Angular Signals Guide](https://angular.dev/guide/signals)
- [Angular 20 Signal-Based Components](https://blog.angular.dev/meet-angulars-new-output-api-253a41ffa13c)

---

## 3. Message Encoding/Decoding Strategy

### Decision
Use browser-native `TextEncoder` and `TextDecoder` with JSON serialization for all data channel messages.

### Rationale
- **Browser Support**: Native APIs available in all modern browsers (no polyfills needed)
- **UTF-8 Compliance**: Ensures proper character encoding for international text
- **JSON Simplicity**: Human-readable, debuggable, widely understood format
- **Type Safety**: Combine with TypeScript discriminated unions for compile-time safety

### Implementation Pattern

```typescript
// Message encoding (send)
function encodeMessage(message: DataChannelMessage): Uint8Array {
  const json = JSON.stringify(message);
  const encoder = new TextEncoder();
  return encoder.encode(json);
}

// Message decoding (receive)
function decodeMessage(payload: Uint8Array): DataChannelMessage | null {
  try {
    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(payload);
    const data = JSON.parse(text);
    
    // Validate message structure
    if (!data.type || typeof data.type !== 'string') {
      console.error('Invalid message: missing type field');
      return null;
    }
    
    return data as DataChannelMessage;
  } catch (error) {
    console.error('Failed to decode message:', error);
    return null;
  }
}
```

### Error Handling
- **JSON Parse Errors**: Catch and log, return null, continue processing
- **Invalid Message Structure**: Validate `type` field, reject malformed messages
- **Encoding Errors**: Should never occur with TextEncoder, but wrap in try-catch for safety

### Alternatives Considered
- **Protocol Buffers**: Rejected - adds build complexity, overkill for simple messages
- **MessagePack**: Rejected - requires additional library, binary format harder to debug
- **Base64 Encoding**: Rejected - unnecessary overhead, JSON is sufficient

---

## 4. Debouncing Mode Toggle Clicks

### Decision
Use RxJS `debounceTime(300)` operator on mode toggle click events to prevent rapid successive requests.

### Rationale
- **User Experience**: Prevents accidental double-clicks from sending multiple mode change requests
- **Network Efficiency**: Reduces unnecessary data channel traffic
- **RxJS Integration**: Already using RxJS in Angular, no new dependencies
- **300ms Sweet Spot**: Long enough to catch double-clicks, short enough to feel responsive

### Implementation Pattern

```typescript
// In ModeToggleButtonComponent
export class ModeToggleButtonComponent {
  private toggleClick$ = new Subject<void>();
  
  // Inject service
  private responseModeService = inject(ResponseModeService);
  
  constructor() {
    // Set up debounced click handler
    this.toggleClick$
      .pipe(
        debounceTime(300),
        takeUntilDestroyed() // Automatic cleanup
      )
      .subscribe(() => {
        this.responseModeService.toggleMode();
      });
  }
  
  onToggleClick(): void {
    this.toggleClick$.next();
  }
}
```

### Alternatives Considered
- **throttleTime**: Rejected - allows first click immediately, we want to wait for user to finish
- **Manual setTimeout**: Rejected - harder to test, need to manage cleanup
- **No debouncing**: Rejected - poor UX, allows rapid clicking

### Timing Justification
- **100ms**: Too short, won't catch double-clicks
- **300ms**: Sweet spot - catches double-clicks, feels instant
- **500ms**: Too long, feels sluggish to users

---

## 5. Chat Message Display with Virtual Scrolling

### Decision
Use Angular CDK `ScrollingModule` with `<cdk-virtual-scroll-viewport>` for chat message list when message count exceeds 100.

### Rationale
- **Performance**: Only renders visible messages, maintains 60fps even with 500+ messages
- **Angular Native**: Part of Angular CDK, no additional dependencies
- **Auto-Scroll Support**: Programmatic scrolling to latest message via `scrollTo()`
- **Accessibility**: Maintains keyboard navigation and screen reader support

### Implementation Pattern

```typescript
// In chat-message-display.component.ts
export class ChatMessageDisplayComponent {
  messages = input.required<ChatMessageState[]>();
  
  @ViewChild(CdkVirtualScrollViewport) 
  viewport!: CdkVirtualScrollViewport;
  
  // Auto-scroll to bottom when new messages arrive
  ngAfterViewChecked(): void {
    if (this.shouldAutoScroll()) {
      this.scrollToBottom();
    }
  }
  
  private scrollToBottom(): void {
    const itemCount = this.messages().length;
    if (itemCount > 0) {
      this.viewport.scrollToIndex(itemCount - 1, 'smooth');
    }
  }
  
  trackByMessageId(index: number, message: ChatMessageState): string {
    return message.id;
  }
}
```

```html
<!-- chat-message-display.component.html -->
<cdk-virtual-scroll-viewport 
  [itemSize]="60" 
  class="chat-viewport">
  <div 
    *cdkVirtualFor="let message of messages(); trackBy: trackByMessageId"
    class="message-item"
    [class.user-message]="message.sender === 'user'"
    [class.agent-message]="message.sender === 'agent'">
    {{ message.content }}
  </div>
</cdk-virtual-scroll-viewport>
```

### Performance Threshold
- **< 100 messages**: Use regular `*ngFor` for simplicity
- **≥ 100 messages**: Switch to virtual scrolling for performance

### Alternatives Considered
- **Infinite Scroll**: Rejected - we want full message history visible, not pagination
- **Manual DOM Management**: Rejected - complex, error-prone, breaks Angular patterns
- **Third-Party Library (ngx-infinite-scroll)**: Rejected - CDK is sufficient and native

### References
- [Angular CDK Scrolling](https://material.angular.io/cdk/scrolling/overview)
- [Virtual Scroll Performance](https://blog.angular.dev/angular-cdk-virtual-scrolling-420d5a3e4bb8)

---

## 6. LocalStorage Preference Persistence

### Decision
Use browser `localStorage` API directly to persist user's preferred response mode across sessions.

### Rationale
- **Simplicity**: Native browser API, no library needed
- **Synchronous Access**: Immediate read on app init, no async complexity
- **Sufficient Storage**: Mode preference is <10 bytes, well within 5MB limit
- **Browser Support**: Universal support in all target browsers

### Implementation Pattern

```typescript
// In ChatStorageService
export class ChatStorageService {
  private readonly STORAGE_KEY = 'melior-agent-response-mode';
  
  savePreferredMode(mode: ResponseMode): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, mode);
    } catch (error) {
      console.error('Failed to save mode preference:', error);
      // Graceful degradation - continue without persistence
    }
  }
  
  loadPreferredMode(): ResponseMode | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored === 'voice' || stored === 'chat') {
        return stored;
      }
      return null;
    } catch (error) {
      console.error('Failed to load mode preference:', error);
      return null;
    }
  }
  
  clearPreference(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
```

### Error Handling
- **QuotaExceededError**: Catch and log, continue without saving
- **SecurityError (private browsing)**: Catch and log, graceful degradation
- **Invalid stored value**: Validate on load, ignore if corrupted

### Alternatives Considered
- **IndexedDB**: Rejected - overkill for single value, async complexity
- **Cookies**: Rejected - sent with every HTTP request (unnecessary overhead)
- **SessionStorage**: Rejected - doesn't persist across browser sessions (requirement is cross-session)

### Data Privacy
- **No PII Stored**: Only stores 'voice' or 'chat' preference
- **User Control**: Can clear via browser settings or app disconnect

---

## 7. Timeout Handling for Mode Confirmations

### Decision
Use RxJS `timeout(5000)` operator with `catchError` to handle missing agent confirmations gracefully.

### Rationale
- **User Feedback**: 5 seconds is long enough for network round-trip but short enough to feel responsive
- **Error Recovery**: Timeout triggers UI feedback and reverts to last known state
- **RxJS Integration**: Natural fit with observable-based event handling
- **Testability**: Easy to mock and test timeout scenarios

### Implementation Pattern

```typescript
// In ResponseModeService
export class ResponseModeService {
  private modeConfirmation$ = new Subject<ResponseMode>();
  
  setMode(mode: ResponseMode): void {
    // Set pending state
    this._isConfirmed.set(false);
    
    // Send request
    this.sendModeChangeRequest(mode);
    
    // Wait for confirmation with timeout
    this.modeConfirmation$
      .pipe(
        timeout(5000),
        take(1),
        catchError((error) => {
          if (error.name === 'TimeoutError') {
            console.error('Mode change timeout - no confirmation from agent');
            this.handleTimeout();
          }
          return EMPTY;
        })
      )
      .subscribe((confirmedMode) => {
        this._currentMode.set(confirmedMode);
        this._isConfirmed.set(true);
      });
  }
  
  private handleTimeout(): void {
    // Revert to last confirmed state
    this._isConfirmed.set(true);
    // Show error message to user via signal
    this._errorMessage.set('Mode change timed out. Please try again.');
  }
  
  // Called when RoomEvent.DataReceived fires
  onModeUpdateReceived(mode: ResponseMode): void {
    this.modeConfirmation$.next(mode);
  }
}
```

### Timeout Duration Justification
- **2 seconds**: Too short, doesn't account for slow networks
- **5 seconds**: Sweet spot - accounts for network latency + processing
- **10 seconds**: Too long, poor user experience

### User Feedback on Timeout
- Display error message: "Mode change timed out. Please try again."
- Re-enable toggle button
- Revert UI to last confirmed mode
- Log error for debugging

### Alternatives Considered
- **No timeout**: Rejected - button could be stuck in "Switching..." state indefinitely
- **Retry logic**: Rejected - agent might be unavailable, don't spam with retries
- **Exponential backoff**: Rejected - user-initiated action, let user decide to retry

---

## 8. Accessibility Implementation

### Decision
Use Angular Material's `A11yModule` with CDK `LiveAnnouncer` for screen reader announcements and semantic ARIA attributes.

### Rationale
- **WCAG 2.1 AA Compliance**: Material A11y tools provide tested, compliant components
- **Live Announcements**: CDK LiveAnnouncer for dynamic mode change announcements
- **Keyboard Navigation**: Built-in support for Space/Enter activation
- **Testing Support**: Angular CDK A11y testing utilities for automated checks

### Implementation Pattern

```typescript
// In ModeToggleButtonComponent
import { LiveAnnouncer } from '@angular/cdk/a11y';

export class ModeToggleButtonComponent {
  private liveAnnouncer = inject(LiveAnnouncer);
  
  currentMode = input.required<ResponseMode>();
  onModeToggle = output<void>();
  
  protected ariaLabel = computed(() => {
    const mode = this.currentMode();
    return `Response mode: ${mode}. Click to switch to ${mode === 'voice' ? 'chat' : 'voice'} mode.`;
  });
  
  protected ariaPressed = computed(() => this.currentMode() === 'chat');
  
  async handleToggle(): Promise<void> {
    this.onModeToggle.emit();
    
    // Announce mode change to screen readers
    const newMode = this.currentMode() === 'voice' ? 'chat' : 'voice';
    await this.liveAnnouncer.announce(
      `Switching to ${newMode} mode`,
      'polite'
    );
  }
}
```

```html
<!-- mode-toggle-button.component.html -->
<button
  mat-raised-button
  [attr.aria-label]="ariaLabel()"
  [attr.aria-pressed]="ariaPressed()"
  (click)="handleToggle()"
  (keydown.space)="handleToggle(); $event.preventDefault()"
  (keydown.enter)="handleToggle()"
  role="switch">
  {{ currentMode() === 'voice' ? '🔊 Voice' : '💬 Chat' }}
</button>
```

### Accessibility Checklist
- ✅ ARIA label describing current state and action
- ✅ `role="switch"` for toggle semantics
- ✅ `aria-pressed` state tracking
- ✅ Keyboard navigation (Space/Enter)
- ✅ Live announcements for dynamic changes
- ✅ Sufficient color contrast (4.5:1)
- ✅ Focus indicator (Material default)
- ✅ Touch target ≥44x44 pixels

### Testing Strategy
- Manual testing with NVDA/JAWS screen readers
- Automated testing with axe-core (via Angular CDK)
- Keyboard-only navigation testing
- Color contrast verification (WebAIM contrast checker)

---

## 9. Error Handling Strategy

### Decision
Implement graceful degradation with user-friendly error messages and logging for debugging, never crashing the app.

### Rationale
- **User Experience**: Errors should inform users but not break the app
- **Debuggability**: Console logging for developer troubleshooting
- **Resilience**: Invalid messages ignored, valid messages still processed
- **Type Safety**: TypeScript guards prevent runtime type errors

### Error Scenarios and Handling

| Error Scenario | Handling Strategy | User Feedback |
|----------------|-------------------|---------------|
| JSON parse error | Log error, ignore message, continue | None (silent, agent may retry) |
| Invalid message type | Log warning, ignore message | None (silent) |
| Missing required field | Log error, ignore message | None (silent) |
| Mode change timeout | Revert to last state, re-enable UI | "Mode change timed out. Try again." |
| Data channel unavailable | Disable mode toggle, show message | "Chat mode unavailable" |
| LocalStorage full | Log error, continue without saving | None (graceful degradation) |

### Implementation Pattern

```typescript
// Central error handling in ResponseModeService
private handleDataChannelError(error: unknown, context: string): void {
  console.error(`[ResponseModeService] ${context}:`, error);
  
  // Update error signal for UI display
  if (error instanceof Error) {
    this._errorMessage.set(error.message);
  } else {
    this._errorMessage.set('An unexpected error occurred');
  }
  
  // Clear error after 5 seconds
  setTimeout(() => this._errorMessage.set(null), 5000);
}

// Example usage in message decoding
private decodeMessage(payload: Uint8Array): DataChannelMessage | null {
  try {
    const text = new TextDecoder().decode(payload);
    const data = JSON.parse(text);
    
    // Type validation
    if (!this.isValidMessage(data)) {
      throw new Error('Invalid message structure');
    }
    
    return data as DataChannelMessage;
  } catch (error) {
    this.handleDataChannelError(error, 'Message decoding');
    return null;
  }
}
```

### Logging Strategy
- **Development**: Verbose console logging with context
- **Production**: Error logging only, no sensitive data
- **Future**: Consider integrating application monitoring (Sentry, LogRocket)

---

## 10. Mobile Touch Target Optimization

### Decision
Use Angular Material's theming with custom SCSS to ensure minimum 44x44 pixel touch targets per Apple/Google guidelines.

### Rationale
- **Accessibility**: WCAG 2.1 AAA requires 44x44px minimum (we're targeting AA but exceeding)
- **Usability**: Prevents mis-taps on mobile devices
- **Platform Guidelines**: Aligns with iOS Human Interface Guidelines and Material Design
- **Responsive Design**: Works across all screen sizes from 320px up

### Implementation Pattern

```scss
// mode-toggle-button.component.scss
.mode-toggle-button {
  // Minimum touch target size
  min-width: 44px;
  min-height: 44px;
  
  // Padding for comfortable tap area
  padding: 12px 24px;
  
  // Material Design elevation for tactile feedback
  @include mat.elevation(2);
  
  // Responsive sizing
  @media (min-width: 768px) {
    // Larger on tablets/desktops
    min-width: 120px;
    padding: 16px 32px;
  }
}

// Chat message touch targets
.message-item {
  min-height: 44px;
  padding: 12px 16px;
  
  // Tap feedback
  &:active {
    background-color: rgba(0, 0, 0, 0.04);
  }
}
```

### Testing Strategy
- Test on physical devices (iPhone SE, Pixel 6)
- Use Chrome DevTools touch emulation
- Verify with accessibility audits (Lighthouse)

---

## Summary of Research Findings

All technical unknowns resolved. Key decisions documented:

1. ✅ **Data Channel Pattern**: LiveKit Room.publishData with RELIABLE delivery
2. ✅ **State Management**: Angular Signals (signal, computed, effect)
3. ✅ **Message Encoding**: TextEncoder/TextDecoder with JSON
4. ✅ **Debouncing**: RxJS debounceTime(300ms)
5. ✅ **Virtual Scrolling**: Angular CDK ScrollingModule
6. ✅ **Persistence**: Browser localStorage API
7. ✅ **Timeout Handling**: RxJS timeout(5000ms) with catchError
8. ✅ **Accessibility**: Angular CDK A11yModule with LiveAnnouncer
9. ✅ **Error Handling**: Graceful degradation with user feedback
10. ✅ **Mobile Optimization**: 44x44px minimum touch targets

**Next Phase**: Proceed to Phase 1 (data-model.md, contracts, quickstart.md)
