# Migration Guide: Unified Conversation Experience

**Feature**: 005-unified-conversation  
**Date**: October 26, 2025  
**Status**: Active

## Overview

This guide helps developers migrate from the legacy separate transcription and chat message display components to the new unified conversation experience.

## What's Changed

### Deprecated Components

The following components and services are now deprecated:

- `TranscriptionDisplayComponent` → Replace with `UnifiedConversationDisplayComponent`
- `ChatMessageDisplayComponent` → Replace with `UnifiedConversationDisplayComponent`
- `ChatStorageService` → Replace with `ConversationStorageService`

### New Components

- `UnifiedConversationDisplayComponent` - Smart container for all conversation messages
- `ConversationMessageComponent` - Presentational component for individual messages
- `ConversationStorageService` - Unified storage with sessionStorage persistence

## Migration Steps

### Step 1: Replace Component Imports

**Before:**
```typescript
import { TranscriptionDisplayComponent } from './components/transcription-display/transcription-display.component';
import { ChatMessageDisplayComponent } from './components/chat-message-display/chat-message-display.component';
```

**After:**
```typescript
import { UnifiedConversationDisplayComponent } from './components/unified-conversation-display/unified-conversation-display.component';
```

### Step 2: Update Template Usage

**Before:**
```html
<app-transcription-display
  [transcriptions]="transcriptions()"
  [interimTranscription]="interimTranscription()"
/>

<app-chat-message-display
  [messages]="chatMessages()"
/>
```

**After:**
```html
<app-unified-conversation-display />
```

Note: The unified component automatically subscribes to `ConversationStorageService` for messages, so no inputs are needed.

### Step 3: Replace Service Injections

**Before:**
```typescript
import { ChatStorageService } from './services/chat-storage.service';

export class MyComponent {
  private chatStorage = inject(ChatStorageService);

  sendMessage(text: string) {
    this.chatStorage.addAgentMessage(text);
  }
}
```

**After:**
```typescript
import { ConversationStorageService } from './services/conversation-storage.service';
import { createChatMessage } from './models/unified-conversation-message.model';

export class MyComponent {
  private conversationStorage = inject(ConversationStorageService);

  sendMessage(text: string) {
    const message = createChatMessage('agent', text);
    this.conversationStorage.addMessage(message);
  }
}
```

### Step 4: Update Message Creation

**Before (Transcription):**
```typescript
const transcription: TranscriptionMessage = {
  id: crypto.randomUUID(),
  text: 'Hello world',
  timestamp: Date.now(),
  speaker: 'user',
  isFinal: true,
  confidence: 0.95
};
```

**After (Transcription):**
```typescript
import { createTranscriptionMessage } from './models/unified-conversation-message.model';

const message = createTranscriptionMessage(
  'user',           // speaker
  'Hello world',    // text
  true,             // isFinal
  0.95,             // confidence (optional)
  'en-US'           // language (optional)
);
```

**Before (Chat):**
```typescript
const chatMessage = createUserMessage('Hello world');
```

**After (Chat):**
```typescript
import { createChatMessage } from './models/unified-conversation-message.model';

const message = createChatMessage('user', 'Hello world');
```

### Step 5: Update LiveKit Integration

**Before:**
```typescript
// In LiveKitConnectionService
private handleTranscription(event: TranscriptionEvent) {
  const message = {
    id: crypto.randomUUID(),
    text: event.text,
    timestamp: Date.now(),
    speaker: event.participant.identity === 'agent' ? 'agent' : 'user',
    isFinal: event.isFinal,
    confidence: event.confidence
  };
  
  // Emit to transcription display
  this.transcriptionSubject.next(message);
}
```

**After:**
```typescript
import { createTranscriptionMessage } from '../models/unified-conversation-message.model';
import { ConversationStorageService } from '../services/conversation-storage.service';

export class LiveKitConnectionService {
  private conversationStorage = inject(ConversationStorageService);

  private handleTranscription(event: TranscriptionEvent) {
    const speaker = event.participant.identity === 'agent' ? 'agent' : 'user';
    const message = createTranscriptionMessage(
      speaker,
      event.text,
      event.isFinal,
      event.confidence,
      event.language
    );
    
    // Add to unified conversation storage
    this.conversationStorage.addMessage(message);
  }
}
```

### Step 6: Remove Legacy Code

After migration is complete and tested:

