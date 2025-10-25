# melior-agent Development Guidelines

Last updated: 2025-10-24

## Active Technologies
- **Angular 20.0.0** with standalone components and zoneless change detection
- **TypeScript 5.9.2** with strict mode enabled
- **Angular Material 20.0.0** for UI components
- **LiveKit Client 2.x** for WebRTC voice communication
- **Angular Signals** for reactive state management (signal, computed, input, output)
- **Jasmine/Karma** for testing with Zone.js polyfills
- TypeScript 5.x with Azure Functions TypeScript v4 (Node.js 18+) + LiveKit Server SDK for Node.js (@livekit/server-sdk), Azure Functions Core Tools v4 (002-livekit-token-api)
- N/A (stateless token generation) (002-livekit-token-api)
- TypeScript 5.9.2 with Angular 20.0.0 + Angular Material 20.0.0, LiveKit Client SDK 2.x, RxJS 7.x, Angular CDK (001-voice-chat-transcription)
- Browser sessionStorage for temporary transcription history (no persistent backend storage) (001-voice-chat-transcription)

## Project Structure

```text
src/
  app/
    models/              # TypeScript interfaces and types
    services/            # Business logic and state management
    components/          # UI components (smart & presentational)
  environments/          # Environment-specific configs
tests/
  integration/           # Integration tests
```

## Commands

- `npm start` - Start dev server (http://localhost:4200)
- `npm test` - Run unit tests with Karma
- `npm run lint` - Run ESLint
- `ng build` - Build for production

## Angular 20 Best Practices

### Zoneless Change Detection
- App uses `provideZonelessChangeDetection()` in `app.config.ts`
- **CRITICAL**: Tests require Zone.js polyfills configured in `angular.json`:
  ```json
  "test": {
    "options": {
      "polyfills": ["zone.js", "zone.js/testing"]
    }
  }
  ```
- Install `zone.js` as dev dependency for testing
- Do NOT use `provideZoneChangeDetection()` in test files

### Component Architecture
- Use standalone components exclusively
- Prefer **smart/presentational pattern**:
  - Smart components: inject services, manage state
  - Presentational: use `input()` and `output()`, pure display logic
- Always use `OnPush` change detection strategy
- Use signal-based APIs: `signal()`, `computed()`, `input()`, `output()`

### Signal Patterns
```typescript
// Component inputs (required)
connectionState = input.required<ConnectionState>();

// Component outputs
onConnect = output<void>();

// Computed signals
buttonState = computed(() => {
  const state = this.connectionState();
  return deriveButtonState(state);
});

// Service signals
private _state = signal<State>(initialState);
readonly state = this._state.asReadonly();
```

### Testing Best Practices
- **Component tests**: Don't call `fixture.detectChanges()` in `beforeEach` if component has required inputs
- Set inputs using `fixture.componentRef.setInput()` before `detectChanges()`
- Mark tests requiring LiveKit infrastructure as `pending()` for integration test suites
- Test async methods with proper error handling and timeouts

### Error Handling Patterns
- Use discriminated unions for type-safe state management
- Define error codes as string literal types
- **Known Issue**: Custom error objects should extend Error class for proper catch block handling
  ```typescript
  // TODO: Refactor ConnectionError to extend Error
  class ConnectionError extends Error {
    constructor(public code: ConnectionErrorCode, message: string) {
      super(message);
    }
  }
  ```

### Material Theme Configuration
```typescript
// Use Material 3 theming in styles.scss
@use '@angular/material' as mat;
@include mat.core();

$primary: mat.define-palette(mat.$indigo-palette);
$accent: mat.define-palette(mat.$pink-palette);
$theme: mat.define-light-theme((
  color: (primary: $primary, accent: $accent)
));
@include mat.all-component-themes($theme);
```

### Performance Considerations
- Bundle size budgets configured in `angular.json`:
  - Warning: 500KB
  - Error: 1MB
- Use `@angular/cdk/scrolling` for virtual scrolling with large lists
- Minimize bundle size by importing only needed Material modules

## Code Style

### TypeScript
- Strict mode enabled (`strict: true`)
- Use explicit return types for public methods
- Prefer `interface` over `type` for object shapes
- Use `readonly` for signals exposed from services

### Component Files
- `.ts` - Component logic with decorator metadata
- `.html` - Template (prefer separate file over inline for readability)
- `.scss` - Component styles with `:host` selector
- `.spec.ts` - Unit tests

### Naming Conventions
- Components: `PascalCase` with `Component` suffix
- Services: `PascalCase` with `Service` suffix
- Interfaces: `PascalCase` with `I` prefix for service contracts
- Models: `PascalCase` without prefix
- Constants: `UPPER_SNAKE_CASE`
- Signals: `camelCase` (private with `_` prefix)

## Recent Changes
- 003-voice-chat-mode: Added TypeScript 5.9.2 with Angular 20.0.0
- 001-voice-chat-transcription: Added TypeScript 5.9.2 with Angular 20.0.0 + Angular Material 20.0.0, LiveKit Client SDK 2.x, RxJS 7.x, Angular CDK
- 002-livekit-token-api: Added TypeScript 5.x with Azure Functions TypeScript v4 (Node.js 18+) + LiveKit Server SDK for Node.js (@livekit/server-sdk), Azure Functions Core Tools v4

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
