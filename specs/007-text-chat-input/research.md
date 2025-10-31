# Research: Text Chat Input

**Feature**: 007-text-chat-input  
**Date**: 2025-10-30  
**Researcher**: AI Assistant

## Overview

This document consolidates research findings for implementing a text input component that enables users to send messages via typing as an alternative to voice input. The research focuses on Angular Material textarea components, LiveKit data channel messaging patterns, mobile keyboard handling, and text input best practices for a messaging-style interface.

## 1. Angular Material Textarea Components

### Decision: Use `matInput` with `matTextareaAutosize`

**Rationale**: 
- Angular Material provides the `matInput` directive that works with native HTML `<textarea>` elements
- The `matTextareaAutosize` directive enables automatic height adjustment based on content (up to max lines)
- Integrates seamlessly with Angular Material theming and form field components
- Full keyboard event support for Enter, Shift+Enter, and other key combinations

**Implementation Pattern**:
```typescript
<mat-form-field appearance="outline" class="text-input-field">
  <mat-label>Type a message</mat-label>
  <textarea 
    matInput 
    matTextareaAutosize 
    [matAutosizeMinRows]="1"
    [matAutosizeMaxRows]="5"
    [(ngModel)]="messageText"
    (keydown)="handleKeydown($event)"
    placeholder="Type your message here..."
    [disabled]="isDisabled">
  </textarea>
</mat-form-field>
```

**Key Features**:
- Automatic height expansion up to 5 lines (configurable via `matAutosizeMaxRows`)
- Native textarea provides multi-line support out of the box
- Material styling ensures consistency with existing UI components
- Built-in accessibility features (ARIA labels, keyboard navigation)

**Alternatives Considered**:
- **Custom textarea implementation**: Rejected because Angular Material provides well-tested, accessible components with built-in theming
- **ContentEditable div**: Rejected due to complexity of managing cursor position, text selection, and accessibility
- **Third-party rich text editor**: Out of scope - plain text only per requirements

## 2. LiveKit Data Channel Messaging

### Decision: Extend existing data channel protocol with text message type

**Rationale**:
- LiveKit Room already supports bidirectional data channel communication via `publishData()` and `dataReceived` event
- Current implementation uses data channel for `set_response_mode`, `response_mode_updated`, and `chat_chunk` messages
- Text messages can be distinguished from voice transcriptions by adding a message source type
- Reliable delivery is critical for text messages (use `reliable: true` option)

**Current Data Channel Usage** (from agent.md):
```typescript
// Frontend → Agent (setting mode)
ctx.room.on('dataReceived', async (payload: Uint8Array) => {
  const message = JSON.parse(decoder.decode(payload));
  if (message.type === 'set_response_mode') {
    responseMode = message.mode;
  }
});

// Agent → Frontend (chat chunks)
const chatChunk = JSON.stringify({
  type: 'chat_chunk',
  messageId: currentChatMessageId,
  chunk: chunkText,
  isComplete: false,
  timestamp: Date.now(),
});
await ctx.room.localParticipant?.publishData(encoder.encode(chatChunk), {
  reliable: true,
});
```

**Proposed Extension**:
```typescript
// NEW: Frontend → Agent (text message)
interface TextMessageProtocol {
  type: 'text_message';
  messageId: string;
  content: string;
  timestamp: number;
}

// Frontend sends:
const textMessage = JSON.stringify({
  type: 'text_message',
  messageId: generateMessageId(),
  content: userTypedText,
  timestamp: Date.now(),
});
await room.localParticipant?.publishData(
  new TextEncoder().encode(textMessage),
  { reliable: true }
);
```

**Agent Handling** (modify agent.md):
```typescript
ctx.room.on('dataReceived', async (payload: Uint8Array) => {
  const message = JSON.parse(decoder.decode(payload));
  
  // NEW: Handle text messages
  if (message.type === 'text_message') {
    // Bypass STT - directly add to conversation items
    session.conversation.item.create({
      type: 'message',
      role: 'user',
      content: [{ type: 'input_text', text: message.content }]
    });
    // Agent will process and respond based on responseMode
  }
});
```

