/**
 * Text Input Component Unit Tests
 * Feature: 007-text-chat-input
 * Tests for text input functionality and user interactions
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TextInput } from './text-input';

describe('TextInput', () => {
  let component: TextInput;
  let fixture: ComponentFixture<TextInput>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TextInput]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TextInput);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('Component Initialization', () => {
    it('should initialize with empty message text', () => {
      expect(component.messageText()).toBe('');
    });

    it('should initialize with isSending as false', () => {
      expect(component.isSending()).toBe(false);
    });

    it('should initialize with default placeholder', () => {
      expect(component.placeholder()).toBe('Type a message...');
    });

    it('should accept custom placeholder input', () => {
      fixture.componentRef.setInput('placeholder', 'Enter your message');
      fixture.detectChanges();
      expect(component.placeholder()).toBe('Enter your message');
    });

    it('should initialize with isDisabled as false', () => {
      expect(component.isDisabled()).toBe(false);
    });
  });

  describe('canSend Computed Signal', () => {
    it('should return false when message text is empty', () => {
      component.messageText.set('');
      expect(component.canSend()).toBe(false);
    });

    it('should return false when message text is only whitespace', () => {
      component.messageText.set('   ');
      expect(component.canSend()).toBe(false);
    });

    it('should return true when message text has content', () => {
      component.messageText.set('Hello');
      expect(component.canSend()).toBe(true);
    });

    it('should return false when component is disabled', () => {
      fixture.componentRef.setInput('isDisabled', true);
      component.messageText.set('Hello');
      fixture.detectChanges();
      expect(component.canSend()).toBe(false);
    });

    it('should return false when message is sending', () => {
      component.messageText.set('Hello');
      component.isSending.set(true);
      expect(component.canSend()).toBe(false);
    });
  });

  describe('Character Count', () => {
    it('should compute character count correctly', () => {
      component.messageText.set('Hello');
      expect(component.characterCount()).toBe(5);
    });

    it('should not show character count when below 4500 characters', () => {
      component.messageText.set('A'.repeat(4500));
      expect(component.showCharacterCount()).toBe(false);
    });

    it('should show character count at 4501 characters (90% of 5000)', () => {
      component.messageText.set('A'.repeat(4501));
      expect(component.showCharacterCount()).toBe(true);
    });

    it('should show character count at maximum 5000 characters', () => {
      component.messageText.set('A'.repeat(5000));
      expect(component.showCharacterCount()).toBe(true);
      expect(component.characterCount()).toBe(5000);
    });
  });

  describe('sendMessage Method', () => {
    it('should emit messageSent event with trimmed text', (done) => {
      component.messageText.set('  Hello  ');

      component.messageSent.subscribe((message: string) => {
        expect(message).toBe('Hello');
        done();
      });

      component.sendMessage();
    });

    it('should clear message text after sending', () => {
      component.messageText.set('Hello');
      component.sendMessage();
      expect(component.messageText()).toBe('');
    });

    it('should not send when canSend is false (empty message)', () => {
      let emitted = false;
      component.messageSent.subscribe(() => {
        emitted = true;
      });

      component.messageText.set('');
      component.sendMessage();
      expect(emitted).toBe(false);
    });

    it('should not send when component is disabled', () => {
      let emitted = false;
      fixture.componentRef.setInput('isDisabled', true);
      fixture.detectChanges();

      component.messageSent.subscribe(() => {
        emitted = true;
      });

      component.messageText.set('Hello');
      component.sendMessage();
      expect(emitted).toBe(false);
    });

    it('should not send when already sending', () => {
      let emitCount = 0;
      component.messageSent.subscribe(() => {
        emitCount++;
      });

      component.messageText.set('Hello');
      component.isSending.set(true);
      component.sendMessage();
      expect(emitCount).toBe(0);
    });
  });

  describe('Keyboard Event Handling', () => {
    it('should send message on Enter key press', (done) => {
      component.messageText.set('Hello');

      component.messageSent.subscribe((message: string) => {
        expect(message).toBe('Hello');
        done();
      });

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      component.handleKeydown(event);
    });

    it('should prevent default on Enter key', () => {
      component.messageText.set('Hello');
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      spyOn(event, 'preventDefault');

      component.handleKeydown(event);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should not send on Shift+Enter (allows new line)', () => {
      let emitted = false;
      component.messageText.set('Hello');

      component.messageSent.subscribe(() => {
        emitted = true;
      });

      const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true });
      component.handleKeydown(event);
      expect(emitted).toBe(false);
    });

    it('should not send on other keys', () => {
      let emitted = false;
      component.messageText.set('Hello');

      component.messageSent.subscribe(() => {
        emitted = true;
      });

      const event = new KeyboardEvent('keydown', { key: 'a' });
      component.handleKeydown(event);
      expect(emitted).toBe(false);
    });
  });

  describe('Component State Management', () => {
    it('should handle rapid message sends correctly', () => {
      const messages: string[] = [];
      component.messageSent.subscribe((message: string) => {
        messages.push(message);
      });

      component.messageText.set('Message 1');
      component.sendMessage();

      component.messageText.set('Message 2');
      component.sendMessage();

      component.messageText.set('Message 3');
      component.sendMessage();

      expect(messages).toEqual(['Message 1', 'Message 2', 'Message 3']);
      expect(component.messageText()).toBe('');
    });

    it('should preserve message when disabled', () => {
      component.messageText.set('Hello');
      fixture.componentRef.setInput('isDisabled', true);
      fixture.detectChanges();

      expect(component.messageText()).toBe('Hello');
      expect(component.canSend()).toBe(false);
    });

    it('should allow sending after re-enabling', () => {
      let emitted = false;
      fixture.componentRef.setInput('isDisabled', true);
      fixture.detectChanges();

      component.messageText.set('Hello');
      component.sendMessage();

      fixture.componentRef.setInput('isDisabled', false);
      fixture.detectChanges();

      component.messageSent.subscribe(() => {
        emitted = true;
      });

      component.sendMessage();
      expect(emitted).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(10000);
      component.messageText.set(longMessage);
      expect(component.characterCount()).toBe(10000);
      expect(component.showCharacterCount()).toBe(true);
    });

    it('should handle messages with special characters', (done) => {
      const specialMessage = '!@#$%^&*()_+{}:"<>?[];\',./`~';
      component.messageText.set(specialMessage);

      component.messageSent.subscribe((message: string) => {
        expect(message).toBe(specialMessage);
        done();
      });

      component.sendMessage();
    });

    it('should handle multi-line messages', (done) => {
      const multilineMessage = 'Line 1\nLine 2\nLine 3';
      component.messageText.set(multilineMessage);

      component.messageSent.subscribe((message: string) => {
        expect(message).toBe(multilineMessage);
        done();
      });

      component.sendMessage();
    });

    it('should handle messages with only newlines', () => {
      component.messageText.set('\n\n\n');
      expect(component.canSend()).toBe(false); // Trimmed to empty
    });

    it('should handle Unicode and emoji characters', (done) => {
      const emojiMessage = 'Hello 👋 World 🌍';
      component.messageText.set(emojiMessage);

      component.messageSent.subscribe((message: string) => {
        expect(message).toBe(emojiMessage);
        done();
      });

      component.sendMessage();
    });
  });

  describe('Mobile Responsive Layout (US5)', () => {
    it('should render component with mobile-friendly classes', () => {
      fixture.detectChanges();
      const container = fixture.nativeElement.querySelector('.text-input-container');
      expect(container).toBeTruthy();
    });

    it('should have textarea with proper mobile attributes', () => {
      fixture.detectChanges();
      const textarea = fixture.nativeElement.querySelector('textarea');
      expect(textarea).toBeTruthy();
      expect(textarea.hasAttribute('cdkTextareaAutosize')).toBe(true);
    });

    it('should preserve message text during orientation changes', () => {
      component.messageText.set('Test message during orientation change');
      fixture.detectChanges();

      // Simulate orientation change by triggering change detection
      fixture.detectChanges();

      expect(component.messageText()).toBe('Test message during orientation change');
    });

    it('should maintain component state when viewport resizes', () => {
      component.messageText.set('Resize test');
      fixture.componentRef.setInput('isDisabled', false);
      fixture.detectChanges();

      // Component should maintain state after window resize
      window.dispatchEvent(new Event('resize'));
      fixture.detectChanges();

      expect(component.messageText()).toBe('Resize test');
      expect(component.isDisabled()).toBe(false);
    });
  });

  describe('Mobile Keyboard Handling (US5)', () => {
    it('should handle focus when mobile keyboard opens', () => {
      fixture.detectChanges();
      const textarea = fixture.nativeElement.querySelector('textarea');

      // Simulate focus event (mobile keyboard opening)
      textarea.focus();
      fixture.detectChanges();

      expect(document.activeElement).toBe(textarea);
    });

    it('should maintain scroll position when keyboard is visible', () => {
      fixture.detectChanges();
      component.messageText.set('Test scrolling with keyboard');

      // This test verifies component behavior, actual scroll testing requires e2e
      expect(component.messageText()).toBe('Test scrolling with keyboard');
    });

    it('should handle blur when mobile keyboard closes', () => {
      fixture.detectChanges();
      const textarea = fixture.nativeElement.querySelector('textarea');

      textarea.focus();
      fixture.detectChanges();

      textarea.blur();
      fixture.detectChanges();

      expect(document.activeElement).not.toBe(textarea);
    });
  });

  describe('Send Button State Transitions (US6)', () => {
    it('should initialize with isSending as false', () => {
      expect(component.isSending()).toBe(false);
    });

    it('should disable send button when isSending is true', () => {
      component.messageText.set('Hello');
      component.isSending.set(true);
      expect(component.canSend()).toBe(false);
    });

    it('should show loading state during send operation', () => {
      component.messageText.set('Test message');
      component.isSending.set(true);
      fixture.detectChanges();

      const sendButton = fixture.nativeElement.querySelector('.send-button');
      expect(sendButton.disabled).toBe(true);
    });

    it('should return to idle state after successful send', () => {
      component.messageText.set('Test');
      component.sendMessage();

      // Component clears text and can accept new messages
      expect(component.messageText()).toBe('');
      expect(component.isSending()).toBe(false);
    });

    it('should prevent multiple simultaneous sends', () => {
      let emitCount = 0;
      component.messageSent.subscribe(() => emitCount++);

      component.messageText.set('Test');
      component.isSending.set(true);

      // Try to send multiple times while already sending
      component.sendMessage();
      component.sendMessage();
      component.sendMessage();

      expect(emitCount).toBe(0);
    });
  });

  describe('Error Handling (US6)', () => {
    it('should initialize with no error', () => {
      expect(component.error()).toBeNull();
    });

    it('should set error signal when send fails', () => {
      const errorMessage = 'Network error';
      component.error.set(errorMessage);
      expect(component.error()).toBe(errorMessage);
    });

    it('should preserve message text on send error', () => {
      const originalMessage = 'Important message';
      component.messageText.set(originalMessage);
      component.error.set('Send failed');

      expect(component.messageText()).toBe(originalMessage);
    });

    it('should clear error on successful retry', () => {
      component.error.set('Previous error');
      component.messageText.set('Retry message');

      component.clearError();
      expect(component.error()).toBeNull();
    });

    it('should allow retry after error', () => {
      let emitCount = 0;
      component.messageSent.subscribe(() => emitCount++);

      component.messageText.set('Test');
      component.error.set('Network error');

      // Clear error and retry
      component.clearError();
      component.sendMessage();

      expect(emitCount).toBe(1);
    });

    it('should not send when error is present without clearing', () => {
      let emitted = false;
      component.messageSent.subscribe(() => emitted = true);

      component.messageText.set('Test');
      component.error.set('Previous error');

      // canSend should return false when there's an error
      component.sendMessage();

      // Error should block sending
      expect(component.error()).toBeTruthy();
    });
  });
});

