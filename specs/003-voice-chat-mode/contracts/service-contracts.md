# Service Contracts: Voice/Chat Response Mode Toggle

**Feature**: 003-voice-chat-mode  
**Phase**: 1 - Service Contracts  
**Date**: 2025-10-24

## Purpose

Define the public interfaces (contracts) for all services and components in the voice/chat response mode toggle feature. These contracts serve as the API specification for implementation and ensure consistent interfaces across the codebase.

---

## 1. ResponseModeService Contract

### Service Interface

```typescript
/**
 * Service for managing voice/chat response mode state and data channel communication
 * 
 * Responsibilities:
 * - Send mode change requests to LiveKit agent via data channel
 * - Listen for mode confirmation and chat messages from agent
 * - Manage response mode state with timeout handling
 * - Provide reactive state via Angular Signals
 */
export interface IResponseModeService {
  // === Read-only State Signals ===
  
  /**
   * Current confirmed response mode
   */
  readonly currentMode: Signal<ResponseMode>;
  
  /**
   * Whether the last mode change has been confirmed by agent
   * False during pending mode change, true when confirmed or timeout
   */
  readonly isConfirmed: Signal<boolean>;
  
  /**
   * Current error message, null if no error
   * Auto-clears after 5 seconds
   */
  readonly errorMessage: Signal<string | null>;
  
  /**
   * Whether data channel is available for mode switching
   */
  readonly isDataChannelAvailable: Signal<boolean>;
  
  /**
   * Computed signal: whether mode change is currently pending
   */
  readonly isPending: Signal<boolean>;
  
  // === Methods ===
  
  /**
   * Request a mode change
   * Sends SetResponseModeMessage to agent and waits for confirmation
   * 
   * @param mode - Desired response mode ('voice' or 'chat')
   * @returns Promise that resolves when mode is confirmed or rejects on timeout
   */
  setMode(mode: ResponseMode): Promise<void>;
  
  /**
   * Toggle between voice and chat modes
   * Convenience method that calls setMode with opposite of current mode
   */
  toggleMode(): Promise<void>;
  
  /**
   * Initialize the service with a LiveKit Room instance
   * Sets up data channel listeners
   * 
   * @param room - LiveKit Room instance
   */
  initialize(room: Room): void;
  
  /**
   * Cleanup when disconnecting
   * Removes event listeners and resets state
   */
  cleanup(): void;
}
```

### Usage Example

```typescript
// In VoiceChatComponent
export class VoiceChatComponent {
  private responseModeService = inject(ResponseModeService);
  
  // Reactive signals
  readonly currentMode = this.responseModeService.currentMode;
  readonly isPending = this.responseModeService.isPending;
  readonly errorMessage = this.responseModeService.errorMessage;
  
  async handleModeToggle(): Promise<void> {
    try {
      await this.responseModeService.toggleMode();
    } catch (error) {
      console.error('Mode toggle failed:', error);
    }
  }
  
  ngOnInit(): void {
    const room = this.liveKitConnectionService.getRoom();
    if (room) {
      this.responseModeService.initialize(room);
    }
  }
  
  ngOnDestroy(): void {
    this.responseModeService.cleanup();
  }
}
```

---

## 2. ChatStorageService Contract

### Service Interface

