# Quickstart: Text Chat Input

**Feature**: 007-text-chat-input  
**Date**: 2025-10-30  
**Target Audience**: Developers implementing the text chat input feature

## Overview

This guide provides step-by-step instructions for implementing the text chat input feature. By the end of this guide, users will be able to type and send messages to the LiveKit agent as an alternative to voice input.

## Prerequisites

Before starting, ensure you have:

- ✅ Angular 20.0.0 project setup with standalone components
- ✅ Angular Material 20.0.0 installed and configured
- ✅ LiveKit Client 2.x integrated (from feature 001)
- ✅ Unified conversation display implemented (feature 005)
- ✅ Voice/chat mode toggle working (feature 003)
- ✅ Active LiveKit agent running (agent.md deployed)

## Implementation Steps

### Step 1: Create Data Models

**Duration**: 15 minutes

Create the necessary TypeScript models for text input state and protocol:

```bash
# Create new model files
ng generate interface models/text-input-state --type=model
ng generate interface models/text-input-protocol --type=model
ng generate interface models/text-message-error --type=model
```

**Files to create**:
1. `src/app/models/text-input-state.model.ts` - TextInputState, TextInputConfig interfaces
2. `src/app/models/text-input-protocol.model.ts` - TextMessageProtocol, serialization functions
3. `src/app/models/text-message-error.model.ts` - Error types and validation

**Copy interfaces from**: `../data-model.md` sections 2, 4, and 6

**Validation**: Compile TypeScript with no errors (`npm run build`)

---

### Step 2: Extend Unified Message Model

**Duration**: 10 minutes

Update the existing unified conversation message model to support text messages:

```typescript
// src/app/models/unified-conversation-message.model.ts

// ADD: Message source type
export type MessageSource = 'voice' | 'text';

// ADD: User text message interface
export interface UserTextMessage extends ChatConversationMessage {
  readonly sender: 'user';
  readonly source: 'text';
}

// ADD: Factory function
export function createUserTextMessage(
  content: string,
  timestamp: Date = new Date()
): UserTextMessage {
  return {
    id: crypto.randomUUID(),
    messageType: 'chat',
    content,
    timestamp,
    sender: 'user',
    source: 'text',
    deliveryMethod: 'data-channel'
  };
}

// ADD: Type guard
export function isUserTextMessage(
  message: UnifiedConversationMessage
): message is UserTextMessage {
  return message.messageType === 'chat' && message.sender === 'user';
}
```

**Validation**: Run unit tests for message model (`npm test -- message.model`)

---

### Step 3: Create Text Input Component

**Duration**: 30 minutes

Generate the new text input component:

```bash
ng generate component components/text-input --standalone --skip-tests=false
```

**Component structure**:
```typescript
// src/app/components/text-input/text-input.component.ts
import { Component, signal, computed, output, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-text-input',
  standalone: true,
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './text-input.component.html',
  styleUrls: ['./text-input.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TextInputComponent {
  // Inputs
  isDisabled = input<boolean>(false);
  placeholder = input<string>('Type a message...');
  
  // Outputs
  messageSent = output<string>();
  
  // Component state
  messageText = signal<string>('');
  isSending = signal<boolean>(false);
  
  // Computed
  canSend = computed(() => {
    const text = this.messageText().trim();
    return text.length > 0 && !this.isDisabled() && !this.isSending();
  });
  
  characterCount = computed(() => this.messageText().length);
  showCharacterCount = computed(() => this.characterCount() > 4500); // 90% of 5000
  
  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
  
  sendMessage(): void {
    if (!this.canSend()) return;
    
    const text = this.messageText().trim();
    this.messageSent.emit(text);
    this.messageText.set('');
  }
}
```

