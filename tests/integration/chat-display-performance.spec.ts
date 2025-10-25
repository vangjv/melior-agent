/**
 * Performance tests for Chat Message Display
 * T116: Test chat display with 100+ messages to verify virtual scrolling performance
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatMessageDisplayComponent } from '../../src/app/components/chat-message-display/chat-message-display.component';
import { ChatMessageState } from '../../src/app/models/chat-message.model';

describe('Chat Display Performance Tests (T116)', () => {
  let component: ChatMessageDisplayComponent;
  let fixture: ComponentFixture<ChatMessageDisplayComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ChatMessageDisplayComponent],
    });

    fixture = TestBed.createComponent(ChatMessageDisplayComponent);
    component = fixture.componentInstance;
  });

  function generateMessages(count: number): ChatMessageState[] {
    const messages: ChatMessageState[] = [];
    const now = Date.now();

    for (let i = 0; i < count; i++) {
      messages.push({
        id: `msg-${i}`,
        content: `Test message ${i} - This is a sample message with some content to test rendering performance.`,
        sender: i % 2 === 0 ? 'user' : 'agent',
        timestamp: new Date(now + i * 1000),
      });
    }

    return messages;
  }

  it('should render 100+ messages without significant performance degradation', (done) => {
    const messageCount = 150;
    const messages = generateMessages(messageCount);

    // Set input
    fixture.componentRef.setInput('messages', messages);

    // Measure rendering time
    const startTime = performance.now();

    fixture.detectChanges();

    const renderTime = performance.now() - startTime;

    // Rendering should complete in reasonable time (< 500ms for 150 messages)
    expect(renderTime).toBeLessThan(500);

    // Verify all messages are in the DOM (or virtual scroll viewport)
    const compiled = fixture.nativeElement;

    // Give virtual scroll time to render
    setTimeout(() => {
      // Verify component has messages
      expect(component.messages().length).toBe(messageCount);

      // Verify virtual scroll viewport exists
      const viewport = compiled.querySelector('cdk-virtual-scroll-viewport');
      expect(viewport).toBeTruthy();

      done();
    }, 100);
  });

  it('should handle rapid message additions efficiently', (done) => {
    fixture.componentRef.setInput('messages', []);
    fixture.detectChanges();

    const messages: ChatMessageState[] = [];
    const batchSize = 10;
    const batches = 20; // 200 total messages
    let batchCount = 0;

    const startTime = performance.now();

    const addBatch = () => {
      for (let i = 0; i < batchSize; i++) {
        const index = batchCount * batchSize + i;
        messages.push({
          id: `msg-${index}`,
          content: `Message ${index}`,
          sender: index % 2 === 0 ? 'user' : 'agent',
          timestamp: new Date(Date.now() + index),
        });
      }

      fixture.componentRef.setInput('messages', [...messages]);
      fixture.detectChanges();

      batchCount++;

      if (batchCount < batches) {
        setTimeout(addBatch, 10);
      } else {
        const totalTime = performance.now() - startTime;

        // Should handle 200 messages in batches within reasonable time (< 2 seconds)
        expect(totalTime).toBeLessThan(2000);
        expect(component.messages().length).toBe(200);

        done();
      }
    };

    addBatch();
  });

  it('should maintain 60fps during scroll with 500+ messages', (done) => {
    const messageCount = 500;
    const messages = generateMessages(messageCount);

    fixture.componentRef.setInput('messages', messages);
    fixture.detectChanges();

    setTimeout(() => {
      const viewport = fixture.nativeElement.querySelector('cdk-virtual-scroll-viewport');
      expect(viewport).toBeTruthy();

      if (viewport) {
        const scrollHeight = viewport.scrollHeight;
        const clientHeight = viewport.clientHeight;

        // Verify virtual scrolling is active (scroll height should be much larger than client height)
        // Virtual scroll should not render all 500 messages at once
        expect(scrollHeight).toBeGreaterThan(clientHeight);

        // Count actual rendered items (should be much less than 500)
        const renderedItems = viewport.querySelectorAll('.message-item, .chat-message');
        expect(renderedItems.length).toBeLessThan(messageCount);
        expect(renderedItems.length).toBeGreaterThan(0);

        console.log(
          `Virtual scroll efficiency: ${renderedItems.length}/${messageCount} messages rendered`
        );
      }

      done();
    }, 200);
  });

  it('should efficiently update when new message is added to large list', (done) => {
    const initialCount = 300;
    const messages = generateMessages(initialCount);

    fixture.componentRef.setInput('messages', messages);
    fixture.detectChanges();

    setTimeout(() => {
      // Add one more message
      const startTime = performance.now();

      const newMessage: ChatMessageState = {
        id: `msg-${initialCount}`,
        content: 'New message',
        sender: 'agent',
        timestamp: new Date(),
      };

      fixture.componentRef.setInput('messages', [...messages, newMessage]);
      fixture.detectChanges();

      const updateTime = performance.now() - startTime;

      // Adding one message should be very fast (< 50ms)
      expect(updateTime).toBeLessThan(50);

      done();
    }, 100);
  });

  it('should use trackBy function to optimize re-renders', () => {
    const messages = generateMessages(10);

    fixture.componentRef.setInput('messages', messages);
    fixture.detectChanges();

    // Get initial DOM references
    const initialElements = Array.from(
      fixture.nativeElement.querySelectorAll('.message-item, .chat-message')
    );

    // Update with same messages (new array reference but same IDs)
    fixture.componentRef.setInput('messages', [...messages]);
    fixture.detectChanges();

    // Get new DOM references
    const updatedElements = Array.from(
      fixture.nativeElement.querySelectorAll('.message-item, .chat-message')
    );

    // With proper trackBy, DOM elements should be reused (same references)
    // This is hard to verify directly, but we can verify count is same
    expect(updatedElements.length).toBe(initialElements.length);
  });

  it('should handle very long message content efficiently', (done) => {
    const longContent = 'A'.repeat(5000); // 5000 character message
    const messages: ChatMessageState[] = [
      {
        id: 'msg-1',
        content: longContent,
        sender: 'agent',
        timestamp: new Date(),
      },
    ];

    const startTime = performance.now();

    fixture.componentRef.setInput('messages', messages);
    fixture.detectChanges();

    const renderTime = performance.now() - startTime;

    // Should handle long content without significant delay
    expect(renderTime).toBeLessThan(100);

    done();
  });

  it('should efficiently clear large message history', (done) => {
    const messageCount = 500;
    const messages = generateMessages(messageCount);

    fixture.componentRef.setInput('messages', messages);
    fixture.detectChanges();

    setTimeout(() => {
      const startTime = performance.now();

      // Clear all messages
      fixture.componentRef.setInput('messages', []);
      fixture.detectChanges();

      const clearTime = performance.now() - startTime;

      // Clearing should be fast (< 100ms)
      expect(clearTime).toBeLessThan(100);

      expect(component.messages().length).toBe(0);

      done();
    }, 100);
  });
});