```typescript
/**
 * Service for managing chat message history and localStorage persistence
 * 
 * Responsibilities:
 * - Maintain session-only chat message history
 * - Add user and agent messages to history
 * - Persist user's preferred mode to localStorage
 * - Clear history on disconnect
 */
export interface IChatStorageService {
  // === Read-only State Signals ===
  
  /**
   * Current chat message history
   */
  readonly messages: Signal<readonly ChatMessageState[]>;
  
  /**
   * Total message count
   */
  readonly messageCount: Signal<number>;
  
  // === Methods ===
  
  /**
   * Add a user message (from transcription) to history
   * 
   * @param content - Transcribed text from user
   * @param timestamp - When the message was spoken
   */
  addUserMessage(content: string, timestamp?: Date): void;
  
  /**
   * Add an agent message (from data channel) to history
   * 
   * @param content - Agent's text response
   * @param timestamp - Unix timestamp from agent message
   */
  addAgentMessage(content: string, timestamp: number): void;
  
  /**
   * Clear all chat messages
   * Called on disconnect
   */
  clearMessages(): void;
  
  /**
   * Save user's preferred mode to localStorage
   * 
   * @param mode - Mode to persist
   */
  savePreferredMode(mode: ResponseMode): void;
  
  /**
   * Load user's preferred mode from localStorage
   * 
   * @returns Saved mode or null if not found/invalid
   */
  loadPreferredMode(): ResponseMode | null;
  
  /**
   * Clear saved mode preference
   */
  clearPreferredMode(): void;
}
```

### Usage Example

```typescript
// In ResponseModeService
export class ResponseModeService {
  private chatStorage = inject(ChatStorageService);
  
  private onChatMessageReceived(message: AgentChatMessage): void {
    // Add agent message to chat history
    this.chatStorage.addAgentMessage(message.message, message.timestamp);
  }
  
  private onModeChanged(mode: ResponseMode): void {
    // Persist user preference
    this.chatStorage.savePreferredMode(mode);
  }
}

// In TranscriptionService (existing service - minimal changes)
export class TranscriptionService {
  private chatStorage = inject(ChatStorageService);
  
  private onTranscriptionComplete(text: string): void {
    // If in chat mode, add user message to history
    if (this.responseModeService.currentMode() === 'chat') {
      this.chatStorage.addUserMessage(text);
    }
  }
}
```

---

## 3. Component Contracts

### ModeToggleButtonComponent Contract

```typescript
/**
 * Presentational component for mode toggle button
 * 
 * Responsibilities:
 * - Display current mode with icon and label
 * - Show loading state during mode change
 * - Handle click events with debouncing
 * - Provide ARIA labels for accessibility
 */
export interface IModeToggleButtonComponent {
  // === Inputs ===
  
  /**
   * Current response mode
   */
  currentMode: InputSignal<ResponseMode>;
  
  /**
   * Whether mode change is pending (show loading state)
   */
  isPending: InputSignal<boolean>;
  
  /**
   * Whether button should be disabled
   */
  disabled: InputSignal<boolean>;
  
  // === Outputs ===
  
  /**
   * Emitted when user clicks toggle (debounced)
   */
  onModeToggle: OutputEmitterRef<void>;
}
```

**Component Template Interface:**
```html
<app-mode-toggle-button
  [currentMode]="currentMode()"
  [isPending]="isPending()"
  [disabled]="!isDataChannelAvailable()"
  (onModeToggle)="handleModeToggle()">
</app-mode-toggle-button>
```

### ChatMessageDisplayComponent Contract

```typescript
/**
 * Presentational component for displaying chat messages
 * 
 * Responsibilities:
 * - Display list of chat messages
 * - Distinguish between user and agent messages
 * - Auto-scroll to latest message
 * - Use virtual scrolling for >100 messages
 */
export interface IChatMessageDisplayComponent {
  // === Inputs ===
  
  /**
   * Array of chat messages to display
   */
  messages: InputSignal<readonly ChatMessageState[]>;
  
  /**
   * Whether to auto-scroll to newest message
   * Default: true
   */
  autoScroll: InputSignal<boolean>;
  
  /**
   * Whether to enable virtual scrolling
   * Default: true when messages.length > 100
   */
  enableVirtualScroll: InputSignal<boolean>;
  
  // === Methods (ViewChild access) ===
  
  /**
   * Programmatically scroll to specific message
   */
  scrollToMessage(messageId: string): void;
  
  /**
   * Scroll to bottom (latest message)
   */
  scrollToBottom(): void;
}
```

