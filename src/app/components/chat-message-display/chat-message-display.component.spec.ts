/**
 * Unit tests for ChatMessageDisplayComponent
 * Tests message rendering, styling, timestamps, auto-scroll, and virtual scrolling
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatMessageDisplayComponent } from './chat-message-display.component';
import {
  ChatMessageState,
  createUserMessage,
  createAgentMessage,
} from '../../models/chat-message.model';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ScrollingModule } from '@angular/cdk/scrolling';

describe('ChatMessageDisplayComponent', () => {
  let component: ChatMessageDisplayComponent;
  let fixture: ComponentFixture<ChatMessageDisplayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatMessageDisplayComponent, ScrollingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatMessageDisplayComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // T085: ChatMessageDisplayComponent displays user messages with distinct styling
  it('should display user messages with distinct styling', () => {
    const userMessage = createUserMessage('Hello from user');
    fixture.componentRef.setInput('messages', [userMessage]);
    fixture.detectChanges();

    const messageElements = fixture.debugElement.queryAll(
      By.css('.chat-message')
    );
    expect(messageElements.length).toBe(1);

    const userMessageElement = messageElements[0];
    expect(userMessageElement.nativeElement.classList.contains('user')).toBe(
      true
    );
    expect(userMessageElement.nativeElement.textContent).toContain(
      'Hello from user'
    );
  });

  // T086: ChatMessageDisplayComponent displays agent messages with distinct styling
  it('should display agent messages with distinct styling', () => {
    const agentMessage = createAgentMessage('Hello from agent');
    fixture.componentRef.setInput('messages', [agentMessage]);
    fixture.detectChanges();

    const messageElements = fixture.debugElement.queryAll(
      By.css('.chat-message')
    );
    expect(messageElements.length).toBe(1);

    const agentMessageElement = messageElements[0];
    expect(agentMessageElement.nativeElement.classList.contains('agent')).toBe(
      true
    );
    expect(agentMessageElement.nativeElement.textContent).toContain(
      'Hello from agent'
    );
  });

  // T087: ChatMessageDisplayComponent shows timestamps for all messages
  it('should show timestamps for all messages', () => {
    const now = new Date('2025-10-24T10:30:00');
    const userMessage = createUserMessage('User message', now);
    const agentMessage = createAgentMessage('Agent message', now);

    fixture.componentRef.setInput('messages', [userMessage, agentMessage]);
    fixture.detectChanges();

    const timestampElements = fixture.debugElement.queryAll(
      By.css('.message-timestamp')
    );
    expect(timestampElements.length).toBe(2);

    // Check that timestamps are displayed (format may vary)
    timestampElements.forEach((element) => {
      expect(element.nativeElement.textContent.trim()).toBeTruthy();
    });
  });

  // T088: ChatMessageDisplayComponent auto-scrolls to bottom when new message arrives
  it('should auto-scroll to bottom when new message arrives', (done) => {
    const messages = [
      createUserMessage('Message 1'),
      createAgentMessage('Message 2'),
      createUserMessage('Message 3'),
    ];

    fixture.componentRef.setInput('messages', messages);
    fixture.detectChanges();

    // Add a small delay to allow scrolling to complete
    setTimeout(() => {
      const scrollContainer = fixture.debugElement.query(
        By.css('.chat-messages-container')
      );

      if (scrollContainer) {
        const element = scrollContainer.nativeElement;
        // Check that scrollTop is at or near bottom
        // scrollTop + clientHeight should equal scrollHeight when scrolled to bottom
        const isScrolledToBottom =
          Math.abs(
            element.scrollHeight - element.scrollTop - element.clientHeight
          ) < 10;
        expect(isScrolledToBottom).toBe(true);
      }

      done();
    }, 100);
  });

  // T089: ChatMessageDisplayComponent uses virtual scrolling when message count > 100
  it('should use virtual scrolling (Angular CDK) when message count > 100', () => {
    // Create 150 messages to trigger virtual scrolling
    const manyMessages: ChatMessageState[] = Array.from(
      { length: 150 },
      (_, i) => createUserMessage(`Message ${i + 1}`)
    );

    fixture.componentRef.setInput('messages', manyMessages);
    fixture.detectChanges();

    // Check for cdk-virtual-scroll-viewport element
    const virtualScrollViewport = fixture.debugElement.query(
      By.css('cdk-virtual-scroll-viewport')
    );

    expect(virtualScrollViewport).toBeTruthy();
    expect(virtualScrollViewport.nativeElement).toBeTruthy();
  });

  // Additional test: Verify empty state
  it('should handle empty message list', () => {
    fixture.componentRef.setInput('messages', []);
    fixture.detectChanges();

    const messageElements = fixture.debugElement.queryAll(
      By.css('.chat-message')
    );
    expect(messageElements.length).toBe(0);
  });

  // Additional test: Verify message order
  it('should display messages in correct order', () => {
    const messages = [
      createUserMessage('First message'),
      createAgentMessage('Second message'),
      createUserMessage('Third message'),
    ];

    fixture.componentRef.setInput('messages', messages);
    fixture.detectChanges();

    const messageElements = fixture.debugElement.queryAll(
      By.css('.chat-message')
    );
    expect(messageElements.length).toBe(3);

    expect(messageElements[0].nativeElement.textContent).toContain(
      'First message'
    );
    expect(messageElements[1].nativeElement.textContent).toContain(
      'Second message'
    );
    expect(messageElements[2].nativeElement.textContent).toContain(
      'Third message'
    );
  });

  // Additional test: Verify trackBy function
  it('should use trackBy with message ID for performance', () => {
    const messages = [
      createUserMessage('Message 1'),
      createUserMessage('Message 2'),
    ];

    fixture.componentRef.setInput('messages', messages);
    fixture.detectChanges();

    // Verify trackBy is used (component should have trackByMessageId method)
    expect(component.trackByMessageId).toBeDefined();

    // Test trackBy function
    const result = component.trackByMessageId(0, messages[0]);
    expect(result).toBe(messages[0].id);
  });
});
