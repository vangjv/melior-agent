# Quickstart Guide: Auto-Disconnect on Idle Activity

**Feature**: 006-auto-disconnect-idle  
**Date**: 2025-10-27  
**For**: Developers implementing the idle timeout feature

## Overview

This guide provides step-by-step instructions for implementing automatic disconnection of idle voice chat sessions. The feature monitors user activity (transcriptions and chat messages) and disconnects the session after a configurable timeout period (default: 2 minutes).

---

## Prerequisites

- Familiarity with Angular 20 standalone components
- Understanding of Angular Signals and RxJS
- Knowledge of the existing ConversationStorageService and LiveKitConnectionService
- Development environment set up per project README

---

## Implementation Steps

### Step 1: Create Model Interfaces

Create the TypeScript interfaces for type safety.

**Files to create:**
- `src/app/models/idle-timeout-config.ts`
- `src/app/models/idle-timer-state.ts`
- `src/app/models/activity-event.ts`

**Reference**: See `/specs/006-auto-disconnect-idle/contracts/idle-timeout-types.ts` for complete type definitions.

**Key interfaces**:
```typescript
// idle-timeout-config.ts
export interface IdleTimeoutConfig {
  durationSeconds: number;
  warningThresholdSeconds: number;
  enabled: boolean;
}

// idle-timer-state.ts
export interface IdleTimerState {
  isActive: boolean;
  timeRemaining: number;
  isWarning: boolean;
  lastActivity: Date | null;
}

// activity-event.ts
export type ActivityEvent = 
  | TranscriptionActivityEvent
  | ChatMessageActivityEvent;
```

---

### Step 2: Create IdleTimeoutService

Implement the core service for timer logic and activity monitoring.

**File**: `src/app/services/idle-timeout.service.ts`

**Key responsibilities**:
- Start/stop timer monitoring
- Track time remaining with RxJS interval
- Monitor activity via ConversationStorageService signal
- Trigger disconnect via LiveKitConnectionService
- Persist configuration in sessionStorage

**Service structure**:
```typescript
@Injectable({
  providedIn: 'root'
})
export class IdleTimeoutService {
  // Injected dependencies
  private conversationService = inject(ConversationStorageService);
  private connectionService = inject(LiveKitConnectionService);
  
  // Private signals
  private _timerState = signal<IdleTimerState>(INITIAL_STATE);
  private _config = signal<IdleTimeoutConfig>(DEFAULT_CONFIG);
  
  // Public readonly signals
  readonly timerState = this._timerState.asReadonly();
  readonly config = this._config.asReadonly();
  
  // Computed signals
  readonly formattedTimeRemaining = computed(() => {
    const seconds = this._timerState().timeRemaining;
    return this.formatTime(seconds);
  });
  
  // RxJS subscription management
  private timerSubscription?: Subscription;
  private destroyRef = inject(DestroyRef);
  
  constructor() {
    this.loadConfig();
    this.setupActivityMonitoring();
  }
  
  // Public methods
  startMonitoring(): void { /* ... */ }
  stopMonitoring(): void { /* ... */ }
  resetTimer(): void { /* ... */ }
  updateConfig(config: Partial<IdleTimeoutConfig>): void { /* ... */ }
}
```

**Activity monitoring pattern**:
```typescript
private setupActivityMonitoring(): void {
  effect(() => {
    const lastActivity = this.conversationService.lastMessageAt();
    const state = this._timerState();
    
    if (lastActivity && state.isActive) {
      console.log('Activity detected - resetting timer');
      this.resetTimer();
    }
  }, { allowSignalWrites: true });
}
```

**Timer implementation**:
```typescript
private startTimer(): void {
  const duration = this._config().durationSeconds;
  
  this.timerSubscription = interval(1000).pipe(
    takeUntilDestroyed(this.destroyRef),
    map(tick => duration - tick - 1),
    takeWhile(remaining => remaining >= 0)
  ).subscribe({
    next: (remaining) => {
      this._timerState.update(state => ({
        ...state,
        timeRemaining: remaining,
        isWarning: remaining <= this._config().warningThresholdSeconds
      }));
    },
    complete: () => this.onTimeout()
  });
}

private async onTimeout(): Promise<void> {
  console.log('⏱️ Idle timeout - disconnecting');
  this._timerState.update(state => ({ ...state, isActive: false }));
  await this.connectionService.disconnect();
}
```