**Component Template Interface:**
```html
<app-chat-message-display
  [messages]="chatMessages()"
  [autoScroll]="true"
  [enableVirtualScroll]="chatMessages().length > 100">
</app-chat-message-display>
```

---

## 4. Data Channel Message Protocol

### Message Encoding Contract

```typescript
/**
 * Encodes a data channel message to Uint8Array for transmission
 * 
 * @param message - Message object to encode
 * @returns UTF-8 encoded JSON as Uint8Array
 * @throws Error if encoding fails
 */
export function encodeDataChannelMessage(
  message: OutgoingDataChannelMessage
): Uint8Array {
  const json = JSON.stringify(message);
  const encoder = new TextEncoder();
  return encoder.encode(json);
}
```

### Message Decoding Contract

```typescript
/**
 * Decodes a data channel message from Uint8Array
 * 
 * @param payload - Raw bytes received from data channel
 * @returns Decoded message object or null if invalid
 */
export function decodeDataChannelMessage(
  payload: Uint8Array
): IncomingDataChannelMessage | null {
  try {
    const decoder = new TextDecoder('utf-8');
    const json = decoder.decode(payload);
    const data = JSON.parse(json);
    
    // Validate message structure
    if (!isIncomingMessage(data)) {
      console.error('Invalid incoming message structure:', data);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Failed to decode data channel message:', error);
    return null;
  }
}
```

### Protocol Specification

**Request: Set Response Mode**
```json
{
  "type": "set_response_mode",
  "mode": "chat"
}
```

**Response: Mode Updated Confirmation**
```json
{
  "type": "response_mode_updated",
  "mode": "chat"
}
```

**Response: Chat Message (chat mode only)**
```json
{
  "type": "chat_message",
  "message": "Hello! I'm happy to help you with that question.",
  "timestamp": 1729814400000
}
```

---

## 5. LiveKitConnectionService Extension Contract

### Extended Interface

```typescript
/**
 * Extension to existing LiveKitConnectionService
 * Adds method to expose Room instance for data channel access
 */
export interface ILiveKitConnectionServiceExtension {
  /**
   * Get the current LiveKit Room instance
   * Required for ResponseModeService to access data channel
   * 
   * @returns Room instance if connected, null otherwise
   */
  getRoom(): Room | null;
  
  /**
   * Existing methods remain unchanged
   */
  readonly connectionState: Signal<ConnectionState>;
  readonly connectionQuality: Signal<ConnectionQuality>;
  connect(config: LiveKitConfig): Promise<void>;
  disconnect(): Promise<void>;
  checkMicrophonePermission(): Promise<PermissionState>;
}
```

**Implementation Note**: This is a minimal extension to the existing service. The `getRoom()` method already exists but needs to be documented as part of this feature's contract.

---

## 6. Integration Points

### VoiceChatComponent (Smart Component) Integration

```typescript
/**
 * Updated VoiceChatComponent integrates response mode feature
 */
export class VoiceChatComponent {
  // === Existing Services ===
  private readonly connectionService = inject(LiveKitConnectionService);
  private readonly transcriptionService = inject(TranscriptionService);
  
  // === New Services ===
  private readonly responseModeService = inject(ResponseModeService);
  private readonly chatStorage = inject(ChatStorageService);
  
  // === Existing Signals ===
  readonly connectionState = this.connectionService.connectionState;
  readonly transcriptions = this.transcriptionService.transcriptions;
  
  // === New Signals ===
  readonly currentMode = this.responseModeService.currentMode;
  readonly isPending = this.responseModeService.isPending;
  readonly chatMessages = this.chatStorage.messages;
  readonly isDataChannelAvailable = this.responseModeService.isDataChannelAvailable;
  
  // === New Methods ===
  async handleModeToggle(): Promise<void> {
    await this.responseModeService.toggleMode();
  }
  
  // === Lifecycle Integration ===
  async handleConnect(): Promise<void> {
    // Existing connection logic...
    await this.connectionService.connect(config);
    
    // NEW: Initialize response mode service
    const room = this.connectionService.getRoom();
    if (room) {
      this.responseModeService.initialize(room);
      
      // Try to restore saved mode preference
      const savedMode = this.chatStorage.loadPreferredMode();
      if (savedMode) {
        await this.responseModeService.setMode(savedMode);
      }
    }
  }
  
  async handleDisconnect(): Promise<void> {
    // NEW: Cleanup response mode service
    this.responseModeService.cleanup();
    this.chatStorage.clearMessages();
    
    // Existing disconnect logic...
    await this.connectionService.disconnect();
  }
}
```

