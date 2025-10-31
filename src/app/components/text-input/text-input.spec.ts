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
});
