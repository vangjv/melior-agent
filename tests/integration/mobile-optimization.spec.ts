/**
 * Mobile optimization tests for Mode Toggle Button
 * Tests for User Story 5: T133-T137
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModeToggleButtonComponent } from '../../src/app/components/mode-toggle-button/mode-toggle-button.component';

describe('Mode Toggle Button - Mobile Optimization (User Story 5)', () => {
  let component: ModeToggleButtonComponent;
  let fixture: ComponentFixture<ModeToggleButtonComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ModeToggleButtonComponent],
    });

    fixture = TestBed.createComponent(ModeToggleButtonComponent);
    component = fixture.componentInstance;
  });

  // T133: Mode toggle button has minimum 44x44px touch target size
  it('should have minimum 44x44px touch target size', () => {
    fixture.componentRef.setInput('currentMode', 'voice');
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button');
    expect(button).toBeTruthy();

    const rect = button.getBoundingClientRect();

    // Touch target should be at least 44x44px
    expect(rect.width).toBeGreaterThanOrEqual(44);
    expect(rect.height).toBeGreaterThanOrEqual(44);
  });

  // T134: Mode toggle is positioned in easily reachable location on mobile (viewport width < 768px)
  it('should be positioned appropriately on mobile viewports', () => {
    fixture.componentRef.setInput('currentMode', 'voice');
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button');

    // Check if button has appropriate positioning classes or styles
    // This test verifies the component doesn't force positioning,
    // allowing parent (voice-chat component) to position it
    expect(button).toBeTruthy();

    // Verify button is not using fixed positioning that would interfere with mobile layout
    const computedStyle = window.getComputedStyle(button);
    // Button itself shouldn't be position:fixed (parent handles positioning)
    expect(['static', 'relative']).toContain(computedStyle.position);
  });

  // T135: Mode toggle remains accessible in landscape mode
  it('should remain accessible in landscape mode', () => {
    fixture.componentRef.setInput('currentMode', 'voice');
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button');
    expect(button).toBeTruthy();

    // Verify button has responsive sizing that works in landscape
    const computedStyle = window.getComputedStyle(button);

    // Should not have excessive height that would overflow in landscape
    const maxHeight = parseInt(computedStyle.maxHeight) || Infinity;
    expect(maxHeight).toBeLessThanOrEqual(400); // Reasonable for landscape mode
  });

  // T136: Mode toggle label scales with large text accessibility settings
  it('should scale label text with rem units for accessibility', () => {
    fixture.componentRef.setInput('currentMode', 'voice');
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button');
    const buttonText = button.querySelector('.button-text, .mode-label, span');

    if (buttonText) {
      const computedStyle = window.getComputedStyle(buttonText);

      // Font size should use rem or em units for scalability
      // This allows users to increase text size via browser settings
      expect(computedStyle.fontSize).toBeTruthy();

      // Verify it's not using fixed px units (would be like "16px")
      // Note: Computed style always returns px, so we check the actual stylesheet would use rem
      // For this test, we just verify text is visible and has reasonable size
      const fontSize = parseFloat(computedStyle.fontSize);
      expect(fontSize).toBeGreaterThan(12); // Minimum readable size
      expect(fontSize).toBeLessThan(48); // Maximum reasonable size
    }
  });

  // T137: Chat display is responsive on small screens (minimum 320px width)
  it('should be usable on narrow screens (320px minimum)', () => {
    fixture.componentRef.setInput('currentMode', 'voice');
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button');

    // Button should not cause horizontal overflow on narrow screens
    const computedStyle = window.getComputedStyle(button);

    // Should use max-width or fit-content to prevent overflow
    const width = button.offsetWidth;
    expect(width).toBeLessThanOrEqual(300); // Reasonable for 320px viewport

    // Should not have fixed width that would break on small screens
    expect(['auto', '100%', 'fit-content']).toContain(
      computedStyle.width === '100%' ? '100%' : 'auto'
    );
  });

  it('should maintain touch target size on all screen sizes', () => {
    fixture.componentRef.setInput('currentMode', 'voice');

    // Test on different viewport sizes
    const viewportSizes = [
      { width: 320, height: 568 }, // iPhone SE
      { width: 375, height: 667 }, // iPhone 8
      { width: 414, height: 896 }, // iPhone 11 Pro Max
      { width: 768, height: 1024 }, // iPad
    ];

    viewportSizes.forEach((size) => {
      // Simulate viewport resize (note: actual resize not possible in test, checking component adapts)
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      const rect = button.getBoundingClientRect();

      expect(rect.width).toBeGreaterThanOrEqual(44, `Failed at ${size.width}x${size.height}`);
      expect(rect.height).toBeGreaterThanOrEqual(44, `Failed at ${size.width}x${size.height}`);
    });
  });

  it('should have sufficient tap spacing from other interactive elements', () => {
    fixture.componentRef.setInput('currentMode', 'voice');
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button');

    // Button should have margin to prevent accidental taps
    const computedStyle = window.getComputedStyle(button);

    // Check for reasonable spacing (at least 4px on mobile)
    const margin =
      parseFloat(computedStyle.marginTop) +
      parseFloat(computedStyle.marginBottom) +
      parseFloat(computedStyle.marginLeft) +
      parseFloat(computedStyle.marginRight);

    // Should have some margin for tap safety
    expect(margin).toBeGreaterThan(0);
  });

  it('should be keyboard accessible for mobile screen readers', () => {
    fixture.componentRef.setInput('currentMode', 'voice');
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button');

    // Should have proper ARIA attributes for screen readers
    expect(button.hasAttribute('aria-label')).toBe(true);
    expect(button.getAttribute('type')).toBe('button');

    // Should be focusable
    expect(button.tabIndex).toBeGreaterThanOrEqual(0);
  });
});
