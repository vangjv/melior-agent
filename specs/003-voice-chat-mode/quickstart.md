# Developer Quickstart: Voice/Chat Response Mode Toggle

**Feature**: 003-voice-chat-mode  
**Phase**: 1 - Developer Guide  
**Date**: 2025-10-24  
**Audience**: Angular developers implementing this feature

## Prerequisites

- ✅ Feature specification read ([spec.md](./spec.md))
- ✅ Data models understood ([data-model.md](./data-model.md))
- ✅ Service contracts reviewed ([contracts/service-contracts.md](./contracts/service-contracts.md))
- ✅ Research decisions understood ([research.md](./research.md))
- ✅ Angular 20+ development environment set up
- ✅ Existing voice chat feature (001-voice-chat-transcription) functional

---

## Quick Overview

This feature adds a toggle button that switches the LiveKit agent's response mode between:
- **Voice Mode**: Agent responds with synthesized speech (TTS)
- **Chat Mode**: Agent responds with text messages via data channel

**User input remains voice in both modes** - only the agent's response delivery changes.

---

## Implementation Phases

### Phase A: Models & Types (30 minutes)
Create TypeScript interfaces and type definitions.

### Phase B: Services (2 hours)
Implement ResponseModeService and ChatStorageService.

### Phase C: Components (1.5 hours)
Create ModeToggleButton and ChatMessageDisplay components.

### Phase D: Integration (1 hour)
Wire everything together in VoiceChatComponent.

### Phase E: Testing (2 hours)
Unit and integration tests.

**Total Estimated Time**: 6.5-7 hours

---

## Phase A: Models & Types

### Step A1: Create Response Mode Model

**File**: `src/app/models/response-mode.model.ts`

```typescript
/**
 * Agent response delivery mode
 */
export type ResponseMode = 'voice' | 'chat';

export const DEFAULT_RESPONSE_MODE: ResponseMode = 'voice';

export function isValidResponseMode(value: unknown): value is ResponseMode {
  return value === 'voice' || value === 'chat';
}

/**
 * Data channel messages
 */
export interface BaseDataChannelMessage {
  readonly type: string;
}

export interface SetResponseModeMessage extends BaseDataChannelMessage {
  readonly type: 'set_response_mode';
  readonly mode: ResponseMode;
}

export interface ResponseModeUpdatedMessage extends BaseDataChannelMessage {
  readonly type: 'response_mode_updated';
  readonly mode: ResponseMode;
}

export interface AgentChatMessage extends BaseDataChannelMessage {
  readonly type: 'chat_message';
  readonly message: string;
  readonly timestamp: number;
}

export type IncomingDataChannelMessage = 
  | ResponseModeUpdatedMessage 
  | AgentChatMessage;

// Type guards
export function isResponseModeUpdatedMessage(
  message: BaseDataChannelMessage
): message is ResponseModeUpdatedMessage {
  return (
    message.type === 'response_mode_updated' &&
    'mode' in message &&
    isValidResponseMode((message as ResponseModeUpdatedMessage).mode)
  );
}

export function isAgentChatMessage(
  message: BaseDataChannelMessage
): message is AgentChatMessage {
  const chatMsg = message as AgentChatMessage;
  return (
    message.type === 'chat_message' &&
    typeof chatMsg.message === 'string' &&
    typeof chatMsg.timestamp === 'number'
  );
}
```

**Test**: Verify type guards work correctly.

### Step A2: Create Chat Message Model

**File**: `src/app/models/chat-message.model.ts`

```typescript
export interface ChatMessageState {
  readonly id: string;
  readonly content: string;
  readonly timestamp: Date;
  readonly sender: 'user' | 'agent';
}

export function createUserMessage(
  content: string,
  timestamp: Date = new Date()
): ChatMessageState {
  return {
    id: crypto.randomUUID(),
    content,
    timestamp,
    sender: 'user',
  };
}

export function createAgentMessage(
  content: string,
  timestamp: number
): ChatMessageState {
  return {
    id: crypto.randomUUID(),
    content,
    timestamp: new Date(timestamp),
    sender: 'agent',
  };
}
```