---

## 7. Testing Contracts

### ResponseModeService Test Interface

```typescript
describe('ResponseModeService', () => {
  it('should initialize with voice mode', () => {
    expect(service.currentMode()).toBe('voice');
    expect(service.isConfirmed()).toBe(true);
  });
  
  it('should send SetResponseModeMessage when setMode called', async () => {
    const publishDataSpy = spyOn(mockRoom.localParticipant, 'publishData');
    
    await service.setMode('chat');
    
    expect(publishDataSpy).toHaveBeenCalledWith(
      jasmine.any(Uint8Array),
      jasmine.objectContaining({ reliable: true })
    );
  });
  
  it('should update currentMode when confirmation received', () => {
    // Simulate agent confirmation
    const message: ResponseModeUpdatedMessage = {
      type: 'response_mode_updated',
      mode: 'chat'
    };
    
    service.handleDataReceived(encodeDataChannelMessage(message));
    
    expect(service.currentMode()).toBe('chat');
    expect(service.isConfirmed()).toBe(true);
  });
  
  it('should timeout after 5 seconds without confirmation', fakeAsync(() => {
    service.setMode('chat');
    
    expect(service.isPending()).toBe(true);
    
    tick(5000);
    
    expect(service.isPending()).toBe(false);
    expect(service.errorMessage()).toBe('Mode change timed out. Please try again.');
  }));
});
```

### Component Test Interface

```typescript
describe('ModeToggleButtonComponent', () => {
  it('should display current mode', () => {
    fixture.componentRef.setInput('currentMode', 'voice');
    fixture.detectChanges();
    
    expect(compiled.textContent).toContain('Voice Mode');
  });
  
  it('should emit onModeToggle when clicked', () => {
    const emitSpy = spyOn(component.onModeToggle, 'emit');
    
    const button = compiled.querySelector('button')!;
    button.click();
    
    expect(emitSpy).toHaveBeenCalled();
  });
  
  it('should debounce rapid clicks', fakeAsync(() => {
    const emitSpy = spyOn(component.onModeToggle, 'emit');
    const button = compiled.querySelector('button')!;
    
    button.click();
    button.click();
    button.click();
    
    tick(300);
    
    expect(emitSpy).toHaveBeenCalledTimes(1);
  }));
});
```

---

## 8. Dependency Injection Contract

```typescript
/**
 * Service providers for response mode feature
 */
export const RESPONSE_MODE_PROVIDERS: Provider[] = [
  ResponseModeService,
  ChatStorageService,
];

/**
 * In app.config.ts
 */
export const appConfig: ApplicationConfig = {
  providers: [
    // ... existing providers
    ...RESPONSE_MODE_PROVIDERS,
  ]
};
```

---

## Summary

All service and component contracts defined:

- ✅ **IResponseModeService**: Data channel communication and state management
- ✅ **IChatStorageService**: Message history and localStorage persistence
- ✅ **IModeToggleButtonComponent**: Presentational mode toggle UI
- ✅ **IChatMessageDisplayComponent**: Presentational chat display UI
- ✅ **ILiveKitConnectionServiceExtension**: Room instance access
- ✅ **Message Protocol**: JSON encoding/decoding contracts
- ✅ **Integration Points**: How components and services interact
- ✅ **Testing Contracts**: Expected test coverage and interfaces

**Next**: Create developer quickstart guide (quickstart.md)