**Key Benefits**:
- Bypasses speech-to-text pipeline entirely (faster, more accurate)
- Maintains message ordering via timestamp and messageId
- Consistent with existing protocol structure
- Reliable delivery ensures no message loss

**Alternatives Considered**:
- **HTTP POST to backend API**: Rejected because data channel is already established, lower latency, and maintains real-time connection
- **WebSocket separate from LiveKit**: Rejected to avoid managing additional connection state and complexity

## 3. Mobile Keyboard Handling

### Decision: Use CSS viewport units (`dvh`) and Angular CDK Layout for keyboard detection

**Rationale**:
- Modern mobile browsers support dynamic viewport height units (`dvh`, `svh`) that adjust when keyboard appears
- Angular CDK provides `BreakpointObserver` for responsive layout detection
- CSS-based approach is more performant than JavaScript resize listeners
- Position text input with `position: sticky` or `fixed` at bottom to stay above keyboard

**Implementation Pattern**:
```scss
// Text input container
.text-input-container {
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  background: white;
  border-top: 1px solid #e0e0e0;
  z-index: 10;
  
  // Ensure it stays visible when keyboard appears
  @supports (height: 100dvh) {
    // Use dynamic viewport height on supported browsers
    max-height: 30dvh;
  }
}

// Conversation history container
.conversation-container {
  height: calc(100dvh - 200px); // Account for input + nav
  overflow-y: auto;
  padding-bottom: 16px; // Space for text input
}
```

**Keyboard Detection** (TypeScript):
```typescript
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';

constructor(private breakpointObserver: BreakpointObserver) {
  this.breakpointObserver.observe([Breakpoints.Handset])
    .subscribe(result => {
      this.isMobile.set(result.matches);
    });
}
```

**Mobile-Specific Behavior**:
- Auto-scroll conversation history when keyboard appears
- Focus management: textarea receives focus when user taps it
- Blur textarea when send button is clicked to dismiss keyboard
- Prevent zoom on iOS by setting `font-size: 16px` minimum

**Alternatives Considered**:
- **JavaScript resize listeners**: Rejected due to performance concerns and inconsistent behavior across browsers
- **Visual Viewport API**: Rejected because of limited browser support and complexity
- **Fixed positioning with JS height calculation**: Rejected because CSS solution is more maintainable

## 4. Text Input Best Practices for Messaging Apps

### Decision: Implement Enter-to-send with Shift+Enter for new lines

**Rationale**:
- Industry standard for desktop messaging apps (Slack, Discord, Teams)
- Mobile users typically use on-screen keyboard with dedicated send button
- Provides quick message sending for power users
- Multi-line support via Shift+Enter for longer messages

**Keyboard Event Handling**:
```typescript
handleKeydown(event: KeyboardEvent): void {
  // Enter without shift = send message
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault(); // Prevent newline insertion
    this.sendMessage();
  }
  // Shift+Enter = new line (default textarea behavior)
  // No need to handle - browser inserts newline
}
```

**Send Button State Management**:
```typescript
// Disable send button when input is empty or only whitespace
const canSend = computed(() => {
  const text = this.messageText().trim();
  const isConnected = this.connectionState().status === 'connected';
  const isNotSending = this.sendState() !== 'sending';
  return text.length > 0 && isConnected && isNotSending;
});
```

**Visual Feedback States**:
- **Idle**: Send button enabled, blue accent color
- **Sending**: Spinner icon, button disabled
- **Success**: Brief checkmark (200ms), then return to idle
- **Error**: Red color, error icon, retry button appears

**Character Limit**:
- Maximum 5000 characters (configurable constant)
- Character counter appears when 90% of limit reached
- Warning color at 95%
- Prevent typing beyond limit

**Auto-Focus Behavior**:
- After sending message: auto-focus textarea for next message
- On mobile: let user decide whether to keep keyboard open
- On disconnect: disable and blur textarea

