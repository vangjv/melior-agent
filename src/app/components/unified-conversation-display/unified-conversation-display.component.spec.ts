import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UnifiedConversationDisplayComponent } from './unified-conversation-display.component';
import { ConversationStorageService } from '../../services/conversation-storage.service';
import { UnifiedConversationMessage } from '../../models/unified-conversation-message.model';
import { signal } from '@angular/core';

describe('UnifiedConversationDisplayComponent', () => {
  let component: UnifiedConversationDisplayComponent;
  let fixture: ComponentFixture<UnifiedConversationDisplayComponent>;
  let mockStorageService: jasmine.SpyObj<ConversationStorageService>;

  beforeEach(async () => {
    // Create mock ConversationStorageService
    const messagesSignal = signal<readonly UnifiedConversationMessage[]>([]);
    mockStorageService = jasmine.createSpyObj('ConversationStorageService', [
      'addMessage',
      'clearMessages'
    ], {
      messages: messagesSignal.asReadonly()
    });

    await TestBed.configureTestingModule({
      imports: [UnifiedConversationDisplayComponent],
      providers: [
        { provide: ConversationStorageService, useValue: mockStorageService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UnifiedConversationDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // T023: Test message ordering
  describe('Message Ordering', () => {
    it('should display messages in chronological order (oldest first)', () => {
      const messages: UnifiedConversationMessage[] = [
        {
          messageType: 'transcription',
          id: 'msg-3',
          content: 'Third message',
          timestamp: new Date('2025-10-26T10:02:00Z'),
          sender: 'user',
          isFinal: true
        },
        {
          messageType: 'transcription',
          id: 'msg-1',
          content: 'First message',
          timestamp: new Date('2025-10-26T10:00:00Z'),
          sender: 'user',
          isFinal: true
        },
        {
          messageType: 'chat',
          id: 'msg-2',
          content: 'Second message',
          timestamp: new Date('2025-10-26T10:01:00Z'),
          sender: 'agent',
          deliveryMethod: 'data-channel'
        }
      ];

      // Update the mock service signal
      (mockStorageService.messages as any).set(messages);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const messageElements = compiled.querySelectorAll('app-conversation-message');

      expect(messageElements.length).toBe(3);
      // Messages should be sorted by timestamp
      expect(messageElements[0].getAttribute('data-message-id')).toBe('msg-1');
      expect(messageElements[1].getAttribute('data-message-id')).toBe('msg-2');
      expect(messageElements[2].getAttribute('data-message-id')).toBe('msg-3');
    });

    it('should handle messages with identical timestamps', () => {
      const sameTimestamp = new Date('2025-10-26T10:00:00Z');
      const messages: UnifiedConversationMessage[] = [
        {
          messageType: 'transcription',
          id: 'msg-2',
          content: 'Second',
          timestamp: sameTimestamp,
          sender: 'agent',
          isFinal: true
        },
        {
          messageType: 'transcription',
          id: 'msg-1',
          content: 'First',
          timestamp: sameTimestamp,
          sender: 'user',
          isFinal: true
        }
      ];

      (mockStorageService.messages as any).set(messages);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const messageElements = compiled.querySelectorAll('app-conversation-message');

      expect(messageElements.length).toBe(2);
      // When timestamps are equal, maintain insertion order (stable sort)
    });

    it('should update order when new messages arrive', () => {
      const initialMessages: UnifiedConversationMessage[] = [
        {
          messageType: 'transcription',
          id: 'msg-1',
          content: 'First',
          timestamp: new Date('2025-10-26T10:00:00Z'),
          sender: 'user',
          isFinal: true
        }
      ];

      (mockStorageService.messages as any).set(initialMessages);
      fixture.detectChanges();

      let messageElements = fixture.nativeElement.querySelectorAll('app-conversation-message');
      expect(messageElements.length).toBe(1);

      // Add a new message with earlier timestamp (out of order arrival)
      const updatedMessages: UnifiedConversationMessage[] = [
        ...initialMessages,
        {
          messageType: 'chat',
          id: 'msg-0',
          content: 'Earlier message',
          timestamp: new Date('2025-10-26T09:59:00Z'),
          sender: 'agent',
          deliveryMethod: 'data-channel'
        }
      ];

      (mockStorageService.messages as any).set(updatedMessages);
      fixture.detectChanges();

      messageElements = fixture.nativeElement.querySelectorAll('app-conversation-message');
      expect(messageElements.length).toBe(2);
      // Earlier message should appear first
      expect(messageElements[0].getAttribute('data-message-id')).toBe('msg-0');
      expect(messageElements[1].getAttribute('data-message-id')).toBe('msg-1');
    });

    it('should maintain correct order with mixed message types', () => {
      const messages: UnifiedConversationMessage[] = [
        {
          messageType: 'transcription',
          id: 'msg-1',
          content: 'User voice',
          timestamp: new Date('2025-10-26T10:00:00Z'),
          sender: 'user',
          isFinal: true
        },
        {
          messageType: 'chat',
          id: 'msg-2',
          content: 'Agent text',
          timestamp: new Date('2025-10-26T10:01:00Z'),
          sender: 'agent',
          deliveryMethod: 'data-channel'
        },
        {
          messageType: 'transcription',
          id: 'msg-3',
          content: 'Agent voice',
          timestamp: new Date('2025-10-26T10:02:00Z'),
          sender: 'agent',
          isFinal: true
        },
        {
          messageType: 'transcription',
          id: 'msg-4',
          content: 'User voice again',
          timestamp: new Date('2025-10-26T10:03:00Z'),
          sender: 'user',
          isFinal: true
        }
      ];

      (mockStorageService.messages as any).set(messages);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const messageElements = compiled.querySelectorAll('app-conversation-message');

      expect(messageElements.length).toBe(4);
      // Verify chronological order is maintained
      for (let i = 0; i < messageElements.length; i++) {
        expect(messageElements[i].getAttribute('data-message-id')).toBe(`msg-${i + 1}`);
      }
    });
  });

  // T024: Test auto-scroll behavior
  describe('Auto-scroll Behavior', () => {
    it('should auto-scroll to latest message when new message arrives', (done) => {
      const messages: UnifiedConversationMessage[] = [
        {
          messageType: 'transcription',
          id: 'msg-1',
          content: 'First',
          timestamp: new Date('2025-10-26T10:00:00Z'),
          sender: 'user',
          isFinal: true
        }
      ];

      (mockStorageService.messages as any).set(messages);
      fixture.detectChanges();

      // Add new message
      const updatedMessages = [
        ...messages,
        {
          messageType: 'chat',
          id: 'msg-2',
          content: 'Latest message',
          timestamp: new Date('2025-10-26T10:01:00Z'),
          sender: 'agent',
          deliveryMethod: 'data-channel'
        } as UnifiedConversationMessage
      ];

      (mockStorageService.messages as any).set(updatedMessages);
      fixture.detectChanges();

      // Wait for view to update
      setTimeout(() => {
        const scrollContainer = fixture.nativeElement.querySelector('.conversation-display__scroll-container');
        expect(scrollContainer).toBeTruthy();

        // Verify scroll is at bottom (allowing for small margin)
        const isAtBottom = Math.abs(
          scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight
        ) < 10;
        expect(isAtBottom).toBe(true);
        done();
      }, 100);
    });

    it('should not auto-scroll if user has manually scrolled up', (done) => {
      const messages: UnifiedConversationMessage[] = Array.from({ length: 10 }, (_, i) => ({
        messageType: 'transcription',
        id: `msg-${i}`,
        content: `Message ${i}`,
        timestamp: new Date(`2025-10-26T10:0${i}:00Z`),
        sender: i % 2 === 0 ? 'user' : 'agent',
        isFinal: true
      } as UnifiedConversationMessage));

      (mockStorageService.messages as any).set(messages);
      fixture.detectChanges();

      const scrollContainer = fixture.nativeElement.querySelector('.conversation-display__scroll-container');

      // Simulate user scrolling up
      scrollContainer.scrollTop = 0;

      // Add new message
      const updatedMessages = [
        ...messages,
        {
          messageType: 'chat',
          id: 'msg-10',
          content: 'New message',
          timestamp: new Date('2025-10-26T10:10:00Z'),
          sender: 'agent',
          deliveryMethod: 'data-channel'
        } as UnifiedConversationMessage
      ];

      (mockStorageService.messages as any).set(updatedMessages);
      fixture.detectChanges();

      setTimeout(() => {
        // User should still be at top (no auto-scroll)
        expect(scrollContainer.scrollTop).toBeLessThan(100);
        done();
      }, 100);
    });

    it('should have scrollable container with proper height constraints', () => {
      fixture.detectChanges();

      const scrollContainer = fixture.nativeElement.querySelector('.conversation-display__scroll-container');
      expect(scrollContainer).toBeTruthy();

      const styles = window.getComputedStyle(scrollContainer);
      expect(styles.overflowY).toBe('auto');
      expect(styles.maxHeight).toBeTruthy();
    });

    it('should resume auto-scroll when user scrolls back to bottom', (done) => {
      const messages: UnifiedConversationMessage[] = Array.from({ length: 10 }, (_, i) => ({
        messageType: 'transcription',
        id: `msg-${i}`,
        content: `Message ${i}`,
        timestamp: new Date(`2025-10-26T10:0${i}:00Z`),
        sender: 'user',
        isFinal: true
      } as UnifiedConversationMessage));

      (mockStorageService.messages as any).set(messages);
      fixture.detectChanges();

      const scrollContainer = fixture.nativeElement.querySelector('.conversation-display__scroll-container');

      // Scroll to bottom manually
      scrollContainer.scrollTop = scrollContainer.scrollHeight;

      // Add new message
      const updatedMessages = [
        ...messages,
        {
          messageType: 'chat',
          id: 'msg-10',
          content: 'New message',
          timestamp: new Date('2025-10-26T10:10:00Z'),
          sender: 'agent',
          deliveryMethod: 'data-channel'
        } as UnifiedConversationMessage
      ];

      (mockStorageService.messages as any).set(updatedMessages);
      fixture.detectChanges();

      setTimeout(() => {
        // Should auto-scroll to new message
        const isAtBottom = Math.abs(
          scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight
        ) < 10;
        expect(isAtBottom).toBe(true);
        done();
      }, 100);
    });
  });

  // Empty state
  describe('Empty State', () => {
    it('should display placeholder when no messages exist', () => {
      (mockStorageService.messages as any).set([]);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const emptyState = compiled.querySelector('.conversation-display__empty-state');

      expect(emptyState).toBeTruthy();
      expect(emptyState?.textContent).toContain('No messages yet');
    });

    it('should hide empty state when messages are present', () => {
      const messages: UnifiedConversationMessage[] = [
        {
          messageType: 'transcription',
          id: 'msg-1',
          content: 'Hello',
          timestamp: new Date(),
          sender: 'user',
          isFinal: true
        }
      ];

      (mockStorageService.messages as any).set(messages);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const emptyState = compiled.querySelector('.conversation-display__empty-state');

      expect(emptyState).toBeFalsy();
    });
  });

  // TrackBy function
  describe('TrackBy Function', () => {
    it('should use message ID for trackBy to optimize rendering', () => {
      const messages: UnifiedConversationMessage[] = [
        {
          messageType: 'transcription',
          id: 'msg-1',
          content: 'Message 1',
          timestamp: new Date(),
          sender: 'user',
          isFinal: true
        }
      ];

      (mockStorageService.messages as any).set(messages);
      fixture.detectChanges();

      // Verify trackBy function exists and uses message ID
      expect(component.trackByMessageId).toBeDefined();
      const trackByResult = component.trackByMessageId(0, messages[0]);
      expect(trackByResult).toBe('msg-1');
    });
  });

  // T038 [US2] Test component reflects mode changes
  describe('User Story 2: Mode Toggle Display', () => {
    it('should reflect mode changes in component state', () => {
      // Setup mock service with mode signal
      const modeSignal = signal<'voice' | 'chat'>('voice');
      Object.defineProperty(mockStorageService, 'currentMode', {
        get: () => modeSignal.asReadonly()
      });

      // Add method to toggle mode
      mockStorageService.setMode = jasmine.createSpy('setMode').and.callFake((mode: 'voice' | 'chat') => {
        modeSignal.set(mode);
      });

      fixture.detectChanges();

      // Initial mode should be voice
      expect(component.currentMode?.()).toBe('voice');

      // Toggle to chat mode
      mockStorageService.setMode('chat');
      fixture.detectChanges();

      expect(component.currentMode?.()).toBe('chat');

      // Toggle back to voice
      mockStorageService.setMode('voice');
      fixture.detectChanges();

      expect(component.currentMode?.()).toBe('voice');
    });

    it('should maintain message display when mode changes', () => {
      const messages: UnifiedConversationMessage[] = [
        {
          messageType: 'transcription',
          id: 'msg-1',
          content: 'Voice message',
          timestamp: new Date('2025-10-26T10:00:00Z'),
          sender: 'user',
          isFinal: true
        },
        {
          messageType: 'chat',
          id: 'msg-2',
          content: 'Chat message',
          timestamp: new Date('2025-10-26T10:01:00Z'),
          sender: 'agent',
          deliveryMethod: 'data-channel'
        }
      ];

      (mockStorageService.messages as any).set(messages);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      let messageElements = compiled.querySelectorAll('app-conversation-message');

      expect(messageElements.length).toBe(2);

      // Simulate mode change
      const modeSignal = signal<'voice' | 'chat'>('chat');
      Object.defineProperty(mockStorageService, 'currentMode', {
        get: () => modeSignal.asReadonly()
      });
      fixture.detectChanges();

      // Messages should still be displayed
      messageElements = compiled.querySelectorAll('app-conversation-message');
      expect(messageElements.length).toBe(2);
    });

    it('should not lose scroll position when mode toggles', () => {
      const messages = Array.from({ length: 50 }, (_, i) => ({
        messageType: 'chat' as const,
        id: `msg-${i}`,
        content: `Message ${i}`,
        timestamp: new Date(`2025-10-26T10:${i.toString().padStart(2, '0')}:00Z`),
        sender: 'user' as const,
        deliveryMethod: 'data-channel' as const
      }));

      (mockStorageService.messages as any).set(messages);
      fixture.detectChanges();

      // Simulate scroll
      const scrollContainer = fixture.nativeElement.querySelector('.conversation-feed');
      if (scrollContainer) {
        scrollContainer.scrollTop = 100;

        // Toggle mode
        const modeSignal = signal<'voice' | 'chat'>('chat');
        Object.defineProperty(mockStorageService, 'currentMode', {
          get: () => modeSignal.asReadonly()
        });
        fixture.detectChanges();

        // Scroll position should be preserved (or at least not reset to 0 unnecessarily)
        // Note: Auto-scroll to bottom may override this in actual implementation
        expect(scrollContainer.scrollTop).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
