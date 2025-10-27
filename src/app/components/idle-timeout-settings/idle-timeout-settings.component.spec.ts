/**
 * Idle Timeout Settings Component Tests
 * Feature: 006-auto-disconnect-idle
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { IdleTimeoutSettingsComponent } from './idle-timeout-settings.component';
import { IdleTimeoutService } from '../../services/idle-timeout.service';
import { signal } from '@angular/core';
import { DEFAULT_IDLE_TIMEOUT_CONFIG } from '../../models/idle-timeout-config';

describe('IdleTimeoutSettingsComponent', () => {
  let component: IdleTimeoutSettingsComponent;
  let fixture: ComponentFixture<IdleTimeoutSettingsComponent>;
  let mockIdleTimeoutService: jasmine.SpyObj<IdleTimeoutService>;

  beforeEach(async () => {
    // Create mock service
    mockIdleTimeoutService = jasmine.createSpyObj('IdleTimeoutService', ['updateConfig'], {
      config: signal(DEFAULT_IDLE_TIMEOUT_CONFIG).asReadonly(),
    });

    await TestBed.configureTestingModule({
      imports: [IdleTimeoutSettingsComponent, NoopAnimationsModule],
      providers: [{ provide: IdleTimeoutService, useValue: mockIdleTimeoutService }],
    }).compileComponents();

    fixture = TestBed.createComponent(IdleTimeoutSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with current configuration', () => {
    expect(component.durationMinutes()).toBe(2); // 120 seconds = 2 minutes
    expect(component.warningSeconds()).toBe(30);
    expect(component.enabled()).toBe(true);
  });

  it('should validate duration within allowed range', () => {
    component.durationMinutes.set(1); // 60 seconds
    expect(component.isDurationValid()).toBe(true);

    component.durationMinutes.set(0.4); // 24 seconds (below minimum)
    expect(component.isDurationValid()).toBe(false);

    component.durationMinutes.set(61); // Above maximum
    expect(component.isDurationValid()).toBe(false);
  });

  it('should validate warning threshold less than duration', () => {
    component.durationMinutes.set(2); // 120 seconds
    component.warningSeconds.set(30);
    expect(component.isWarningValid()).toBe(true);

    component.warningSeconds.set(120); // Equal to duration
    expect(component.isWarningValid()).toBe(false);

    component.warningSeconds.set(130); // Greater than duration
    expect(component.isWarningValid()).toBe(false);
  });

  it('should validate warning threshold minimum', () => {
    component.durationMinutes.set(2);
    component.warningSeconds.set(5);
    expect(component.isWarningValid()).toBe(true);

    component.warningSeconds.set(4); // Below minimum
    expect(component.isWarningValid()).toBe(false);
  });

  it('should compute form validity correctly', () => {
    component.durationMinutes.set(2);
    component.warningSeconds.set(30);
    expect(component.isFormValid()).toBe(true);

    component.durationMinutes.set(0.4); // Invalid duration
    expect(component.isFormValid()).toBe(false);
  });

  it('should call updateConfig on save with valid configuration', () => {
    mockIdleTimeoutService.updateConfig.and.returnValue(null);

    component.durationMinutes.set(5);
    component.warningSeconds.set(30);
    component.enabled.set(true);

    component.onSave();

    expect(mockIdleTimeoutService.updateConfig).toHaveBeenCalledWith({
      durationSeconds: 300,
      warningThresholdSeconds: 30,
      enabled: true,
    });

    expect(component.successMessage()).toBe('Settings saved successfully!');
    expect(component.validationError()).toBeNull();
  });

  it('should display validation error when updateConfig fails', () => {
    const mockError = {
      field: 'durationSeconds' as const,
      value: 20,
      reason: 'Duration too short',
    };
    mockIdleTimeoutService.updateConfig.and.returnValue(mockError);

    component.onSave();

    expect(component.validationError()).toBe('durationSeconds: Duration too short');
    expect(component.successMessage()).toBeNull();
  });

  it('should reset to default values', () => {
    component.durationMinutes.set(10);
    component.warningSeconds.set(60);
    component.enabled.set(false);
    component.validationError.set('Some error');
    component.successMessage.set('Some success');

    component.onReset();

    expect(component.durationMinutes()).toBe(2);
    expect(component.warningSeconds()).toBe(30);
    expect(component.enabled()).toBe(true);
    expect(component.validationError()).toBeNull();
    expect(component.successMessage()).toBeNull();
  });

  it('should format duration display correctly', () => {
    component.durationMinutes.set(1);
    expect(component.getDurationDisplay()).toBe('1 minute');

    component.durationMinutes.set(5);
    expect(component.getDurationDisplay()).toBe('5 minutes');

    component.durationMinutes.set(60);
    expect(component.getDurationDisplay()).toBe('1 hour');

    component.durationMinutes.set(90);
    expect(component.getDurationDisplay()).toBe('1h 30m');
  });

  it('should clear success message after 3 seconds', (done) => {
    jasmine.clock().install();
    mockIdleTimeoutService.updateConfig.and.returnValue(null);

    component.onSave();
    expect(component.successMessage()).toBe('Settings saved successfully!');

    jasmine.clock().tick(3001);
    expect(component.successMessage()).toBeNull();

    jasmine.clock().uninstall();
    done();
  });
});