**Alternatives Considered**:
- **Enter always inserts newline, button-only send**: Rejected because desktop users expect Enter to send
- **Configurable keyboard shortcuts**: Out of scope for initial implementation
- **No character limit**: Rejected to prevent agent processing issues and UI overflow

## 5. Message Source Type Discrimination

### Decision: Extend Message model with discriminated union for source type

**Rationale**:
- TypeScript discriminated unions provide type-safe pattern matching
- Clear distinction between voice transcription and typed text
- Enables different rendering or behavior based on message source
- Aligns with existing Angular TypeScript strict mode patterns

**Type Definition**:
```typescript
// Message source types
export type MessageSource = 'voice' | 'text';

// Extended message model
export interface UserMessage extends BaseMessage {
  role: 'user';
  source: MessageSource; // NEW: Distinguishes voice vs. text
  content: string;
  timestamp: number;
}

export interface AgentMessage extends BaseMessage {
  role: 'agent';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

export type ConversationMessage = UserMessage | AgentMessage;
```

**Usage in Components**:
```typescript
// Type-safe pattern matching
if (message.role === 'user') {
  // TypeScript knows message.source exists here
  const icon = message.source === 'voice' ? 'mic' : 'keyboard';
}
```

**Alternatives Considered**:
- **Separate interfaces for voice/text messages**: Rejected to avoid proliferation of types
- **Single string field without union type**: Rejected because discriminated unions provide better type safety

## 6. Integration with Existing Features

### Integration Points:

**Feature 005 (Unified Conversation)**:
- Text messages must appear in the unified conversation display
- Use existing `ConversationService.addMessage()` method
- SessionStorage persistence includes text messages automatically
- Virtual scrolling handles text messages same as voice messages

**Feature 003 (Voice/Chat Mode Toggle)**:
- Text input available in both voice and chat modes
- Agent response mode (voice/chat) applies to text messages
- Mode toggle does not affect text input availability

**Feature 006 (Auto-Disconnect Idle)**:
- Typing in text input counts as user activity (resets idle timer)
- Text message sending resets idle timer
- When idle timeout occurs, text input is disabled

**LiveKit Connection Service**:
- Text sending requires active LiveKit connection
- Send button disabled when `connectionState !== 'connected'`
- Handle reconnection scenarios: queue messages or clear input on disconnect

## Summary Table

| Decision Area | Choice | Key Rationale |
|---------------|--------|---------------|
| UI Component | Angular Material `matInput` + `matTextareaAutosize` | Built-in accessibility, theming, auto-height |
| Data Transport | Extend LiveKit data channel protocol | Already established, low latency, reliable delivery |
| Mobile Keyboard | CSS `dvh` units + Angular CDK Layout | Performant, no JS resize listeners needed |
| Keyboard Shortcuts | Enter = send, Shift+Enter = new line | Industry standard for messaging apps |
| Message Source | Discriminated union type `MessageSource` | Type-safe, clear distinction from voice |
| Character Limit | 5000 characters with visual feedback | Prevents agent overload, UX best practice |

## References

1. **Angular Material Documentation**: [Form Field with Textarea](https://material.angular.io/components/form-field/overview)
2. **LiveKit Client SDK**: [Data Channel API](https://docs.livekit.io/client-sdk-js/Room.html#publishData)
3. **Angular CDK Layout**: [BreakpointObserver](https://material.angular.io/cdk/layout/overview)
4. **CSS Viewport Units**: [MDN dvh documentation](https://developer.mozilla.org/en-US/docs/Web/CSS/length#dvh)
5. **TypeScript Discriminated Unions**: [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/unions-and-intersections.html#discriminating-unions)

## Next Steps (Phase 1)

1. Define data models in `data-model.md` (TypeScript interfaces)
2. Define data channel protocol contracts in `contracts/`
3. Create developer quickstart guide in `quickstart.md`
4. Update agent context with new technologies
