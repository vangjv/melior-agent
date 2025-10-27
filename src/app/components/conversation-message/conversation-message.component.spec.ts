import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConversationMessageComponent } from './conversation-message.component';
import { UnifiedConversationMessage } from '../../models/unified-conversation-message.model';

describe('ConversationMessageComponent', () => {
  let component: ConversationMessageComponent;
  let fixture: ComponentFixture<ConversationMessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConversationMessageComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ConversationMessageComponent);
    component = fixture.componentInstance;
  });

  // T020: Test rendering user transcription messages
  describe('User Transcription Messages', () => {
    it('should render user transcription message with correct sender', () => {
      const userTranscription: UnifiedConversationMessage = {
        messageType: 'transcription',
        id: 'msg-1',
        content: 'Hello agent',
        timestamp: new Date('2025-10-26T10:00:00Z'),
        sender: 'user',
        isFinal: true
      };

      fixture.componentRef.setInput('message', userTranscription);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const messageElement = compiled.querySelector('article');

      expect(messageElement).toBeTruthy();
      expect(messageElement?.textContent).toContain('Hello agent');
      expect(messageElement?.getAttribute('data-sender')).toBe('user');
    });

    it('should apply correct CSS class for user transcription', () => {
      const userTranscription: UnifiedConversationMessage = {
        messageType: 'transcription',
        id: 'msg-2',
        content: 'Test message',
        timestamp: new Date(),
        sender: 'user',
        isFinal: true
      };

      fixture.componentRef.setInput('message', userTranscription);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const messageElement = compiled.querySelector('article');

      expect(messageElement?.classList.contains('message--user')).toBe(true);
      expect(messageElement?.classList.contains('message--transcription')).toBe(true);
    });

    it('should display timestamp for user transcription', () => {
      const testDate = new Date('2025-10-26T10:30:00Z');
      const userTranscription: UnifiedConversationMessage = {
        messageType: 'transcription',
        id: 'msg-3',
        content: 'Timestamped message',
        timestamp: testDate,
        sender: 'user',
        isFinal: true
      };

      fixture.componentRef.setInput('message', userTranscription);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const timestampElement = compiled.querySelector('.message__timestamp');

      expect(timestampElement).toBeTruthy();
      expect(timestampElement?.textContent).toBeTruthy();
    });

    it('should mark interim transcriptions with visual indicator', () => {
      const interimTranscription: UnifiedConversationMessage = {
        messageType: 'transcription',
        id: 'msg-4',
        content: 'Still speaking...',
        timestamp: new Date(),
        sender: 'user',
        isFinal: false
      };

      fixture.componentRef.setInput('message', interimTranscription);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const messageElement = compiled.querySelector('article');

      expect(messageElement?.classList.contains('message--interim')).toBe(true);
    });
  });

  // T021: Test rendering agent transcription messages
  describe('Agent Transcription Messages', () => {
    it('should render agent transcription message with correct sender', () => {
      const agentTranscription: UnifiedConversationMessage = {
        messageType: 'transcription',
        id: 'msg-5',
        content: 'I can help you with that',
        timestamp: new Date('2025-10-26T10:01:00Z'),
        sender: 'agent',
        isFinal: true
      };

      fixture.componentRef.setInput('message', agentTranscription);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const messageElement = compiled.querySelector('article');

      expect(messageElement).toBeTruthy();
      expect(messageElement?.textContent).toContain('I can help you with that');
      expect(messageElement?.getAttribute('data-sender')).toBe('agent');
    });

    it('should apply correct CSS class for agent transcription', () => {
      const agentTranscription: UnifiedConversationMessage = {
        messageType: 'transcription',
        id: 'msg-6',
        content: 'Agent response',
        timestamp: new Date(),
        sender: 'agent',
        isFinal: true
      };

      fixture.componentRef.setInput('message', agentTranscription);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const messageElement = compiled.querySelector('article');

      expect(messageElement?.classList.contains('message--agent')).toBe(true);
      expect(messageElement?.classList.contains('message--transcription')).toBe(true);
    });

    it('should display voice delivery indicator for agent transcription', () => {
      const agentTranscription: UnifiedConversationMessage = {
        messageType: 'transcription',
        id: 'msg-7',
        content: 'Voice response',
        timestamp: new Date(),
        sender: 'agent',
        isFinal: true
      };

      fixture.componentRef.setInput('message', agentTranscription);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const deliveryBadge = compiled.querySelector('[data-delivery="voice"]');

      expect(deliveryBadge).toBeTruthy();
    });
  });

  // T022: Test rendering chat messages
  describe('Chat Messages', () => {
    it('should render agent chat message with correct sender', () => {
      const chatMessage: UnifiedConversationMessage = {
        messageType: 'chat',
        id: 'msg-8',
        content: 'This is a text response',
        timestamp: new Date('2025-10-26T10:02:00Z'),
        sender: 'agent',
        deliveryMethod: 'data-channel'
      };

      fixture.componentRef.setInput('message', chatMessage);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const messageElement = compiled.querySelector('article');

      expect(messageElement).toBeTruthy();
      expect(messageElement?.textContent).toContain('This is a text response');
      expect(messageElement?.getAttribute('data-sender')).toBe('agent');
    });

    it('should apply correct CSS class for chat message', () => {
      const chatMessage: UnifiedConversationMessage = {
        messageType: 'chat',
        id: 'msg-9',
        content: 'Chat response',
        timestamp: new Date(),
        sender: 'agent',
        deliveryMethod: 'data-channel'
      };

      fixture.componentRef.setInput('message', chatMessage);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const messageElement = compiled.querySelector('article');

      expect(messageElement?.classList.contains('message--agent')).toBe(true);
      expect(messageElement?.classList.contains('message--chat')).toBe(true);
    });

    it('should display chat delivery indicator for agent chat message', () => {
      const chatMessage: UnifiedConversationMessage = {
        messageType: 'chat',
        id: 'msg-10',
        content: 'Text response',
        timestamp: new Date(),
        sender: 'agent',
        deliveryMethod: 'data-channel'
      };

      fixture.componentRef.setInput('message', chatMessage);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const deliveryBadge = compiled.querySelector('[data-delivery="chat"]');

      expect(deliveryBadge).toBeTruthy();
    });

    it('should handle markdown formatting in chat messages', () => {
      const chatMessage: UnifiedConversationMessage = {
        messageType: 'chat',
        id: 'msg-11',
        content: '**Bold** and *italic* text',
        timestamp: new Date(),
        sender: 'agent',
        deliveryMethod: 'data-channel'
      };

      fixture.componentRef.setInput('message', chatMessage);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const contentElement = compiled.querySelector('.message__content');

      expect(contentElement).toBeTruthy();
      // Note: Actual markdown rendering will be implemented in component
      expect(contentElement?.textContent).toContain('Bold');
    });
  });

  // Accessibility tests
  describe('Accessibility', () => {
    it('should have appropriate ARIA labels for screen readers', () => {
      const message: UnifiedConversationMessage = {
        messageType: 'transcription',
        id: 'msg-12',
        content: 'Test message',
        timestamp: new Date(),
        sender: 'user',
        isFinal: true
      };

      fixture.componentRef.setInput('message', message);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const messageElement = compiled.querySelector('article');

      expect(messageElement?.getAttribute('aria-label')).toBeTruthy();
      expect(messageElement?.getAttribute('role')).toBe('article');
    });

    it('should have semantic HTML structure', () => {
      const message: UnifiedConversationMessage = {
        messageType: 'chat',
        id: 'msg-13',
        content: 'Semantic test',
        timestamp: new Date(),
        sender: 'agent',
        deliveryMethod: 'data-channel'
      };

      fixture.componentRef.setInput('message', message);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const article = compiled.querySelector('article');

      expect(article).toBeTruthy();
      expect(article?.querySelector('.message__content')).toBeTruthy();
    });
  });

  // Edge cases
  describe('Edge Cases', () => {
    it('should handle empty message content gracefully', () => {
      const emptyMessage: UnifiedConversationMessage = {
        messageType: 'transcription',
        id: 'msg-14',
        content: '',
        timestamp: new Date(),
        sender: 'user',
        isFinal: true
      };

      fixture.componentRef.setInput('message', emptyMessage);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const messageElement = compiled.querySelector('article');

      expect(messageElement).toBeTruthy();
    });

    it('should handle very long message content', () => {
      const longContent = 'A'.repeat(1000);
      const longMessage: UnifiedConversationMessage = {
        messageType: 'chat',
        id: 'msg-15',
        content: longContent,
        timestamp: new Date(),
        sender: 'agent',
        deliveryMethod: 'data-channel'
      };

      fixture.componentRef.setInput('message', longMessage);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const contentElement = compiled.querySelector('.message__content');

      expect(contentElement?.textContent).toContain('A');
      expect(contentElement?.textContent?.length).toBeGreaterThan(500);
    });
  });
});