**✓ Checkpoint**: Models compile without errors, type guards pass tests.

---

## Phase B: Services

### Step B1: Create ChatStorageService

**File**: `src/app/services/chat-storage.service.ts`

```typescript
import { Injectable, signal } from '@angular/core';
import { ChatMessageState, createUserMessage, createAgentMessage } from '../models/chat-message.model';
import { ResponseMode, isValidResponseMode } from '../models/response-mode.model';

const MODE_PREFERENCE_KEY = 'melior-agent-response-mode';

@Injectable({ providedIn: 'root' })
export class ChatStorageService {
  // Private mutable signals
  private _messages = signal<ChatMessageState[]>([]);
  
  // Public readonly signals
  readonly messages = this._messages.asReadonly();
  
  addUserMessage(content: string, timestamp?: Date): void {
    const message = createUserMessage(content, timestamp);
    this._messages.update(msgs => [...msgs, message]);
  }
  
  addAgentMessage(content: string, timestamp: number): void {
    const message = createAgentMessage(content, timestamp);
    this._messages.update(msgs => [...msgs, message]);
  }
  
  clearMessages(): void {
    this._messages.set([]);
  }
  
  savePreferredMode(mode: ResponseMode): void {
    try {
      localStorage.setItem(MODE_PREFERENCE_KEY, mode);
    } catch (error) {
      console.error('Failed to save mode preference:', error);
    }
  }
  
  loadPreferredMode(): ResponseMode | null {
    try {
      const stored = localStorage.getItem(MODE_PREFERENCE_KEY);
      return stored && isValidResponseMode(stored) ? stored : null;
    } catch (error) {
      console.error('Failed to load mode preference:', error);
      return null;
    }
  }
  
  clearPreferredMode(): void {
    localStorage.removeItem(MODE_PREFERENCE_KEY);
  }
}
```

**Test**: Write unit tests for message addition and localStorage operations.

### Step B2: Create ResponseModeService

**File**: `src/app/services/response-mode.service.ts`