**Template**:
```html
<!-- src/app/components/text-input/text-input.component.html -->
<div class="text-input-container">
  <mat-form-field appearance="outline" class="text-input-field">
    <mat-label>{{ placeholder() }}</mat-label>
    <textarea
      matInput
      matTextareaAutosize
      [matAutosizeMinRows]="1"
      [matAutosizeMaxRows]="5"
      [(ngModel)]="messageText"
      (keydown)="handleKeydown($event)"
      [disabled]="isDisabled()"
      [placeholder]="placeholder()"
      maxlength="5000"
      aria-label="Type your message">
    </textarea>
    @if (showCharacterCount()) {
      <mat-hint align="end">{{ characterCount() }} / 5000</mat-hint>
    }
  </mat-form-field>

  <button
    mat-fab
    color="primary"
    [disabled]="!canSend()"
    (click)="sendMessage()"
    aria-label="Send message">
    <mat-icon>send</mat-icon>
  </button>
</div>
```

**Styles**:
```scss
// src/app/components/text-input/text-input.component.scss
:host {
  display: block;
}

.text-input-container {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  padding: 16px;
  background: white;
  border-top: 1px solid #e0e0e0;
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10;
}

.text-input-field {
  flex: 1;
  margin-bottom: 0;
}

button[mat-fab] {
  flex-shrink: 0;
}

// Mobile optimization
@media (max-width: 600px) {
  .text-input-container {
    padding: 12px 8px;
    gap: 8px;
  }
}
```

**Validation**: Run component unit tests (`npm test -- text-input.component`)

---

### Step 4: Update LiveKit Connection Service

**Duration**: 20 minutes

Add method to send text messages via data channel:

```typescript
// src/app/services/livekit-connection.service.ts

/**
 * Send text message to agent via data channel
 * @param content - Message text content
 * @returns Promise that resolves when message is sent
 */
async sendTextMessage(content: string): Promise<void> {
  if (!this._room || this._connectionState().status !== 'connected') {
    throw createTextMessageError('DISCONNECTED', 'Not connected to LiveKit');
  }

  // Validate content
  const validation = validateTextMessageContent(content);
  if (!validation.valid) {
    throw validation.error;
  }

  // Create protocol message
  const message: TextMessageProtocol = {
    type: 'text_message',
    messageId: crypto.randomUUID(),
    content: content.trim(),
    timestamp: Date.now(),
  };

  // Serialize and send via data channel
  const payload = new TextEncoder().encode(JSON.stringify(message));
  await this._room.localParticipant?.publishData(payload, { reliable: true });

  console.log(`📤 Sent text message [${message.messageId}]: "${content}"`);
}
```

**Validation**: Test with mock Room object

---

### Step 5: Update Conversation Service

**Duration**: 15 minutes

Add method to handle text message sending:

```typescript
// src/app/services/conversation.service.ts

private readonly liveKitService = inject(LiveKitConnectionService);

/**
 * Send text message to agent
 * Adds message to conversation and sends via data channel
 */
async sendTextMessage(content: string): Promise<void> {
  try {
    // Create user text message
    const message = createUserTextMessage(content);
    
    // Add to conversation immediately (optimistic update)
    this.addMessage(message);
    
    // Send via LiveKit data channel
    await this.liveKitService.sendTextMessage(content);
    
    console.log(`✅ Text message sent: "${content}"`);
  } catch (error) {
    console.error('Failed to send text message:', error);
    
    // TODO: Remove message from conversation or mark as failed
    throw error;
  }
}
```

**Validation**: Unit test with mocked LiveKit service

---

### Step 6: Integrate into Conversation Component

**Duration**: 10 minutes

Add text input component to conversation display:

```html
<!-- src/app/components/conversation/conversation.component.html -->
<div class="conversation-container">
  <!-- Existing conversation display -->
  <div class="messages-wrapper">
    <cdk-virtual-scroll-viewport
      itemSize="100"
      class="messages-viewport">
      <!-- Message list -->
    </cdk-virtual-scroll-viewport>
  </div>

  <!-- NEW: Text input at bottom -->
  <app-text-input
    [isDisabled]="isDisconnected()"
    (messageSent)="handleTextMessage($event)">
  </app-text-input>
</div>
```

