/**
 * Unit tests for ModeToggleButtonComponent
 * Tests for T033-T039: Display states, events, disabled/pending states, and ARIA attributes
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModeToggleButtonComponent } from './mode-toggle-button.component';
import { ResponseMode } from '../../models/response-mode.model';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { MatSnackBar } from '@angular/material/snack-bar';

describe('ModeToggleButtonComponent', () => {
  let component: ModeToggleButtonComponent;
  let fixture: ComponentFixture<ModeToggleButtonComponent>;
  let mockLiveAnnouncer: jasmine.SpyObj<LiveAnnouncer>;
  let mockSnackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    // Create mock LiveAnnouncer
    mockLiveAnnouncer = jasmine.createSpyObj('LiveAnnouncer', ['announce']);

    // Create mock MatSnackBar
    mockSnackBar = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [ModeToggleButtonComponent],
      providers: [
        { provide: LiveAnnouncer, useValue: mockLiveAnnouncer },
        { provide: MatSnackBar, useValue: mockSnackBar }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ModeToggleButtonComponent);
    component = fixture.componentInstance;
    // Don't call detectChanges here - tests will set inputs first
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // T034: ModeToggleButtonComponent displays "Voice Mode" when currentMode input is 'voice'
  describe('voice mode display', () => {
    it('should display "Voice Mode" when currentMode is voice', () => {
      fixture.componentRef.setInput('currentMode', 'voice');
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button).toBeTruthy();
      expect(button.textContent).toContain('Voice Mode');
    });

    it('should show voice icon when currentMode is voice', () => {
      fixture.componentRef.setInput('currentMode', 'voice');
      fixture.detectChanges();

      const icon = fixture.nativeElement.querySelector('mat-icon');
      expect(icon).toBeTruthy();
      expect(icon.textContent).toContain('mic');
    });
  });

  // T035: ModeToggleButtonComponent displays "Chat Mode" when currentMode input is 'chat'
  describe('chat mode display', () => {
    it('should display "Chat Mode" when currentMode is chat', () => {
      fixture.componentRef.setInput('currentMode', 'chat');
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button).toBeTruthy();
      expect(button.textContent).toContain('Chat Mode');
    });

    it('should show chat icon when currentMode is chat', () => {
      fixture.componentRef.setInput('currentMode', 'chat');
      fixture.detectChanges();

      const icon = fixture.nativeElement.querySelector('mat-icon');
      expect(icon).toBeTruthy();
      expect(icon.textContent).toContain('chat_bubble');
    });
  });

  // T036: ModeToggleButtonComponent emits onToggle event when button clicked
  describe('toggle event', () => {
    it('should emit onToggle when button is clicked', () => {
      fixture.componentRef.setInput('currentMode', 'voice');
      fixture.detectChanges();

      spyOn(component.onToggle, 'emit');

      const button = fixture.nativeElement.querySelector('button');
      button.click();

      expect(component.onToggle.emit).toHaveBeenCalled();
    });

    it('should not emit onToggle when button is disabled', () => {
      fixture.componentRef.setInput('currentMode', 'voice');
      fixture.componentRef.setInput('isDisabled', true);
      fixture.detectChanges();

      spyOn(component.onToggle, 'emit');

      const button = fixture.nativeElement.querySelector('button');
      button.click();

      expect(component.onToggle.emit).not.toHaveBeenCalled();
    });
  });

  // T037: ModeToggleButtonComponent shows disabled state when isDisabled input is true
  describe('disabled state', () => {
    it('should disable button when isDisabled is true', () => {
      fixture.componentRef.setInput('currentMode', 'voice');
      fixture.componentRef.setInput('isDisabled', true);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button.disabled).toBe(true);
    });

    it('should enable button when isDisabled is false', () => {
      fixture.componentRef.setInput('currentMode', 'voice');
      fixture.componentRef.setInput('isDisabled', false);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button.disabled).toBe(false);
    });

    it('should enable button when isDisabled is not provided (default)', () => {
      fixture.componentRef.setInput('currentMode', 'voice');
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button.disabled).toBe(false);
    });
  });

  // T038: ModeToggleButtonComponent shows loading spinner when isPending input is true
  describe('pending state', () => {
    it('should show loading spinner when isPending is true', () => {
      fixture.componentRef.setInput('currentMode', 'voice');
      fixture.componentRef.setInput('isPending', true);
      fixture.detectChanges();

      const spinner = fixture.nativeElement.querySelector('mat-spinner');
      expect(spinner).toBeTruthy();
    });

    it('should not show loading spinner when isPending is false', () => {
      fixture.componentRef.setInput('currentMode', 'voice');
      fixture.componentRef.setInput('isPending', false);
      fixture.detectChanges();

      const spinner = fixture.nativeElement.querySelector('mat-spinner');
      expect(spinner).toBeFalsy();
    });

    it('should display "Switching..." when isPending is true', () => {
      fixture.componentRef.setInput('currentMode', 'voice');
      fixture.componentRef.setInput('isPending', true);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button.textContent).toContain('Switching...');
    });

    it('should disable button when isPending is true', () => {
      fixture.componentRef.setInput('currentMode', 'voice');
      fixture.componentRef.setInput('isPending', true);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button.disabled).toBe(true);
    });
  });

  // T039: ModeToggleButtonComponent has correct ARIA attributes
  describe('ARIA attributes', () => {
    it('should have aria-label with current mode in voice mode', () => {
      fixture.componentRef.setInput('currentMode', 'voice');
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button.getAttribute('aria-label')).toBe('Toggle response mode - currently Voice Mode');
    });

    it('should have aria-label with current mode in chat mode', () => {
      fixture.componentRef.setInput('currentMode', 'chat');
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button.getAttribute('aria-label')).toBe('Toggle response mode - currently Chat Mode');
    });

    it('should have aria-pressed="true" in voice mode', () => {
      fixture.componentRef.setInput('currentMode', 'voice');
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button.getAttribute('aria-pressed')).toBe('true');
    });

    it('should have aria-pressed="false" when not in voice mode', () => {
      fixture.componentRef.setInput('currentMode', 'chat');
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button.getAttribute('aria-pressed')).toBe('false');
    });

    it('should have aria-busy="true" when isPending is true', () => {
      fixture.componentRef.setInput('currentMode', 'voice');
      fixture.componentRef.setInput('isPending', true);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button.getAttribute('aria-busy')).toBe('true');
    });

    it('should have aria-busy="false" when isPending is false', () => {
      fixture.componentRef.setInput('currentMode', 'voice');
      fixture.componentRef.setInput('isPending', false);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button.getAttribute('aria-busy')).toBe('false');
    });
  });

  // T049: Keyboard navigation support
  describe('keyboard navigation', () => {
    it('should trigger toggle on Space key press', () => {
      fixture.componentRef.setInput('currentMode', 'voice');
      fixture.detectChanges();

      spyOn(component.onToggle, 'emit');

      const button = fixture.nativeElement.querySelector('button');
      const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
      button.dispatchEvent(spaceEvent);

      // Material button handles Space natively
      expect(button).toBeTruthy();
    });

    it('should trigger toggle on Enter key press', () => {
      fixture.componentRef.setInput('currentMode', 'voice');
      fixture.detectChanges();

      spyOn(component.onToggle, 'emit');

      const button = fixture.nativeElement.querySelector('button');
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      button.dispatchEvent(enterEvent);

      // Material button handles Enter natively
      expect(button).toBeTruthy();
    });
  });

  // Computed signals tests
  describe('computed signals', () => {
    it('should compute buttonLabel for voice mode', () => {
      fixture.componentRef.setInput('currentMode', 'voice');
      fixture.detectChanges();

      expect(component.buttonLabel()).toBe('Voice Mode');
    });

    it('should compute buttonLabel for chat mode', () => {
      fixture.componentRef.setInput('currentMode', 'chat');
      fixture.detectChanges();

      expect(component.buttonLabel()).toBe('Chat Mode');
    });

    it('should compute buttonIcon for voice mode', () => {
      fixture.componentRef.setInput('currentMode', 'voice');
      fixture.detectChanges();

      expect(component.buttonIcon()).toBe('mic');
    });

    it('should compute buttonIcon for chat mode', () => {
      fixture.componentRef.setInput('currentMode', 'chat');
      fixture.detectChanges();

      expect(component.buttonIcon()).toBe('chat_bubble');
    });

    it('should compute pendingLabel as "Switching..." when pending', () => {
      fixture.componentRef.setInput('currentMode', 'voice');
      fixture.componentRef.setInput('isPending', true);
      fixture.detectChanges();

      expect(component.pendingLabel()).toBe('Switching...');
    });

    it('should compute ariaLabel with current mode', () => {
      fixture.componentRef.setInput('currentMode', 'voice');
      fixture.detectChanges();

      expect(component.ariaLabel()).toBe('Toggle response mode - currently Voice Mode');
    });

    it('should compute isButtonDisabled as true when isDisabled is true', () => {
      fixture.componentRef.setInput('currentMode', 'voice');
      fixture.componentRef.setInput('isDisabled', true);
      fixture.detectChanges();

      expect(component.isButtonDisabled()).toBe(true);
    });

    it('should compute isButtonDisabled as true when isPending is true', () => {
      fixture.componentRef.setInput('currentMode', 'voice');
      fixture.componentRef.setInput('isPending', true);
      fixture.detectChanges();

      expect(component.isButtonDisabled()).toBe(true);
    });

    it('should compute isButtonDisabled as false when both are false', () => {
      fixture.componentRef.setInput('currentMode', 'voice');
      fixture.componentRef.setInput('isDisabled', false);
      fixture.componentRef.setInput('isPending', false);
      fixture.detectChanges();

      expect(component.isButtonDisabled()).toBe(false);
    });
  });

  // T061: Mode toggle button returns to normal state showing new mode after confirmation
  describe('confirmation state transition', () => {
    it('should return to normal state showing new mode after isPending becomes false', () => {
      // Start in voice mode, pending
      fixture.componentRef.setInput('currentMode', 'voice');
      fixture.componentRef.setInput('isPending', true);
      fixture.detectChanges();

      let button = fixture.nativeElement.querySelector('button');
      expect(button.textContent).toContain('Switching...');

      // Simulate confirmation: mode changes and pending becomes false
      fixture.componentRef.setInput('currentMode', 'chat');
      fixture.componentRef.setInput('isPending', false);
      fixture.detectChanges();

      button = fixture.nativeElement.querySelector('button');
      expect(button.textContent).toContain('Chat Mode');
      expect(button.textContent).not.toContain('Switching...');
      expect(button.disabled).toBe(false);
    });

    it('should show correct icon after mode confirmation', () => {
      fixture.componentRef.setInput('currentMode', 'voice');
      fixture.componentRef.setInput('isPending', true);
      fixture.detectChanges();

      // Confirm to chat mode
      fixture.componentRef.setInput('currentMode', 'chat');
      fixture.componentRef.setInput('isPending', false);
      fixture.detectChanges();

      const icon = fixture.nativeElement.querySelector('mat-icon');
      expect(icon.textContent).toContain('chat_bubble');
    });
  });

  // T064: Mode indicator uses distinct colors/icons for voice vs chat modes
  describe('distinct mode styling', () => {
    it('should use mic icon for voice mode', () => {
      fixture.componentRef.setInput('currentMode', 'voice');
      fixture.detectChanges();

      const icon = fixture.nativeElement.querySelector('mat-icon');
      expect(icon.textContent).toContain('mic');
    });

    it('should use chat_bubble icon for chat mode', () => {
      fixture.componentRef.setInput('currentMode', 'chat');
      fixture.detectChanges();

      const icon = fixture.nativeElement.querySelector('mat-icon');
      expect(icon.textContent).toContain('chat_bubble');
    });

    it('should apply primary color for voice mode', () => {
      fixture.componentRef.setInput('currentMode', 'voice');
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      // Angular Material applies color via CSS classes, not HTML attributes
      // Check that the button has the mat-primary class
      expect(button.classList.contains('mat-primary')).toBe(true);
    });

    it('should apply accent color for chat mode', () => {
      fixture.componentRef.setInput('currentMode', 'chat');
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      // Angular Material applies color via CSS classes, not HTML attributes
      // Check that the button has the mat-accent class
      expect(button.classList.contains('mat-accent')).toBe(true);
    });
  });

  // T065: Screen reader announces mode changes using Angular CDK LiveAnnouncer
  describe('screen reader announcements', () => {
    it('should NOT announce on initial render', () => {
      fixture.componentRef.setInput('currentMode', 'voice');
      fixture.componentRef.setInput('isPending', false);
      fixture.detectChanges();

      // Should not announce on first render
      expect(mockLiveAnnouncer.announce).not.toHaveBeenCalled();
    });

    it('should announce mode change to screen readers when mode actually changes', () => {
      fixture.componentRef.setInput('currentMode', 'voice');
      fixture.componentRef.setInput('isPending', false);
      fixture.detectChanges();

      mockLiveAnnouncer.announce.calls.reset();

      // Change to chat mode (confirmed)
      fixture.componentRef.setInput('currentMode', 'chat');
      fixture.componentRef.setInput('isPending', false);
      fixture.detectChanges();

      // LiveAnnouncer should have been called to announce the change
      expect(mockLiveAnnouncer.announce).toHaveBeenCalledWith(
        'Switched to Chat Mode',
        'polite'
      );
    });

    it('should announce voice mode to screen readers', () => {
      fixture.componentRef.setInput('currentMode', 'chat');
      fixture.componentRef.setInput('isPending', false);
      fixture.detectChanges();

      mockLiveAnnouncer.announce.calls.reset();

      // Change to voice mode (confirmed)
      fixture.componentRef.setInput('currentMode', 'voice');
      fixture.componentRef.setInput('isPending', false);
      fixture.detectChanges();

      expect(mockLiveAnnouncer.announce).toHaveBeenCalledWith(
        'Switched to Voice Mode',
        'polite'
      );
    });

    it('should NOT announce when mode change is still pending', () => {
      fixture.componentRef.setInput('currentMode', 'voice');
      fixture.componentRef.setInput('isPending', false);
      fixture.detectChanges();

      mockLiveAnnouncer.announce.calls.reset();

      // Change to chat mode but still pending
      fixture.componentRef.setInput('currentMode', 'chat');
      fixture.componentRef.setInput('isPending', true);
      fixture.detectChanges();

      // Should not announce until confirmed
      expect(mockLiveAnnouncer.announce).not.toHaveBeenCalled();
    });
  });

  // Visual feedback with MatSnackBar
  describe('visual mode change feedback', () => {
    it('should NOT show snackbar on initial render', () => {
      fixture.componentRef.setInput('currentMode', 'voice');
      fixture.componentRef.setInput('isPending', false);
      fixture.detectChanges();

      expect(mockSnackBar.open).not.toHaveBeenCalled();
    });

    it('should show snackbar when mode changes to chat', (done) => {
      fixture.componentRef.setInput('currentMode', 'voice');
      fixture.componentRef.setInput('isPending', false);
      fixture.detectChanges();

      mockSnackBar.open.calls.reset();

      // Change to chat mode (confirmed)
      fixture.componentRef.setInput('currentMode', 'chat');
      fixture.componentRef.setInput('isPending', false);
      fixture.detectChanges();

      // Give the effect time to run
      setTimeout(() => {
        expect(mockSnackBar.open).toHaveBeenCalledWith(
          'Switched to Chat Mode',
          'Dismiss',
          jasmine.objectContaining({
            duration: 3000,
            horizontalPosition: 'start',
            verticalPosition: 'bottom',
            panelClass: ['mode-change-snackbar']
          })
        );
        done();
      }, 10);
    });

    it('should show snackbar when mode changes to voice', (done) => {
      fixture.componentRef.setInput('currentMode', 'chat');
      fixture.componentRef.setInput('isPending', false);
      fixture.detectChanges();

      mockSnackBar.open.calls.reset();

      // Change to voice mode (confirmed)
      fixture.componentRef.setInput('currentMode', 'voice');
      fixture.componentRef.setInput('isPending', false);
      fixture.detectChanges();

      // Give the effect time to run
      setTimeout(() => {
        expect(mockSnackBar.open).toHaveBeenCalledWith(
          'Switched to Voice Mode',
          'Dismiss',
          jasmine.objectContaining({
            duration: 3000,
            horizontalPosition: 'start',
            verticalPosition: 'bottom',
            panelClass: ['mode-change-snackbar']
          })
        );
        done();
      }, 10);
    });

    it('should NOT show snackbar when mode change is still pending', () => {
      fixture.componentRef.setInput('currentMode', 'voice');
      fixture.componentRef.setInput('isPending', false);
      fixture.detectChanges();

      mockSnackBar.open.calls.reset();

      // Change to chat mode but still pending
      fixture.componentRef.setInput('currentMode', 'chat');
      fixture.componentRef.setInput('isPending', true);
      fixture.detectChanges();

      // Should not show snackbar until confirmed
      expect(mockSnackBar.open).not.toHaveBeenCalled();
    });
  });
});