```typescript
import { Injectable, signal, computed } from '@angular/core';
import { Room, RoomEvent, DataPacket_Kind } from 'livekit-client';
import { Subject, EMPTY } from 'rxjs';
import { timeout, take, catchError } from 'rxjs/operators';
import {
  ResponseMode,
  SetResponseModeMessage,
  IncomingDataChannelMessage,
  isResponseModeUpdatedMessage,
  isAgentChatMessage,
} from '../models/response-mode.model';
import { ChatStorageService } from './chat-storage.service';

@Injectable({ providedIn: 'root' })
export class ResponseModeService {
  // Private state signals
  private _currentMode = signal<ResponseMode>('voice');
  private _isConfirmed = signal<boolean>(true);
  private _errorMessage = signal<string | null>(null);
  private _isDataChannelAvailable = signal<boolean>(false);
  
  // Public readonly signals
  readonly currentMode = this._currentMode.asReadonly();
  readonly isConfirmed = this._isConfirmed.asReadonly();
  readonly errorMessage = this._errorMessage.asReadonly();
  readonly isDataChannelAvailable = this._isDataChannelAvailable.asReadonly();
  
  // Computed signals
  readonly isPending = computed(() => !this._isConfirmed());
  
  // Private subjects for confirmation handling
  private modeConfirmation$ = new Subject<ResponseMode>();
  private room: Room | null = null;
  
  constructor(private chatStorage: ChatStorageService) {}
  
  initialize(room: Room): void {
    this.room = room;
    this._isDataChannelAvailable.set(true);
    
    // Listen for data channel messages
    room.on(RoomEvent.DataReceived, this.handleDataReceived.bind(this));
  }
  
  cleanup(): void {
    if (this.room) {
      this.room.off(RoomEvent.DataReceived, this.handleDataReceived);
      this.room = null;
    }
    this._isDataChannelAvailable.set(false);
    this._currentMode.set('voice');
    this._isConfirmed.set(true);
    this._errorMessage.set(null);
  }
  
  async setMode(mode: ResponseMode): Promise<void> {
    if (!this.room || !this._isDataChannelAvailable()) {
      throw new Error('Data channel not available');
    }
    
    // Set pending state
    this._isConfirmed.set(false);
    this._errorMessage.set(null);
    
    // Send mode change request
    const message: SetResponseModeMessage = {
      type: 'set_response_mode',
      mode,
    };
    
    try {
      const encoded = this.encodeMessage(message);
      await this.room.localParticipant.publishData(encoded, {
        reliable: true,
      });
      
      // Wait for confirmation with timeout
      return new Promise((resolve, reject) => {
        this.modeConfirmation$
          .pipe(
            timeout(5000),
            take(1),
            catchError((error) => {
              if (error.name === 'TimeoutError') {
                this.handleTimeout();
                reject(new Error('Mode change timed out'));
              }
              return EMPTY;
            })
          )
          .subscribe({
            next: (confirmedMode) => {
              this._currentMode.set(confirmedMode);
              this._isConfirmed.set(true);
              this.chatStorage.savePreferredMode(confirmedMode);
              resolve();
            },
            error: (err) => reject(err),
          });
      });
    } catch (error) {
      this._isConfirmed.set(true);
      throw error;
    }
  }
  
  async toggleMode(): Promise<void> {
    const newMode = this._currentMode() === 'voice' ? 'chat' : 'voice';
    return this.setMode(newMode);
  }
  
  private handleDataReceived(payload: Uint8Array): void {
    const message = this.decodeMessage(payload);
    if (!message) return;
    
    if (isResponseModeUpdatedMessage(message)) {
      this.modeConfirmation$.next(message.mode);
    } else if (isAgentChatMessage(message)) {
      this.chatStorage.addAgentMessage(message.message, message.timestamp);
    }
  }
  
  private handleTimeout(): void {
    this._isConfirmed.set(true);
    this._errorMessage.set('Mode change timed out. Please try again.');
    
    // Clear error after 5 seconds
    setTimeout(() => this._errorMessage.set(null), 5000);
  }
  
  private encodeMessage(message: SetResponseModeMessage): Uint8Array {
    const json = JSON.stringify(message);
    const encoder = new TextEncoder();
    return encoder.encode(json);
  }
  
  private decodeMessage(payload: Uint8Array): IncomingDataChannelMessage | null {
    try {
      const decoder = new TextDecoder('utf-8');
      const text = decoder.decode(payload);
      const data = JSON.parse(text);
      
      if (!data.type || typeof data.type !== 'string') {
        console.error('Invalid message: missing type field');
        return null;
      }
      
      return data as IncomingDataChannelMessage;
    } catch (error) {
      console.error('Failed to decode message:', error);
      return null;
    }
  }
}
```

**Test**: Write comprehensive unit tests for state transitions, encoding/decoding, and timeout handling.

**✓ Checkpoint**: Services compile, unit tests pass.

---

## Phase C: Components

### Step C1: Create ModeToggleButtonComponent

**File**: `src/app/components/mode-toggle-button/mode-toggle-button.component.ts`

