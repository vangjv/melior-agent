import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConnectionButtonComponent } from './connection-button.component';

describe('ConnectionButtonComponent', () => {
  let component: ConnectionButtonComponent;
  let fixture: ComponentFixture<ConnectionButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConnectionButtonComponent],
      providers: [],
    }).compileComponents();

    fixture = TestBed.createComponent(ConnectionButtonComponent);
    component = fixture.componentInstance;
    // Don't call detectChanges here - tests will set inputs first
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // T023: Unit test for ConnectionButtonComponent shows "Connect" when disconnected
  describe('disconnected state', () => {
    it('should display "Connect" button when connection state is disconnected', () => {
      // Set input signal to disconnected state
      fixture.componentRef.setInput('connectionState', { status: 'disconnected' });
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button).toBeTruthy();
      expect(button.textContent).toContain('Connect');
      expect(button.disabled).toBe(false);
    });

    it('should have aria-label "Connect to voice agent" when disconnected', () => {
      fixture.componentRef.setInput('connectionState', { status: 'disconnected' });
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button.getAttribute('aria-label')).toBe('Connect to voice agent');
    });

    it('should emit onConnect when clicked in disconnected state', () => {
      fixture.componentRef.setInput('connectionState', { status: 'disconnected' });
      fixture.detectChanges();

      spyOn(component.onConnect, 'emit');

      const button = fixture.nativeElement.querySelector('button');
      button.click();

      expect(component.onConnect.emit).toHaveBeenCalled();
    });
  });

  // T024: Unit test for ConnectionButtonComponent shows "Disconnect" when connected
  describe('connected state', () => {
    it('should display "Disconnect" button when connection state is connected', () => {
      const connectedState = {
        status: 'connected' as const,
        roomName: 'test-room',
        sessionId: 'test-session',
        connectedAt: new Date(),
        connectionQuality: 'good' as const,
      };

      fixture.componentRef.setInput('connectionState', connectedState);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button).toBeTruthy();
      expect(button.textContent).toContain('Disconnect');
      expect(button.disabled).toBe(false);
    });

    it('should have aria-label "Disconnect from voice agent" when connected', () => {
      const connectedState = {
        status: 'connected' as const,
        roomName: 'test-room',
        sessionId: 'test-session',
        connectedAt: new Date(),
        connectionQuality: 'good' as const,
      };

      fixture.componentRef.setInput('connectionState', connectedState);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button.getAttribute('aria-label')).toBe('Disconnect from voice agent');
    });

    it('should emit onDisconnect when clicked in connected state', () => {
      const connectedState = {
        status: 'connected' as const,
        roomName: 'test-room',
        sessionId: 'test-session',
        connectedAt: new Date(),
        connectionQuality: 'good' as const,
      };

      fixture.componentRef.setInput('connectionState', connectedState);
      fixture.detectChanges();

      spyOn(component.onDisconnect, 'emit');

      const button = fixture.nativeElement.querySelector('button');
      button.click();

      expect(component.onDisconnect.emit).toHaveBeenCalled();
    });
  });

  describe('connecting state', () => {
    it('should be disabled and show loading state when connecting', () => {
      const connectingState = {
        status: 'connecting' as const,
        startedAt: new Date(),
      };

      fixture.componentRef.setInput('connectionState', connectingState);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button.textContent).toContain('Connecting');
      expect(button.disabled).toBe(true);
    });
  });

  describe('reconnecting state', () => {
    it('should show reconnecting attempt count', () => {
      const reconnectingState = {
        status: 'reconnecting' as const,
        attempt: 2,
        maxAttempts: 5,
      };

      fixture.componentRef.setInput('connectionState', reconnectingState);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button.textContent).toContain('Reconnecting (2/5)');
      expect(button.disabled).toBe(true);
    });
  });

  describe('error state', () => {
    it('should show "Retry" button when in error state', () => {
      const errorState = {
        status: 'error' as const,
        error: {
          code: 'NETWORK_ERROR' as const,
          message: 'Network connection lost',
          timestamp: new Date(),
          recoverable: true,
        },
      };

      fixture.componentRef.setInput('connectionState', errorState);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button.textContent).toContain('Retry');
      expect(button.disabled).toBe(false);
    });
  });
});