```typescript
// src/app/components/conversation/conversation.component.ts
private readonly conversationService = inject(ConversationService);

isDisconnected = computed(() => {
  return this.connectionState().status !== 'connected';
});

async handleTextMessage(content: string): Promise<void> {
  try {
    await this.conversationService.sendTextMessage(content);
  } catch (error) {
    console.error('Failed to send text message:', error);
    // TODO: Show error notification to user
  }
}
```

**Validation**: Manually test sending text messages in browser

---

### Step 7: Update LiveKit Agent

**Duration**: 20 minutes

Modify the agent to handle text messages from data channel:

```typescript
// agent/agent.md

ctx.room.on('dataReceived', async (payload: Uint8Array) => {
  try {
    const decoder = new TextDecoder();
    const messageText = decoder.decode(payload);
    const message = JSON.parse(messageText);

    // Handle set_response_mode message
    if (message.type === 'set_response_mode') {
      // ... existing code ...
    }

    // NEW: Handle text messages
    if (message.type === 'text_message') {
      console.log(`📝 Received text message [${message.messageId}]: "${message.content}"`);
      
      // Validate message
      if (!message.content || message.content.trim().length === 0) {
        console.error('Invalid text message: empty content');
        return;
      }

      // Bypass STT - inject directly into conversation
      session.conversation.item.create({
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: message.content }]
      });

      // Agent will process and respond based on responseMode (voice or chat)
      console.log(`✅ Text message processed, agent responding in ${responseMode} mode`);
    }
  } catch (error) {
    console.error('Error processing data channel message:', error);
  }
});
```

**Deployment**:
```bash
# Deploy updated agent to LiveKit Cloud
cd agent
npm run build
npm run deploy
```

**Validation**: Test end-to-end flow (type message → agent responds)

---

### Step 8: Add Integration Tests

**Duration**: 25 minutes

Create integration tests for text message flow:

```typescript
// tests/integration/text-chat-input.spec.ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ConversationService } from '../../src/app/services/conversation.service';
import { LiveKitConnectionService } from '../../src/app/services/livekit-connection.service';

describe('Text Chat Input Integration', () => {
  let conversationService: ConversationService;
  let liveKitService: LiveKitConnectionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ConversationService,
        LiveKitConnectionService,
        provideHttpClientTesting()
      ]
    });

    conversationService = TestBed.inject(ConversationService);
    liveKitService = TestBed.inject(LiveKitConnectionService);
  });

  it('should send text message and add to conversation', async () => {
    // Arrange
    spyOn(liveKitService, 'sendTextMessage').and.returnValue(Promise.resolve());
    const messageContent = 'Hello, agent!';

    // Act
    await conversationService.sendTextMessage(messageContent);

    // Assert
    expect(liveKitService.sendTextMessage).toHaveBeenCalledWith(messageContent);
    
    const messages = conversationService.messages();
    const lastMessage = messages[messages.length - 1];
    expect(lastMessage.content).toBe(messageContent);
    expect(lastMessage.sender).toBe('user');
  });

  it('should handle empty message validation', async () => {
    // Arrange
    const emptyMessage = '   ';

    // Act & Assert
    await expectAsync(conversationService.sendTextMessage(emptyMessage))
      .toBeRejectedWithError();
  });

  it('should handle disconnected state', async () => {
    // Arrange
    spyOn(liveKitService, 'sendTextMessage').and.throwError('DISCONNECTED');

    // Act & Assert
    await expectAsync(conversationService.sendTextMessage('test'))
      .toBeRejected();
  });
});
```

**Run tests**:
```bash
npm test -- --include='**/text-chat-input.spec.ts'
```

---

## Testing Checklist

After completing implementation, verify:

- ✅ **P1-US1**: Text input visible at bottom of screen
- ✅ **P1-US1**: Enter key sends message
- ✅ **P1-US1**: Shift+Enter inserts new line
- ✅ **P1-US1**: Message appears in conversation history
- ✅ **P1-US1**: Text input clears after sending
- ✅ **P1-US2**: Text input visible in voice mode
- ✅ **P1-US2**: Text input visible in chat mode
- ✅ **P1-US2**: Text input disabled when disconnected
- ✅ **P1-US3**: Text messages bypass speech-to-text
- ✅ **P1-US3**: Agent responds in current mode (voice or chat)
- ✅ **P2-US4**: Multi-line support with Shift+Enter
- ✅ **P2-US4**: Send button disabled when input empty
- ✅ **P2-US4**: Character count appears near limit
- ✅ **P2-US5**: Mobile keyboard doesn't cover input
- ✅ **P2-US5**: Input scrolls into view on mobile

## Common Issues & Solutions

### Issue 1: Send button not enabling
**Symptom**: Send button stays disabled even with text entered

**Solution**: Check computed signal dependencies
```typescript
// Ensure computed signal reactively updates
canSend = computed(() => {
  const text = this.messageText().trim();
  const disabled = this.isDisabled();
  const sending = this.isSending();
  
  console.log('canSend check:', { text: text.length, disabled, sending });
  return text.length > 0 && !disabled && !sending;
});
```

### Issue 2: Agent not receiving text messages
**Symptom**: Frontend sends message but agent doesn't respond

**Solution**: Verify data channel listener is registered
```typescript
// In agent entry function, ensure listener is added BEFORE connecting
ctx.room.on('dataReceived', async (payload) => { /* ... */ });
await ctx.connect(); // Must come after event listener registration
```

### Issue 3: Mobile keyboard covers input
**Symptom**: On mobile, keyboard hides text input field

**Solution**: Use CSS dynamic viewport height
```scss
.conversation-container {
  height: 100dvh; // Dynamic viewport height
  display: flex;
  flex-direction: column;
}

.text-input-container {
  position: sticky; // Not fixed - stays at bottom of container
  bottom: 0;
}
```

### Issue 4: Messages appearing twice
**Symptom**: User text messages appear twice in conversation

**Solution**: Ensure message is only added once (not in both frontend and from data channel echo)
```typescript
// Only create user message on send, not on data channel receipt
async sendTextMessage(content: string): Promise<void> {
  const message = createUserTextMessage(content); // Create here
  this.addMessage(message); // Add immediately
  await this.liveKitService.sendTextMessage(content); // Send to agent
  // Do NOT add message again when receiving chat_chunk with user content
}
```

## Performance Benchmarks

Expected performance metrics:

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Send latency | < 100ms | Time from click to conversation update |
| Agent receipt | < 200ms | Time from send to agent console log |
| Character counting | < 16ms | No frame drops while typing |
| Mobile keyboard | < 300ms | Time for input to scroll into view |

**Measure performance**:
```typescript
// In text-input.component.ts
sendMessage(): void {
  performance.mark('text-message-send-start');
  
  const text = this.messageText().trim();
  this.messageSent.emit(text);
  
  performance.mark('text-message-send-end');
  performance.measure(
    'text-message-send',
    'text-message-send-start',
    'text-message-send-end'
  );
}
```

## Next Steps

After completing this quickstart:

1. **Phase 2**: Implement P2 features (multi-line, character counter, mobile optimization)
2. **Phase 3**: Add P3 features (send indicator, error handling, retry logic)
3. **Polish**: Improve animations, transitions, and visual feedback
4. **Accessibility**: Test with screen readers and keyboard-only navigation
5. **Documentation**: Update user guide with text input instructions

## Resources

- **Data Model**: `../data-model.md` - Complete type definitions
- **Protocol**: `../contracts/text-message-protocol.md` - Data channel message format
- **Research**: `../research.md` - Technical decisions and alternatives
- **Spec**: `../spec.md` - Full requirements and acceptance criteria

## Support

If you encounter issues:
1. Check the Common Issues section above
2. Review integration test failures for clues
3. Verify LiveKit connection state in browser console
4. Check agent logs for error messages
5. Consult feature 005 unified conversation implementation