```typescript
import { Component, input, output, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ResponseMode } from '../../models/response-mode.model';

@Component({
  selector: 'app-mode-toggle-button',
  standalone: true,
  imports: [MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './mode-toggle-button.component.html',
  styleUrl: './mode-toggle-button.component.scss',
})
export class ModeToggleButtonComponent {
  // Inputs
  currentMode = input.required<ResponseMode>();
  isPending = input<boolean>(false);
  disabled = input<boolean>(false);
  
  // Outputs
  onModeToggle = output<void>();
  
  // Internal debouncing
  private toggleClick$ = new Subject<void>();
  
  constructor() {
    this.toggleClick$
      .pipe(
        debounceTime(300),
        takeUntilDestroyed()
      )
      .subscribe(() => {
        this.onModeToggle.emit();
      });
  }
  
  handleClick(): void {
    if (!this.disabled() && !this.isPending()) {
      this.toggleClick$.next();
    }
  }
}
```

**File**: `src/app/components/mode-toggle-button/mode-toggle-button.component.html`

```html
<button
  mat-raised-button
  color="primary"
  [disabled]="disabled() || isPending()"
  (click)="handleClick()"
  [attr.aria-label]="currentMode() === 'voice' ? 'Voice mode active. Click to switch to chat mode.' : 'Chat mode active. Click to switch to voice mode.'"
  [attr.aria-pressed]="currentMode() === 'chat'"
  role="switch"
  class="mode-toggle-button">
  
  @if (isPending()) {
    <mat-spinner diameter="20" class="button-spinner"></mat-spinner>
    <span>Switching...</span>
  } @else {
    <span class="mode-icon">{{ currentMode() === 'voice' ? '🔊' : '💬' }}</span>
    <span>{{ currentMode() === 'voice' ? 'Voice Mode' : 'Chat Mode' }}</span>
  }
</button>
```

**File**: `src/app/components/mode-toggle-button/mode-toggle-button.component.scss`

```scss
.mode-toggle-button {
  min-width: 44px;
  min-height: 44px;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  
  .mode-icon {
    font-size: 1.2rem;
  }
  
  .button-spinner {
    margin-right: 8px;
  }
}
```

### Step C2: Create ChatMessageDisplayComponent

**File**: `src/app/components/chat-message-display/chat-message-display.component.ts`

```typescript
import { Component, input, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollingModule, CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { ChatMessageState } from '../../models/chat-message.model';

@Component({
  selector: 'app-chat-message-display',
  standalone: true,
  imports: [CommonModule, ScrollingModule],
  templateUrl: './chat-message-display.component.html',
  styleUrl: './chat-message-display.component.scss',
})
export class ChatMessageDisplayComponent implements AfterViewChecked {
  messages = input.required<readonly ChatMessageState[]>();
  autoScroll = input<boolean>(true);
  
  @ViewChild(CdkVirtualScrollViewport) 
  viewport?: CdkVirtualScrollViewport;
  
  private lastMessageCount = 0;
  
  ngAfterViewChecked(): void {
    const currentCount = this.messages().length;
    
    if (this.autoScroll() && currentCount > this.lastMessageCount && this.viewport) {
      this.scrollToBottom();
    }
    
    this.lastMessageCount = currentCount;
  }
  
  scrollToBottom(): void {
    if (this.viewport && this.messages().length > 0) {
      const lastIndex = this.messages().length - 1;
      this.viewport.scrollToIndex(lastIndex, 'smooth');
    }
  }
  
  trackByMessageId(index: number, message: ChatMessageState): string {
    return message.id;
  }
}
```

**File**: `src/app/components/chat-message-display/chat-message-display.component.html`

```html
<div class="chat-container">
  <cdk-virtual-scroll-viewport 
    itemSize="60" 
    class="chat-viewport">
    <div 
      *cdkVirtualFor="let message of messages(); trackBy: trackByMessageId"
      class="message-item"
      [class.user-message]="message.sender === 'user'"
      [class.agent-message]="message.sender === 'agent'">
      
      <div class="message-header">
        <span class="message-sender">
          {{ message.sender === 'user' ? 'You' : 'Agent' }}
        </span>
        <span class="message-timestamp">
          {{ message.timestamp | date:'shortTime' }}
        </span>
      </div>
      
      <div class="message-content">
        {{ message.content }}
      </div>
    </div>
  </cdk-virtual-scroll-viewport>
</div>
```