1. Remove unused imports of deprecated components
2. Remove deprecated component selectors from templates
3. Remove deprecated service injections
4. Run tests to verify functionality
5. Remove deprecated files (in a future release)

## Breaking Changes

### API Differences

| Legacy | Unified | Notes |
|--------|---------|-------|
| `ChatStorageService.addUserMessage(text)` | `ConversationStorageService.addMessage(createChatMessage('user', text))` | Explicit message creation |
| `ChatStorageService.addAgentMessage(text)` | `ConversationStorageService.addMessage(createChatMessage('agent', text))` | Explicit message creation |
| `ChatStorageService.messages()` | `ConversationStorageService.messages()` | Returns unified message type |
| `ChatStorageService.clearMessages()` | `ConversationStorageService.clearMessages()` | Same API |
| `TranscriptionDisplayComponent` inputs | None | Component self-manages state |
| `ChatMessageDisplayComponent` inputs | None | Component self-manages state |

### Type Changes

- `TranscriptionMessage` → `TranscriptionConversationMessage` (part of `UnifiedConversationMessage` union)
- `ChatMessageState` → `ChatConversationMessage` (part of `UnifiedConversationMessage` union)
- All messages now use `Date` objects instead of `number` timestamps

### Storage Changes

- Messages are now persisted to `sessionStorage` automatically
- Legacy `chat-storage` format is migrated automatically on first load
- Storage key format: `melior-conversation-{sessionId}`

## New Features Available After Migration

### 1. Conversation Persistence
Messages are automatically saved to sessionStorage and restored on reconnect.

```typescript
// No additional code needed - automatic persistence
```

### 2. Mode Toggle Integration
Switch between voice and chat modes mid-conversation without losing history.

```typescript
conversationStorage.setMode('chat'); // or 'voice'
```

### 3. Virtual Scrolling
Automatically activates when message count exceeds 100 for better performance.

```typescript
// No configuration needed - automatic activation
```

### 4. Session Boundary Indicators
Visual separators show where previous session messages end and new ones begin.

```html
<!-- Automatically rendered in unified display -->
```

### 5. Clear Conversation
User can clear conversation history with confirmation dialog.

```typescript
// Already integrated in UnifiedConversationDisplayComponent
// Accessible via UI button
```

## Testing Your Migration

### 1. Unit Tests

Update component tests to use `ConversationStorageService`:

```typescript
import { ConversationStorageService } from './services/conversation-storage.service';
import { createChatMessage } from './models/unified-conversation-message.model';

describe('MyComponent', () => {
  let service: ConversationStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ConversationStorageService]
    });
    service = TestBed.inject(ConversationStorageService);
  });

  it('should add message to conversation', () => {
    const message = createChatMessage('user', 'Hello');
    service.addMessage(message);
    
    expect(service.messages()).toContain(message);
  });
});
```

### 2. Integration Tests

Verify unified conversation flow:

```typescript
it('should display both transcription and chat messages', async () => {
  const transcription = createTranscriptionMessage('user', 'Hello', true);
  const chat = createChatMessage('agent', 'Hi there');
  
  service.addMessage(transcription);
  service.addMessage(chat);
  
  expect(service.messages().length).toBe(2);
  expect(service.sortedMessages()[0]).toBe(transcription);
  expect(service.sortedMessages()[1]).toBe(chat);
});
```

### 3. Manual Testing Checklist

- [ ] Messages appear in unified display
- [ ] User and agent messages are visually distinct
- [ ] Timestamps are correct
- [ ] Messages persist across disconnect/reconnect
- [ ] Mode toggle preserves conversation history
- [ ] Virtual scrolling activates with 100+ messages
- [ ] Clear conversation button works with confirmation
- [ ] Session boundary separator appears after restore

## Rollback Plan

If issues arise, you can temporarily revert by:

1. Re-importing deprecated components
2. Restoring old template markup
3. Switching back to `ChatStorageService`
4. Filing an issue with details

The deprecated components will remain in the codebase for at least one release cycle.

## Support

For questions or issues during migration:

- Review the [quickstart guide](./quickstart.md)
- Check the [data model documentation](./data-model.md)
- See example implementation in `tests/integration/unified-conversation-flow.spec.ts`
- File an issue on GitHub

## Timeline

- **October 26, 2025**: Unified conversation feature released
- **November 2025**: Deprecation warnings in place
- **December 2025**: Remove deprecated components (tentative)

Start migration as soon as possible to benefit from new features and avoid breaking changes.
