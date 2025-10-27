# Developer Quickstart: Unified Conversation Experience

**Feature**: 005-unified-conversation  
**Last Updated**: October 26, 2025

## Overview

This guide helps developers understand and work with the unified conversation experience feature. It covers the architecture, key concepts, and common development tasks.

## Architecture Overview

### Component Structure

```
UnifiedConversationDisplayComponent (Smart)
    ↓ manages state
ConversationStorageService
    ↓ provides messages
ConversationMessageComponent (Presentational)
    ↓ renders individual messages
```

**Smart Component** (`UnifiedConversationDisplayComponent`):
- Injects services (ConversationStorageService, LiveKitConnectionService)
- Manages conversation feed state using Angular Signals
- Handles virtual scrolling and auto-scroll behavior
- Persists/restores conversation history
- No DOM manipulation logic

**Presentational Component** (`ConversationMessageComponent`):
- Receives message via `input()` signal
- Renders message with appropriate styling
- Emits user actions via `output()` signals (future)
- Pure component - no business logic

### Data Flow

```
LiveKit Transcription Event
    ↓
LiveKitConnectionService
    ↓
createTranscriptionMessage()
    ↓
ConversationStorageService.addMessage()
    ↓
messages signal updated
    ↓
UnifiedConversationDisplayComponent (computed sorted messages)
    ↓
ConversationMessageComponent (ngFor loop)
    ↓
DOM Rendered
```

### State Management

All state managed via Angular Signals:

```typescript
// In ConversationStorageService
private _messages = signal<UnifiedConversationMessage[]>([]);
readonly messages = this._messages.asReadonly();

// In UnifiedConversationDisplayComponent
sortedMessages = computed(() => 
  this.conversationStorage.messages()
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
);
```

## Key Concepts

### 1. Unified Message Model

Messages use a **discriminated union** pattern:

```typescript
type UnifiedConversationMessage = 
  | TranscriptionConversationMessage  // messageType: 'transcription'
  | ChatConversationMessage;          // messageType: 'chat'
```

**Type narrowing** based on discriminator:

```typescript
if (message.messageType === 'transcription') {
  // TypeScript knows: message is TranscriptionConversationMessage
  console.log(message.confidence, message.isFinal);
} else {
  // TypeScript knows: message is ChatConversationMessage
  console.log(message.deliveryMethod);
}
```

### 2. Message Ordering

Messages sorted by `timestamp` field:

```typescript
sortedMessages = computed(() => 
  [...this.messages()].sort((a, b) => 
    a.timestamp.getTime() - b.timestamp.getTime()
  )
);
```

**Out-of-order handling**: Messages can arrive out of order due to network latency. The computed signal ensures they're always displayed chronologically.

### 3. Interim Transcriptions

Interim transcriptions (`isFinal: false`) displayed separately:

```typescript
// Service
interimTranscription = signal<InterimTranscription | null>(null);

// Component template
@if (interimTranscription(); as interim) {
  <div class="interim-message" [style.opacity]="0.6">
    {{ interim.text }}
  </div>
}
```

When final transcription arrives, interim is replaced:

```typescript
// Replace interim with final
this.interimTranscription.set(null);
this.addMessage(finalMessage);
```

### 4. Virtual Scrolling

Activated when message count > 100:

```typescript
useVirtualScrolling = computed(() => this.messages().length > 100);
```

Template uses `@if` to switch between regular and virtual scrolling:

```html
@if (useVirtualScrolling()) {
  <cdk-virtual-scroll-viewport itemSize="80">
    <!-- Virtual scrolling -->
  </cdk-virtual-scroll-viewport>
} @else {
  <div #scrollContainer>
    <!-- Regular scrolling -->
  </div>
}
```

### 5. Storage Persistence

Conversation history saved to `sessionStorage`:

```typescript
// Key format
const storageKey = `melior-conversation-${sessionId}`;

// Save (debounced)
sessionStorage.setItem(storageKey, serializeConversationFeed(state));

// Restore
const json = sessionStorage.getItem(storageKey);
const state = deserializeConversationFeed(json);
```

**Automatic cleanup**: sessionStorage clears on tab/window close.

## Common Development Tasks

### Task 1: Add a New Message

```typescript
import { createTranscriptionMessage } from '../models/unified-conversation-message.model';

// In your component or service
const message = createTranscriptionMessage(
  'user',              // sender
  'Hello world',       // text
  true,                // isFinal
  0.95,                // confidence
  'en-US'              // language
);

// Add to storage
this.conversationStorage.addMessage(message);
```

### Task 2: Handle Mode Toggle

```typescript
// In parent component
onModeToggle() {
  // Update mode in service (conversation history preserved)
  this.conversationStorage.setMode(
    this.currentMode === 'voice' ? 'chat' : 'voice'
  );
}
```

### Task 3: Clear Conversation History

```typescript
// In ConversationStorageService
clearMessages() {
  this._messages.set([]);
  this.interimTranscription.set(null);
  sessionStorage.removeItem(this.storageKey);
}
```

### Task 4: Test Message Rendering

```typescript
// In component spec file
it('should render user message with correct styling', () => {
  const message = createChatMessage('user', 'Test message');
  fixture.componentRef.setInput('message', message);
  fixture.detectChanges();
  
  const element = fixture.nativeElement.querySelector('.message');
  expect(element.textContent).toContain('Test message');
  expect(element.classList.contains('message--user')).toBe(true);
});
```

### Task 5: Migrate Legacy Data

