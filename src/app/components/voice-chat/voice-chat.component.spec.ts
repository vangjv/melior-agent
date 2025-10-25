/**
 * Unit tests for VoiceChatComponent
 * Tests for User Story 2 integration: error display, visual feedback
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VoiceChatComponent } from './voice-chat.component';
import { ResponseModeService } from '../../services/response-mode.service';
import { LiveKitConnectionService } from '../../services/livekit-connection.service';
import { TranscriptionService } from '../../services/transcription.service';
import { signal, WritableSignal } from '@angular/core';
import { ConnectionState } from '../../models/connection-state.model';

describe('VoiceChatComponent - User Story 2', () => {
  let component: VoiceChatComponent;
  let fixture: ComponentFixture<VoiceChatComponent>;
  let mockResponseModeService: any;
  let mockLiveKitConnectionService: any;
  let mockTranscriptionService: any;
  let errorMessageSignal: WritableSignal<string | null>;

  beforeEach(async () => {
    // Create writable signal for error message
    errorMessageSignal = signal<string | null>(null);

    // Create mock services with signals
    mockResponseModeService = {
      initialize: jasmine.createSpy('initialize'),
      cleanup: jasmine.createSpy('cleanup'),
      toggleMode: jasmine.createSpy('toggleMode'),
      setMode: jasmine.createSpy('setMode'),
      currentMode: signal('voice' as const),
      isConfirmed: signal(true),
      errorMessage: errorMessageSignal.asReadonly(),
      isPending: signal(false)
    };

    mockLiveKitConnectionService = {
      connect: jasmine.createSpy('connect'),
      disconnect: jasmine.createSpy('disconnect'),
      getRoom: jasmine.createSpy('getRoom'),
      connectionState: signal<ConnectionState>({ status: 'disconnected' }),
      connectionQuality: signal('unknown' as const)
    };

    mockTranscriptionService = {
      initialize: jasmine.createSpy('initialize'),
      startTranscription: jasmine.createSpy('startTranscription'),
      cleanup: jasmine.createSpy('cleanup'),
      transcriptions: signal([]),
      interimTranscription: signal(null)
    };

    await TestBed.configureTestingModule({
      imports: [VoiceChatComponent],
      providers: [
        { provide: ResponseModeService, useValue: mockResponseModeService },
        { provide: LiveKitConnectionService, useValue: mockLiveKitConnectionService },
        { provide: TranscriptionService, useValue: mockTranscriptionService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(VoiceChatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // T062: Mode toggle button shows error message when timeout occurs
  describe('error message display', () => {
    it('should display error message when errorMessage signal is set', () => {
      // Set error message
      errorMessageSignal.set('Failed to switch mode: timeout');
      fixture.detectChanges();

      const errorElement = fixture.nativeElement.querySelector('.mode-error-message[role="alert"]');
      expect(errorElement).toBeTruthy();
      expect(errorElement.textContent.trim()).toContain('Failed to switch mode: timeout');
    });

    it('should not display error message when errorMessage is null', () => {
      errorMessageSignal.set(null);
      fixture.detectChanges();

      const errorElement = fixture.nativeElement.querySelector('.mode-error-message[role="alert"]');
      expect(errorElement).toBeFalsy();
    });

    it('should have proper ARIA role="alert" for error messages', () => {
      errorMessageSignal.set('Error occurred');
      fixture.detectChanges();

      const errorElement = fixture.nativeElement.querySelector('.mode-error-message[role="alert"]');
      expect(errorElement).toBeTruthy();
      expect(errorElement.getAttribute('role')).toBe('alert');
    });
  });
});
