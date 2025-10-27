# Research: Auto-Disconnect on Idle Activity

**Feature**: 006-auto-disconnect-idle  
**Phase**: 0 - Outline & Research  
**Date**: 2025-10-27

## Overview

This document consolidates research findings for implementing idle timeout functionality in the MeliorAgent voice chat application. The feature monitors user activity (transcriptions and chat messages) and automatically disconnects inactive sessions.

## Research Areas

### 1. Timer Implementation Patterns in Angular

**Decision**: Use RxJS interval combined with Angular Signals for reactive timer state

**Rationale**: 
- RxJS `interval()` provides reliable periodic emissions for countdown timers
- Angular Signals (`signal()`, `computed()`) offer optimal reactivity for timer state updates
- `effect()` enables automatic cleanup when components are destroyed
- Combines the strengths of RxJS for async operations with Signals for state management

**Alternatives Considered**:
- `setInterval()`: Rejected because it requires manual cleanup and doesn't integrate well with Angular's change detection
- `timer()` operator only: Rejected because it's better suited for delays rather than recurring countdown updates
- Pure Signal-based implementation: Rejected because Signals alone don't provide scheduling capabilities

**Implementation Pattern**:
```typescript
// Service manages timer with RxJS
private timerSubscription?: Subscription;

startTimer(durationSeconds: number): void {
  this.timerSubscription = interval(1000)
    .pipe(
      map(tick => durationSeconds - tick - 1),
      takeWhile(remaining => remaining >= 0)
    )
    .subscribe({
      next: (remaining) => this._timeRemaining.set(remaining),
      complete: () => this.onTimeout()
    });
}

// Component reacts to timer state with Signals
readonly timeRemaining = computed(() => this.service.timerState().timeRemaining);
```

**Best Practices**:
- Always unsubscribe in `ngOnDestroy()` or use `takeUntilDestroyed()` from `@angular/core/rxjs-interop`
- Use `debounceTime()` when resetting timer on rapid activity events to prevent excessive restarts
- Store timer state in Signals for reactive UI updates

**References**:
- RxJS interval: https://rxjs.dev/api/index/function/interval
- Angular Signals: https://angular.dev/guide/signals
- takeUntilDestroyed: https://angular.dev/api/core/rxjs-interop/takeUntilDestroyed

---

### 2. Activity Event Detection Strategy

**Decision**: Subscribe to existing service Signals for transcription and conversation events

**Rationale**:
- `ConversationStorageService` already provides `lastMessageAt` signal tracking all activity
- `TranscriptionService` emits transcription events that feed into conversation storage
- Using existing signals avoids duplicate event handling and maintains single source of truth
- Signal effects allow automatic timer reset when activity occurs

**Alternatives Considered**:
- Event bus pattern: Rejected as over-engineered for this use case
- Component-level event bubbling: Rejected because it couples idle timeout to specific components
- Direct LiveKit event subscription: Rejected because it bypasses application's message handling logic

**Implementation Pattern**:
```typescript
// In IdleTimeoutService
constructor() {
  private conversationService = inject(ConversationStorageService);
  
  // Watch for activity
  effect(() => {
    const lastActivity = this.conversationService.lastMessageAt();
    if (lastActivity && this._isActive()) {
      this.resetTimer();
    }
  });
}
```

**Best Practices**:
- Use `effect()` with proper cleanup for signal-based activity monitoring
- Consider `allowSignalWrites: true` in effect options if timer state updates trigger other signals
- Log activity events in development mode for debugging idle timeout behavior

**References**:
- Angular effects: https://angular.dev/guide/signals#effects
- ConversationStorageService: `/src/app/services/conversation-storage.service.ts`

---

### 3. Browser Tab Visibility Handling

**Decision**: Continue timer regardless of tab visibility, no special handling

**Rationale**:
- Spec assumptions state "Browser tab visibility or focus state does not need to affect idle timer behavior"
- Simpler implementation without Page Visibility API complexity
- User activity (messages/transcriptions) resets timer regardless of tab state
- Aligns with use case where users may multitask while waiting for responses

**Alternatives Considered**:
- Pause timer when tab hidden: Rejected because it could extend sessions indefinitely if users keep tab in background
- Adjust timer rate when hidden: Rejected as overly complex with minimal benefit
- Warn user if tab hidden during countdown: Rejected as out of scope for MVP