---

### Step 3: Create IdleWarningComponent

Implement the presentational component for warning display.

**File**: `src/app/components/idle-warning/idle-warning.component.ts`

**Component structure**:
```typescript
@Component({
  selector: 'app-idle-warning',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './idle-warning.component.html',
  styleUrl: './idle-warning.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IdleWarningComponent {
  // Inputs (required)
  timeRemaining = input.required<number>();
  formattedTime = input.required<string>();
  visible = input.required<boolean>();
  
  // Outputs
  onDismiss = output<void>();
  
  // Click handler
  handleDismiss(): void {
    this.onDismiss.emit();
  }
}
```

**Template** (`idle-warning.component.html`):
```html
@if (visible()) {
  <div class="idle-warning" role="alert" aria-live="assertive">
    <mat-icon>timer</mat-icon>
    <span class="warning-text">
      Session will disconnect in {{ formattedTime() }} due to inactivity
    </span>
    <button 
      mat-raised-button 
      color="primary" 
      (click)="handleDismiss()"
      aria-label="Stay connected and reset idle timer">
      Stay Connected
    </button>
  </div>
}
```

**Styles** (`idle-warning.component.scss`):
```scss
.idle-warning {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--warning-background);
  border-left: 4px solid var(--warning-color);
  
  mat-icon {
    color: var(--warning-color);
  }
  
  .warning-text {
    flex: 1;
    font-weight: 500;
  }
}
```

---

### Step 4: Integration with VoiceChatComponent

Add idle timeout to the existing voice chat component.

**File**: `src/app/components/voice-chat/voice-chat.component.ts`

**Changes needed**:

1. **Inject the service**:
```typescript
export class VoiceChatComponent {
  private idleTimeoutService = inject(IdleTimeoutService);
  
  // Expose service state to template
  readonly idleTimerState = this.idleTimeoutService.timerState;
  readonly formattedTime = this.idleTimeoutService.formattedTimeRemaining;
}
```

2. **Start monitoring on connect**:
```typescript
async onConnect(): Promise<void> {
  await this.connectionService.connect(config);
  this.idleTimeoutService.startMonitoring();
}
```

3. **Stop monitoring on disconnect**:
```typescript
async onDisconnect(): Promise<void> {
  this.idleTimeoutService.stopMonitoring();
  await this.connectionService.disconnect();
}
```

4. **Add warning component to template**:
```html
<!-- Add to voice-chat.component.html -->
<app-idle-warning
  [timeRemaining]="idleTimerState().timeRemaining"
  [formattedTime]="formattedTime()"
  [visible]="idleTimerState().isWarning"
  (onDismiss)="idleTimeoutService.resetTimer()"
/>
```

---

### Step 5: Add Storage Utilities (Optional)

If reusing existing storage patterns, extend `storage.utils.ts`.

**File**: `src/app/utils/storage.utils.ts`

```typescript
export function loadIdleTimeoutConfig(): IdleTimeoutConfig {
  const stored = sessionStorage.getItem(IDLE_TIMEOUT_CONSTRAINTS.STORAGE_KEY);
  if (!stored) {
    return DEFAULT_IDLE_TIMEOUT_CONFIG;
  }
  
  try {
    const parsed = JSON.parse(stored);
    return isValidConfig(parsed) ? parsed : DEFAULT_IDLE_TIMEOUT_CONFIG;
  } catch {
    return DEFAULT_IDLE_TIMEOUT_CONFIG;
  }
}

export function saveIdleTimeoutConfig(config: IdleTimeoutConfig): void {
  sessionStorage.setItem(
    IDLE_TIMEOUT_CONSTRAINTS.STORAGE_KEY,
    JSON.stringify(config)
  );
}
```

---

### Step 6: Write Tests

Implement comprehensive test coverage per TDD principles.