**File**: `src/app/components/chat-message-display/chat-message-display.component.scss`

```scss
.chat-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chat-viewport {
  flex: 1;
  overflow-y: auto;
}

.message-item {
  padding: 12px 16px;
  margin: 8px;
  border-radius: 8px;
  min-height: 44px;
  
  &.user-message {
    background-color: #e3f2fd;
    margin-left: auto;
    max-width: 70%;
  }
  
  &.agent-message {
    background-color: #f5f5f5;
    margin-right: auto;
    max-width: 70%;
  }
}

.message-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #666;
  margin-bottom: 4px;
}

.message-sender {
  font-weight: 600;
}

.message-content {
  font-size: 0.875rem;
  line-height: 1.5;
}
```

**✓ Checkpoint**: Components compile, render correctly in isolation.

---

## Phase D: Integration

### Step D1: Update VoiceChatComponent

**File**: `src/app/components/voice-chat/voice-chat.component.ts`

Add imports and inject new services:

```typescript
import { ModeToggleButtonComponent } from '../mode-toggle-button/mode-toggle-button.component';
import { ChatMessageDisplayComponent } from '../chat-message-display/chat-message-display.component';
import { ResponseModeService } from '../../services/response-mode.service';
import { ChatStorageService } from '../../services/chat-storage.service';

@Component({
  // ...existing config
  imports: [
    // ...existing imports
    ModeToggleButtonComponent,
    ChatMessageDisplayComponent,
  ],
})
export class VoiceChatComponent {
  // Existing injections
  private readonly connectionService = inject(LiveKitConnectionService);
  private readonly transcriptionService = inject(TranscriptionService);
  
  // NEW injections
  private readonly responseModeService = inject(ResponseModeService);
  private readonly chatStorage = inject(ChatStorageService);
  
  // NEW signals
  readonly currentMode = this.responseModeService.currentMode;
  readonly isPending = this.responseModeService.isPending;
  readonly chatMessages = this.chatStorage.messages;
  readonly isDataChannelAvailable = this.responseModeService.isDataChannelAvailable;
  
  // NEW method
  async handleModeToggle(): Promise<void> {
    try {
      await this.responseModeService.toggleMode();
    } catch (error) {
      console.error('Failed to toggle mode:', error);
    }
  }
  
  // MODIFY existing handleConnect
  async handleConnect(): Promise<void> {
    try {
      const config = {
        serverUrl: environment.liveKitUrl,
        roomName: crypto.randomUUID(),
        participantIdentity: `user-${Date.now()}`,
      };

      await this.connectionService.connect(config);

      const room = this.connectionService.getRoom();
      if (room) {
        this.transcriptionService.startTranscription(room);
        
        // NEW: Initialize response mode service
        this.responseModeService.initialize(room);
        
        // NEW: Try to restore saved preference
        const savedMode = this.chatStorage.loadPreferredMode();
        if (savedMode && savedMode === 'chat') {
          await this.responseModeService.setMode(savedMode);
        }
      }
    } catch (error) {
      console.error('Connection failed:', error);
    }
  }
  
  // MODIFY existing handleDisconnect
  async handleDisconnect(): Promise<void> {
    try {
      // NEW: Cleanup
      this.responseModeService.cleanup();
      this.chatStorage.clearMessages();
      
      this.transcriptionService.stopTranscription();
      await this.connectionService.disconnect();
    } catch (error) {
      console.error('Disconnect failed:', error);
    }
  }
}
```

**File**: `src/app/components/voice-chat/voice-chat.component.html`

Add mode toggle and chat display:

```html
<!-- Existing connection button -->
<app-connection-button
  [connectionState]="connectionState()"
  (onConnect)="handleConnect()"
  (onDisconnect)="handleDisconnect()">
</app-connection-button>

<!-- NEW: Mode toggle (only when connected) -->
@if (isConnected()) {
  <app-mode-toggle-button
    [currentMode]="currentMode()"
    [isPending]="isPending()"
    [disabled]="!isDataChannelAvailable()"
    (onModeToggle)="handleModeToggle()">
  </app-mode-toggle-button>
}

<!-- NEW: Chat display (only in chat mode) -->
@if (currentMode() === 'chat' && isConnected()) {
  <app-chat-message-display
    [messages]="chatMessages()"
    [autoScroll]="true">
  </app-chat-message-display>
}

<!-- Existing transcription display (always visible) -->
<app-transcription-display
  [transcriptions]="transcriptions()"
  [interimTranscription]="interimTranscription()">
</app-transcription-display>
```

**✓ Checkpoint**: Feature fully integrated, compiles without errors.

---

## Phase E: Testing

### Step E1: Unit Tests

Run tests for all new code:

```bash
npm test
```

Ensure 80%+ coverage for:
- ResponseModeService
- ChatStorageService
- ModeToggleButtonComponent
- ChatMessageDisplayComponent

### Step E2: Integration Testing

**File**: `tests/integration/response-mode-integration.spec.ts`

```typescript
describe('Response Mode Integration', () => {
  it('should switch from voice to chat mode', async () => {
    // Connect to LiveKit
    await voiceChatComponent.handleConnect();
    
    // Toggle to chat mode
    await voiceChatComponent.handleModeToggle();
    
    // Verify mode changed
    expect(responseModeService.currentMode()).toBe('chat');
    
    // Verify agent message appears in chat
    // (mock agent sending chat message)
    
    // Toggle back to voice
    await voiceChatComponent.handleModeToggle();
    expect(responseModeService.currentMode()).toBe('voice');
  });
});
```

---

## Troubleshooting

### Issue: Data channel messages not received

**Solution**: Verify Room.on(RoomEvent.DataReceived) listener is registered before messages are sent.

### Issue: Mode toggle stuck in "Switching..."

**Solution**: Check that agent is running and responding. Verify 5-second timeout is working.

### Issue: Chat messages not displaying

**Solution**: Confirm currentMode() === 'chat' before expecting chat display. Check chatStorage.messages() signal.

---

## Verification Checklist

- [ ] Mode toggle button appears when connected
- [ ] Button disabled when not connected or data channel unavailable
- [ ] Click toggle switches mode (voice ↔ chat)
- [ ] Loading state shows during mode change
- [ ] Chat display appears only in chat mode
- [ ] Agent messages appear in chat display
- [ ] User transcriptions appear in chat (if enabled)
- [ ] Auto-scroll works in chat display
- [ ] Mode preference persists across sessions
- [ ] Error handling works (timeout, invalid messages)
- [ ] Accessibility: keyboard navigation works
- [ ] Accessibility: screen reader announcements work
- [ ] Mobile: touch targets ≥44x44 pixels
- [ ] All unit tests pass
- [ ] Integration tests pass

---

## Next Steps

1. **Manual Testing**: Test with real LiveKit agent on multiple browsers
2. **Accessibility Audit**: Run axe-core, test with screen readers
3. **Mobile Testing**: Test on physical iOS/Android devices
4. **Code Review**: Submit PR following project conventions
5. **Documentation**: Update README with new feature

---

## Support Resources

- **Spec**: [spec.md](./spec.md)
- **Data Models**: [data-model.md](./data-model.md)
- **Contracts**: [contracts/service-contracts.md](./contracts/service-contracts.md)
- **Research**: [research.md](./research.md)
- **LiveKit Docs**: https://docs.livekit.io/client-sdk-js/
- **Angular Signals**: https://angular.dev/guide/signals
- **Angular CDK**: https://material.angular.io/cdk/categories

---

**Estimated Completion Time**: 6.5-7 hours for experienced Angular developer

Good luck! 🚀