**Best Practices**:
- Document this behavior clearly in user documentation
- Consider adding visibility handling in future iterations if user feedback warrants it
- Log warning events even when tab is hidden for debugging purposes

**Future Considerations**:
- Could add configuration option to pause timer when tab hidden
- Could show browser notification 10 seconds before timeout if tab is hidden

---

### 4. Configuration Storage Approach

**Decision**: Use browser sessionStorage for idle timeout configuration persistence

**Rationale**:
- Aligns with existing project pattern (ConversationStorageService uses sessionStorage)
- Configuration persists across page refreshes within same session
- Simple key-value storage sufficient for timeout duration setting
- No backend storage required, keeping implementation client-side only

**Alternatives Considered**:
- localStorage: Rejected because timeout preference is more session-specific than permanent
- Backend API: Rejected as out of scope (spec states "client-side only")
- In-memory only: Rejected because configuration would reset on page refresh

**Implementation Pattern**:
```typescript
// Storage key
private readonly STORAGE_KEY = 'melior-agent:idle-timeout-config';

// Save configuration
saveConfig(config: IdleTimeoutConfig): void {
  sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
}

// Load configuration
loadConfig(): IdleTimeoutConfig {
  const stored = sessionStorage.getItem(this.STORAGE_KEY);
  return stored ? JSON.parse(stored) : DEFAULT_CONFIG;
}
```

**Best Practices**:
- Use consistent key naming convention with app namespace prefix
- Validate loaded configuration (ensure positive numbers, within allowed range)
- Provide default configuration fallback for first-time users
- Consider using existing `storage-migration.util.ts` pattern for consistency

**References**:
- Web Storage API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API
- Existing storage utils: `/src/app/utils/storage-migration.util.ts`

---

### 5. Warning Display UX Patterns

**Decision**: Material Dialog or inline banner with countdown display

**Rationale**:
- Angular Material provides accessible, themed components out of the box
- Dialog (`MatSnackBar`) suitable for non-blocking warnings with action button
- Inline banner alternative for users who prefer persistent warning
- Both approaches support WCAG 2.1 AA requirements with `role="alert"`

**Alternatives Considered**:
- Modal dialog: Rejected because it blocks user interaction unnecessarily
- Browser notification: Rejected as requires permission and may not be visible
- Status bar only: Rejected because it may not be prominent enough for time-sensitive warning

**Implementation Pattern**:
```typescript
// Using MatSnackBar for warning
showWarning(secondsRemaining: number): void {
  this.snackBar.open(
    `Session will disconnect in ${secondsRemaining} seconds due to inactivity`,
    'Stay Connected',
    {
      duration: undefined, // Don't auto-dismiss
      panelClass: 'idle-warning-snackbar',
      horizontalPosition: 'center',
      verticalPosition: 'top'
    }
  ).onAction().subscribe(() => {
    this.resetTimer(); // User clicked "Stay Connected"
  });
}
```

**Best Practices**:
- Update warning text every second to show countdown
- Provide clear action button to dismiss warning and reset timer
- Use distinct styling (warning color) to grab attention
- Include ARIA attributes for screen reader announcements
- Test with keyboard navigation only

**Accessibility Considerations**:
- `role="alert"` for immediate screen reader announcement
- Sufficient color contrast (4.5:1 minimum for text)
- Keyboard accessible action button (tab navigation, enter to activate)
- Screen reader announces countdown updates (consider throttling to avoid spam)

**References**:
- MatSnackBar: https://material.angular.io/components/snack-bar
- ARIA live regions: https://www.w3.org/WAI/WCAG21/Understanding/status-messages.html

---

### 6. Testing Strategies for Timer Logic

**Decision**: Use Jasmine's fake timers (`jasmine.clock()`) for deterministic timer testing

**Rationale**:
- Eliminates flakiness from real-time delays in tests
- Allows fast, synchronous testing of timer behavior
- Works well with RxJS interval and timeout operators
- Standard approach in Angular/Jasmine ecosystem

**Alternatives Considered**:
- Real timers with async/await: Rejected because tests would be slow and potentially flaky
- Mocking interval completely: Rejected because it doesn't test actual RxJS timer behavior
- TestScheduler from RxJS: Considered but jasmine.clock() is simpler for this use case