**Service tests** (`idle-timeout.service.spec.ts`):
```typescript
describe('IdleTimeoutService', () => {
  beforeEach(() => {
    jasmine.clock().install();
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  it('should trigger timeout after configured duration', () => {
    service.startMonitoring();
    
    jasmine.clock().tick(119000); // 119 seconds
    expect(service.timerState().isActive).toBe(true);
    
    jasmine.clock().tick(1000); // 120 seconds total
    expect(service.timerState().isActive).toBe(false);
  });

  it('should reset timer on activity', () => {
    service.startMonitoring();
    jasmine.clock().tick(60000); // 1 minute
    
    // Simulate activity
    conversationService.addMessage(testMessage);
    
    expect(service.timerState().timeRemaining).toBe(120);
  });
});
```

**Component tests** (`idle-warning.component.spec.ts`):
```typescript
describe('IdleWarningComponent', () => {
  it('should display warning when visible', () => {
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('timeRemaining', 30);
    fixture.componentRef.setInput('formattedTime', '00:30');
    fixture.detectChanges();
    
    const warning = fixture.nativeElement.querySelector('.idle-warning');
    expect(warning).toBeTruthy();
  });

  it('should emit onDismiss when button clicked', () => {
    const onDismissSpy = jasmine.createSpy('onDismiss');
    fixture.componentInstance.onDismiss.subscribe(onDismissSpy);
    
    const button = fixture.nativeElement.querySelector('button');
    button.click();
    
    expect(onDismissSpy).toHaveBeenCalled();
  });
});
```

---

## Configuration

### Default Settings

The default configuration is:
- **Duration**: 120 seconds (2 minutes)
- **Warning Threshold**: 30 seconds
- **Enabled**: true

### Customization

Users can customize timeout via service:
```typescript
idleTimeoutService.updateConfig({
  durationSeconds: 300 // 5 minutes
});
```

Future enhancement: Add settings UI component for user configuration.

---

## Testing Checklist

- [ ] Service unit tests with fake timers
- [ ] Component tests for warning display
- [ ] Integration test for full timeout flow
- [ ] Test timer reset on transcription
- [ ] Test timer reset on chat message
- [ ] Test warning appears at threshold
- [ ] Test configuration persistence
- [ ] Test validation of invalid configs
- [ ] Accessibility testing (keyboard navigation, screen readers)
- [ ] Visual testing across browsers

---

## Accessibility Considerations

- Warning uses `role="alert"` for immediate announcement
- Button is keyboard accessible (tab + enter)
- Sufficient color contrast (4.5:1 minimum)
- Screen reader announces countdown updates
- Focus management when warning appears

---

## Performance Considerations

- Use `OnPush` change detection on IdleWarningComponent
- Timer updates at 1Hz (one per second) - no excessive rendering
- Cleanup timer subscription on component destroy
- Use `debounceTime(250)` if activity events are very frequent

---

## Common Issues & Solutions

### Issue: Timer doesn't reset on activity
**Solution**: Verify ConversationStorageService is updating `lastMessageAt` signal. Check effect is monitoring the signal correctly.

### Issue: Warning doesn't appear
**Solution**: Check `isWarning` computed property logic. Verify component input binding.

### Issue: Tests are flaky
**Solution**: Always use `jasmine.clock()` for timer tests. Install/uninstall in beforeEach/afterEach.

### Issue: Memory leak
**Solution**: Ensure timer subscription uses `takeUntilDestroyed()` or is cleaned up in `ngOnDestroy()`.

---

## Next Steps

After implementing this feature:
1. Test manually with real LiveKit connection
2. Verify timeout behavior in different browsers
3. Add analytics/logging for timeout events
4. Consider adding settings UI for configuration
5. Document user-facing behavior in help docs

---

## References

- **Spec**: `/specs/006-auto-disconnect-idle/spec.md`
- **Data Model**: `/specs/006-auto-disconnect-idle/data-model.md`
- **Research**: `/specs/006-auto-disconnect-idle/research.md`
- **Type Contracts**: `/specs/006-auto-disconnect-idle/contracts/idle-timeout-types.ts`
- **Angular Signals**: https://angular.dev/guide/signals
- **RxJS interval**: https://rxjs.dev/api/index/function/interval
- **Jasmine clock**: https://jasmine.github.io/api/edge/Clock.html

---

**Status**: Ready for implementation following TDD approach
