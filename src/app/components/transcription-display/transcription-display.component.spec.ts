import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranscriptionDisplayComponent } from './transcription-display.component';
import { TranscriptionMessage } from '../../models/transcription-message.model';

describe('TranscriptionDisplayComponent', () => {
  let component: TranscriptionDisplayComponent;
  let fixture: ComponentFixture<TranscriptionDisplayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TranscriptionDisplayComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TranscriptionDisplayComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // T065: Unit test for rendering messages
  describe('message rendering', () => {
    it('should render an empty state when no messages exist', () => {
      fixture.componentRef.setInput('transcriptions', []);
      fixture.detectChanges();

      const messageElements = fixture.nativeElement.querySelectorAll('.transcription-message');
      expect(messageElements.length).toBe(0);

      // Should show empty state hint
      const emptyState = fixture.nativeElement.querySelector('.empty-state');
      expect(emptyState).toBeTruthy();
    });

    it('should render all transcription messages', () => {
      const messages: TranscriptionMessage[] = [
        {
          id: '1',
          speaker: 'user',
          text: 'Hello, how are you?',
          timestamp: new Date('2025-10-24T10:00:00Z'),
          isFinal: true,
          confidence: 0.95,
        },
        {
          id: '2',
          speaker: 'agent',
          text: 'I am doing well, thank you!',
          timestamp: new Date('2025-10-24T10:00:05Z'),
          isFinal: true,
          confidence: 0.98,
        },
      ];

      fixture.componentRef.setInput('transcriptions', messages);
      fixture.detectChanges();

      const messageElements = fixture.nativeElement.querySelectorAll('.transcription-message');
      expect(messageElements.length).toBe(2);
      expect(messageElements[0].textContent).toContain('Hello, how are you?');
      expect(messageElements[1].textContent).toContain('I am doing well, thank you!');
    });

    it('should use trackBy function with message id', () => {
      const messages: TranscriptionMessage[] = [
        {
          id: 'msg-1',
          speaker: 'user',
          text: 'Test message',
          timestamp: new Date(),
          isFinal: true,
        },
      ];

      fixture.componentRef.setInput('transcriptions', messages);
      fixture.detectChanges();

      // Verify trackBy is defined and uses message.id
      expect(component.trackByMessageId).toBeDefined();
      const trackByResult = component.trackByMessageId(0, messages[0]);
      expect(trackByResult).toBe('msg-1');
    });
  });

  // T066: Unit test for speaker distinction (user vs agent styling)
  describe('speaker distinction', () => {
    it('should apply user-specific styling to user messages', () => {
      const userMessage: TranscriptionMessage[] = [
        {
          id: '1',
          speaker: 'user',
          text: 'User message',
          timestamp: new Date(),
          isFinal: true,
        },
      ];

      fixture.componentRef.setInput('transcriptions', userMessage);
      fixture.detectChanges();

      const messageElement = fixture.nativeElement.querySelector('.transcription-message');
      expect(messageElement.classList.contains('user-message') ||
             messageElement.hasAttribute('data-speaker') &&
             messageElement.getAttribute('data-speaker') === 'user').toBeTruthy();
    });

    it('should apply agent-specific styling to agent messages', () => {
      const agentMessage: TranscriptionMessage[] = [
        {
          id: '2',
          speaker: 'agent',
          text: 'Agent message',
          timestamp: new Date(),
          isFinal: true,
        },
      ];

      fixture.componentRef.setInput('transcriptions', agentMessage);
      fixture.detectChanges();

      const messageElement = fixture.nativeElement.querySelector('.transcription-message');
      expect(messageElement.classList.contains('agent-message') ||
             messageElement.hasAttribute('data-speaker') &&
             messageElement.getAttribute('data-speaker') === 'agent').toBeTruthy();
    });

    it('should visually distinguish between user and agent messages', () => {
      const messages: TranscriptionMessage[] = [
        {
          id: '1',
          speaker: 'user',
          text: 'User',
          timestamp: new Date(),
          isFinal: true,
        },
        {
          id: '2',
          speaker: 'agent',
          text: 'Agent',
          timestamp: new Date(),
          isFinal: true,
        },
      ];

      fixture.componentRef.setInput('transcriptions', messages);
      fixture.detectChanges();

      const messageElements = fixture.nativeElement.querySelectorAll('.transcription-message');
      const userDataAttr = messageElements[0].getAttribute('data-speaker');
      const agentDataAttr = messageElements[1].getAttribute('data-speaker');

      expect(userDataAttr).toBe('user');
      expect(agentDataAttr).toBe('agent');
    });
  });

  // T067: Unit test for auto-scroll to latest message
  describe('auto-scroll behavior', () => {
    it('should have a scroll container with proper attributes', () => {
      fixture.componentRef.setInput('transcriptions', []);
      fixture.detectChanges();

      const scrollContainer = fixture.nativeElement.querySelector('.transcription-scroll-container');
      expect(scrollContainer).toBeTruthy();
    });

    it('should have ARIA live region for accessibility', () => {
      fixture.componentRef.setInput('transcriptions', []);
      fixture.detectChanges();

      const liveRegion = fixture.nativeElement.querySelector('[role="log"]');
      expect(liveRegion).toBeTruthy();
      expect(liveRegion.getAttribute('aria-live')).toBe('polite');
    });

    it('should scroll to bottom when new messages are added', () => {
      // This test verifies the component has scroll behavior
      // Actual scrolling tested in E2E tests
      pending('Auto-scroll behavior tested in E2E tests');

      // Expected behavior:
      // 1. Add initial messages and scroll to bottom
      // 2. Add new message
      // 3. Verify scrollIntoView or similar was called
    });
  });

  describe('timestamp display', () => {
    it('should display timestamp for each message', () => {
      const message: TranscriptionMessage[] = [
        {
          id: '1',
          speaker: 'user',
          text: 'Test',
          timestamp: new Date('2025-10-24T10:30:00Z'),
          isFinal: true,
        },
      ];

      fixture.componentRef.setInput('transcriptions', message);
      fixture.detectChanges();

      const timestamp = fixture.nativeElement.querySelector('.timestamp');
      expect(timestamp).toBeTruthy();
      expect(timestamp.textContent).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      fixture.componentRef.setInput('transcriptions', []);
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('[role="log"]');
      expect(container).toBeTruthy();
      expect(container.getAttribute('aria-live')).toBe('polite');
      expect(container.hasAttribute('aria-label')).toBe(true);
    });
  });
});