**Implementation Pattern**:
```typescript
describe('IdleTimeoutService timer behavior', () => {
  beforeEach(() => {
    jasmine.clock().install();
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  it('should trigger timeout after configured duration', () => {
    service.startMonitoring(120); // 2 minutes
    
    jasmine.clock().tick(119000); // 119 seconds
    expect(service.timerState().isActive).toBe(true);
    
    jasmine.clock().tick(1000); // 120 seconds total
    expect(service.timerState().isActive).toBe(false);
    expect(disconnectSpy).toHaveBeenCalled();
  });
});
```

**Best Practices**:
- Always install/uninstall clock in beforeEach/afterEach
- Use `tick()` to advance time deterministically
- Test edge cases: rapid resets, timer at boundary conditions
- Verify cleanup: no timers running after component destruction
- Test integration with Signal updates using `fixture.detectChanges()`

**References**:
- Jasmine clock: https://jasmine.github.io/api/edge/Clock.html
- Angular testing: https://angular.dev/guide/testing

---

### 7. Integration with Existing Connection Management

**Decision**: Inject `LiveKitConnectionService` and call `disconnect()` on timeout

**Rationale**:
- `LiveKitConnectionService` is the single source of truth for connection state
- Calling its `disconnect()` method ensures proper cleanup of LiveKit resources
- Existing service already handles disconnection logic, event emission, and state management
- Maintains separation of concerns: idle timeout monitors activity, connection service manages connection

**Alternatives Considered**:
- Direct LiveKit room disconnect: Rejected because it bypasses application's connection state management
- Custom disconnection event: Rejected as unnecessary when service method exists
- Manual room cleanup in IdleTimeoutService: Rejected because it duplicates logic

**Implementation Pattern**:
```typescript
// In IdleTimeoutService
private connectionService = inject(LiveKitConnectionService);

private async onTimeout(): Promise<void> {
  console.log('⏱️ Idle timeout expired - disconnecting');
  this._isActive.set(false);
  
  try {
    await this.connectionService.disconnect();
    // Optionally show user message about auto-disconnect reason
  } catch (error) {
    console.error('Error during auto-disconnect:', error);
  }
}
```

**Best Practices**:
- Handle disconnection errors gracefully
- Log timeout events for debugging and analytics
- Consider emitting custom event for "auto-disconnect" vs manual disconnect (for analytics)
- Ensure idle timer is stopped/cleaned up after disconnect completes

**References**:
- LiveKitConnectionService: `/src/app/services/livekit-connection.service.ts`

---

## Technology Stack Summary

### Required Dependencies
All dependencies already available in project:
- **Angular 20.0.0**: Signals, effects, standalone components
- **RxJS 7.8**: interval, takeWhile, debounceTime operators
- **Angular Material 20.0.0**: MatSnackBar for warning display
- **TypeScript 5.9.2**: Interface definitions with strict typing
- **Jasmine/Karma**: Testing with fake timers

### New Utilities
- **IdleTimeoutService**: Core timer and activity monitoring logic
- **IdleWarningComponent**: Presentational component for warning display
- **Storage utils**: Configuration persistence (may reuse existing utils)

### Integration Points
- **ConversationStorageService**: Activity event source (lastMessageAt signal)
- **LiveKitConnectionService**: Disconnect trigger
- **VoiceChatComponent**: Service injection and lifecycle management

---

## Open Questions Resolved

1. **Should timer continue when browser tab is hidden?**  
   ✅ Yes - continues regardless of visibility per spec assumptions

2. **How to detect user activity?**  
   ✅ Subscribe to ConversationStorageService.lastMessageAt signal

3. **Where to store configuration?**  
   ✅ Browser sessionStorage, aligned with existing patterns

4. **How to handle rapid activity events?**  
   ✅ Use RxJS debounceTime (250ms) to prevent excessive timer resets

5. **What happens if user manually disconnects during countdown?**  
   ✅ Timer stops automatically via effect monitoring connection state

---

## Next Steps (Phase 1)

With all research questions resolved, proceed to:
1. Create `data-model.md` defining TypeScript interfaces
2. Generate type contracts in `/contracts/` directory
3. Create `quickstart.md` for developers implementing the feature
4. Update agent context file with new technology decisions
5. Re-validate Constitution Check with design decisions

**Status**: ✅ Research complete - Ready for Phase 1 Design
