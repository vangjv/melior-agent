/**
 * Idle Warning Component - Unit Tests
 * Feature: 006-auto-disconnect-idle
 *
 * Tests for IdleWarningComponent visual warning display
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IdleWarningComponent } from './idle-warning.component';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

describe('IdleWarningComponent', () => {
  let component: IdleWarningComponent;
  let fixture: ComponentFixture<IdleWarningComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IdleWarningComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(IdleWarningComponent);
    component = fixture.componentInstance;
  });

  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });
  });

  describe('Display Logic - User Story 2', () => {
    it('should display when timeRemaining <= 30 seconds', () => {
      fixture.componentRef.setInput('timeRemaining', 30);
      fixture.detectChanges();

      const warningElement = fixture.debugElement.query(By.css('.idle-warning'));
      expect(warningElement).toBeTruthy();
      expect(component.shouldShow()).toBe(true);
    });

    it('should display when timeRemaining < 30 seconds', () => {
      fixture.componentRef.setInput('timeRemaining', 15);
      fixture.detectChanges();

      const warningElement = fixture.debugElement.query(By.css('.idle-warning'));
      expect(warningElement).toBeTruthy();
      expect(component.shouldShow()).toBe(true);
    });

    it('should hide when timeRemaining > 30 seconds', () => {
      fixture.componentRef.setInput('timeRemaining', 31);
      fixture.detectChanges();

      const warningElement = fixture.debugElement.query(By.css('.idle-warning'));
      expect(warningElement).toBeFalsy();
      expect(component.shouldShow()).toBe(false);
    });

    it('should hide when timeRemaining is 0', () => {
      fixture.componentRef.setInput('timeRemaining', 0);
      fixture.detectChanges();

      const warningElement = fixture.debugElement.query(By.css('.idle-warning'));
      expect(warningElement).toBeFalsy();
      expect(component.shouldShow()).toBe(false);
    });
  });

  describe('Time Display', () => {
    it('should show formatted countdown timer (MM:SS)', () => {
      fixture.componentRef.setInput('timeRemaining', 30);
      fixture.detectChanges();

      expect(component.formattedTime()).toBe('00:30');

      const timeElement = fixture.debugElement.query(By.css('.countdown-time'));
      expect(timeElement?.nativeElement.textContent).toContain('00:30');
    });

    it('should format seconds with leading zero', () => {
      fixture.componentRef.setInput('timeRemaining', 5);
      fixture.detectChanges();

      expect(component.formattedTime()).toBe('00:05');
    });

    it('should format time correctly for values over 1 minute', () => {
      fixture.componentRef.setInput('timeRemaining', 90);
      fixture.detectChanges();

      expect(component.formattedTime()).toBe('01:30');
    });

    it('should update displayed time when input changes', () => {
      fixture.componentRef.setInput('timeRemaining', 30);
      fixture.detectChanges();

      expect(component.formattedTime()).toBe('00:30');

      fixture.componentRef.setInput('timeRemaining', 15);
      fixture.detectChanges();

      expect(component.formattedTime()).toBe('00:15');
    });
  });

  describe('Dismiss Functionality', () => {
    it('should emit dismiss event when dismiss button clicked', () => {
      let dismissCalled = false;
      component.onDismiss.subscribe(() => {
        dismissCalled = true;
      });

      fixture.componentRef.setInput('timeRemaining', 20);
      fixture.detectChanges();

      const dismissButton = fixture.debugElement.query(By.css('.dismiss-button'));
      expect(dismissButton).toBeTruthy();

      dismissButton.nativeElement.click();

      expect(dismissCalled).toBe(true);
    });

    it('should have keyboard accessible dismiss button', () => {
      fixture.componentRef.setInput('timeRemaining', 20);
      fixture.detectChanges();

      const dismissButton = fixture.debugElement.query(By.css('.dismiss-button'));
      expect(dismissButton.nativeElement.tabIndex).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Accessibility - User Story 2', () => {
    it('should have role="alert"', () => {
      fixture.componentRef.setInput('timeRemaining', 20);
      fixture.detectChanges();

      const warningElement = fixture.debugElement.query(By.css('.idle-warning'));
      expect(warningElement.nativeElement.getAttribute('role')).toBe('alert');
    });

    it('should have aria-live="assertive"', () => {
      fixture.componentRef.setInput('timeRemaining', 20);
      fixture.detectChanges();

      const warningElement = fixture.debugElement.query(By.css('.idle-warning'));
      expect(warningElement.nativeElement.getAttribute('aria-live')).toBe('assertive');
    });

    it('should have aria-label on dismiss button', () => {
      fixture.componentRef.setInput('timeRemaining', 20);
      fixture.detectChanges();

      const dismissButton = fixture.debugElement.query(By.css('.dismiss-button'));
      const ariaLabel = dismissButton.nativeElement.getAttribute('aria-label');

      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel.length).toBeGreaterThan(0);
    });

    it('should have descriptive warning message', () => {
      fixture.componentRef.setInput('timeRemaining', 25);
      fixture.detectChanges();

      const messageElement = fixture.debugElement.query(By.css('.warning-message'));
      expect(messageElement).toBeTruthy();

      const messageText = messageElement.nativeElement.textContent;
      expect(messageText).toContain('disconnect');
      expect(messageText).toContain('inactivity');
    });
  });

  describe('Edge Cases', () => {
    it('should handle timeRemaining at exact threshold (30 seconds)', () => {
      fixture.componentRef.setInput('timeRemaining', 30);
      fixture.detectChanges();

      expect(component.shouldShow()).toBe(true);

      const warningElement = fixture.debugElement.query(By.css('.idle-warning'));
      expect(warningElement).toBeTruthy();
    });

    it('should handle negative timeRemaining gracefully', () => {
      fixture.componentRef.setInput('timeRemaining', -5);
      fixture.detectChanges();

      expect(component.shouldShow()).toBe(false);

      const warningElement = fixture.debugElement.query(By.css('.idle-warning'));
      expect(warningElement).toBeFalsy();
    });

    it('should handle very large timeRemaining values', () => {
      fixture.componentRef.setInput('timeRemaining', 3600);
      fixture.detectChanges();

      expect(component.shouldShow()).toBe(false);
    });
  });
});