```typescript
// In ConversationStorageService constructor
constructor() {
  this.migrateLegacyData();
  this.restoreFromStorage();
}

private migrateLegacyData() {
  const legacyKey = 'chat-storage';
  const legacyJson = sessionStorage.getItem(legacyKey);
  
  if (legacyJson) {
    try {
      const legacy = JSON.parse(legacyJson);
      const migrated = legacy.messages.map(msg => ({
        ...msg,
        messageType: 'chat',
        deliveryMethod: 'data-channel'
      }));
      
      this._messages.set(migrated);
      sessionStorage.removeItem(legacyKey);
    } catch (error) {
      console.error('Migration failed:', error);
    }
  }
}
```

## Testing Guide

### Unit Testing Components

```typescript
describe('UnifiedConversationDisplayComponent', () => {
  let component: UnifiedConversationDisplayComponent;
  let fixture: ComponentFixture<UnifiedConversationDisplayComponent>;
  let mockStorage: jasmine.SpyObj<ConversationStorageService>;

  beforeEach(() => {
    mockStorage = jasmine.createSpyObj('ConversationStorageService', 
      ['addMessage', 'clearMessages'],
      { messages: signal([]) }  // Property spy
    );

    TestBed.configureTestingModule({
      imports: [UnifiedConversationDisplayComponent],
      providers: [
        { provide: ConversationStorageService, useValue: mockStorage }
      ]
    });

    fixture = TestBed.createComponent(UnifiedConversationDisplayComponent);
    component = fixture.componentInstance;
  });

  it('should sort messages by timestamp', () => {
    const msg1 = createChatMessage('user', 'First', new Date('2025-01-01'));
    const msg2 = createChatMessage('agent', 'Second', new Date('2025-01-02'));
    
    // Add in reverse order
    mockStorage.messages.set([msg2, msg1]);
    
    const sorted = component.sortedMessages();
    expect(sorted[0]).toBe(msg1);
    expect(sorted[1]).toBe(msg2);
  });
});
```

### Integration Testing

```typescript
describe('Conversation Flow', () => {
  it('should preserve history when toggling modes', async () => {
    // Start in voice mode
    const service = TestBed.inject(ConversationStorageService);
    service.setMode('voice');
    
    // Add transcription message
    const msg1 = createTranscriptionMessage('user', 'Hello', true);
    service.addMessage(msg1);
    
    // Toggle to chat mode
    service.setMode('chat');
    
    // Add chat message
    const msg2 = createChatMessage('agent', 'Hi there');
    service.addMessage(msg2);
    
    // Verify both messages present
    const messages = service.messages();
    expect(messages.length).toBe(2);
    expect(messages).toContain(msg1);
    expect(messages).toContain(msg2);
  });
});
```

## Performance Tips

### 1. Use TrackBy Functions

Always use trackBy with ngFor:

```typescript
trackByMessageId(index: number, message: UnifiedConversationMessage): string {
  return message.id;
}
```

```html
@for (message of sortedMessages(); track trackByMessageId($index, message)) {
  <app-conversation-message [message]="message" />
}
```

### 2. OnPush Change Detection

All components use OnPush:

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
```

This means components only re-render when:
- Input signals change
- Output events fire
- Async pipes emit new values

### 3. Debounce Storage Writes

```typescript
private saveToStorage = debounce(() => {
  const state = this.getCurrentState();
  sessionStorage.setItem(this.storageKey, serializeConversationFeed(state));
}, 500);
```

### 4. Virtual Scrolling for Large Lists

Automatic activation at >100 messages prevents DOM overload.

## Debugging Tips

### Enable Console Logging

```typescript
// In ConversationStorageService
addMessage(message: UnifiedConversationMessage) {
  console.log('[ConversationStorage] Adding message:', message);
  this._messages.update(msgs => [...msgs, message]);
}
```

### Inspect Signal State

```typescript
// In browser console
ng.probe($0).componentInstance.sortedMessages()
```

### Check SessionStorage

```typescript
// In browser console
JSON.parse(sessionStorage.getItem('melior-conversation-session-id'))
```

### Angular DevTools

Use Angular DevTools browser extension:
- Inspect component signals
- View component tree
- Profile change detection

## Common Pitfalls

### ❌ Mutating Signal Arrays

```typescript
// WRONG - mutates existing array
this._messages().push(newMessage);

// CORRECT - creates new array
this._messages.update(msgs => [...msgs, newMessage]);
```

### ❌ Forgetting OnPush Change Detection

```typescript
// WRONG - component won't update
@Component({
  // Missing changeDetection: ChangeDetectionStrategy.OnPush
})

// CORRECT
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
```

### ❌ Not Using Type Guards

```typescript
// WRONG - TypeScript can't narrow type
if (message.confidence) { /* ... */ }

// CORRECT - type narrowed to TranscriptionConversationMessage
if (isTranscriptionMessage(message)) {
  console.log(message.confidence); // OK
}
```

### ❌ Blocking Auto-Scroll

```typescript
// WRONG - scrollToBottom in constructor (DOM not ready)
constructor() {
  this.scrollToBottom();
}

// CORRECT - use effect for auto-scroll
constructor() {
  effect(() => {
    const msgs = this.sortedMessages();
    if (msgs.length > 0) {
      setTimeout(() => this.scrollToBottom(), 0);
    }
  });
}
```

## References

- [Spec Document](./spec.md)
- [Data Model](./data-model.md)
- [Research & Decisions](./research.md)
- [Angular Signals Guide](https://angular.dev/guide/signals)
- [Angular CDK Scrolling](https://material.angular.io/cdk/scrolling/overview)
- [TypeScript Discriminated Unions](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions)

## Getting Help

- Review existing components: `TranscriptionDisplayComponent`, `ChatMessageDisplayComponent`
- Check service implementations: `ChatStorageService`, `LiveKitConnectionService`
- Consult constitution: `.specify/memory/constitution.md`
- Ask in team chat or create GitHub issue
