# Quickstart Guide: Voice Chat Transcription App

**Feature**: 001-voice-chat-transcription  
**Date**: 2025-10-24  
**For**: Developers implementing the voice chat transcription feature

## Overview

This guide helps developers quickly set up and start implementing the voice chat transcription feature. Follow these steps to get the development environment ready and understand the implementation workflow.

---

## Prerequisites

### Required Software

- **Node.js**: v20.x or later (LTS recommended)
- **npm**: v10.x or later (comes with Node.js)
- **Angular CLI**: v20.x (`npm install -g @angular/cli`)
- **Git**: Latest version
- **Modern Browser**: Chrome 120+, Safari 17+, or Firefox 120+ (for WebRTC support)

### LiveKit Account Setup

1. Sign up for a LiveKit Cloud account at https://cloud.livekit.io
2. Create a new project
3. Note your:
   - LiveKit Server URL (e.g., `wss://your-project.livekit.cloud`)
   - API Key
   - API Secret
4. Configure a LiveKit agent with transcription capabilities (see LiveKit documentation)

---

## Initial Setup

### 1. Clone and Navigate to Project

```bash
cd c:\Projects\melior-frontend\melior-agent
git checkout 001-voice-chat-transcription
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Install LiveKit SDK

```bash
npm install livekit-client@^2.0.0
npm install --save-dev @types/node
```

### 4. Install Angular Material (if not already installed)

```bash
ng add @angular/material
```

Choose options:
- Theme: Custom (or Indigo/Pink)
- Typography: Yes
- Animations: Include and enable

### 5. Install Angular CDK for Virtual Scrolling

```bash
npm install @angular/cdk
```

---

## Configuration

### 1. Backend Token API Setup

**IMPORTANT**: The voice chat app requires the backend token API to be running. This API securely generates LiveKit access tokens.

1. Navigate to the backend API directory:
   ```bash
   cd api
   ```

2. Follow the setup instructions in `specs/002-livekit-token-api/quickstart.md`:
   - Install backend dependencies
   - Configure LiveKit credentials in `local.settings.json`
   - Start the Azure Functions backend

3. Verify backend is running:
   ```bash
   # Backend should be available at http://localhost:7071
   curl http://localhost:7071/api/token -X POST -H "Content-Type: application/json" -d "{\"roomName\":\"test\",\"participantIdentity\":\"user\"}"
   ```

4. Return to frontend directory:
   ```bash
   cd ..
   ```

### 2. Frontend Environment Configuration

Create or update environment files to point to the backend token API:

**src/environments/environment.development.ts**:
```typescript
export const environment = {
  production: false,
  tokenApiUrl: 'http://localhost:7071/api',  // Backend token API
  liveKitUrl: 'ws://localhost:7880',         // Local LiveKit server (or cloud URL)
};
```

**Note**: For local development, you can either:
- Use a local LiveKit server (see LiveKit docs for setup)
- Use LiveKit Cloud URL: `wss://your-project.livekit.cloud`

**src/environments/environment.ts** (Production):
```typescript
export const environment = {
  production: true,
  tokenApiUrl: 'https://your-function-app.azurewebsites.net/api',
  liveKitUrl: 'wss://your-project.livekit.cloud',

};
```

### 2. TypeScript Configuration

Ensure `tsconfig.json` has strict mode enabled:

```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "strictPropertyInitialization": true,
    "noImplicitAny": true
  }
}
```

### 3. Angular Configuration

Update `angular.json` for production optimization:

```json
{
  "projects": {
    "melior-agent": {
      "architect": {
        "build": {
          "configurations": {
            "production": {
              "budgets": [
                {
                  "type": "initial",
                  "maximumWarning": "500kb",
                  "maximumError": "1mb"
                }
              ]
            }
          }
        }
      }
    }
  }
}
```

---

## Development Workflow

### TDD Approach

This project follows **Test-Driven Development**. For each feature:

1. **Write Test First**: Create the test file and write failing tests
2. **User Approval**: Show tests to user (if applicable)
3. **Implement**: Write code to make tests pass
4. **Refactor**: Improve code while keeping tests green

### Development Steps

#### Step 1: Create Models (TDD)

```bash
# Create model files
ng generate interface models/connection-state --type=model --skip-tests
ng generate interface models/transcription-message --type=model --skip-tests
ng generate interface models/session --type=model --skip-tests
```

Then implement the TypeScript interfaces from `data-model.md`.

#### Step 2: Create Services (TDD)

```bash
# Generate LiveKit connection service with test
ng generate service services/livekit-connection

# Generate transcription service with test
ng generate service services/transcription
```

**TDD Workflow for Services**:
1. Open `livekit-connection.service.spec.ts`
2. Write tests for connection lifecycle
3. Run tests: `npm test` (they should fail)
4. Implement service logic
5. Run tests again (they should pass)

#### Step 3: Create Components (TDD)

```bash
# Generate main voice chat component
ng generate component components/voice-chat --standalone

# Generate connection button component
ng generate component components/connection-button --standalone

# Generate transcription display component
ng generate component components/transcription-display --standalone
```

**TDD Workflow for Components**:
1. Write component tests first
2. Implement component logic
3. Test with `npm test`

#### Step 4: Run Development Server

```bash
npm start
```

Navigate to `http://localhost:4200`. The app will automatically reload on file changes.

---

## Project Structure

Reference the structure defined in `plan.md`:

```
src/app/
├── components/
│   ├── voice-chat/              # Smart component
│   ├── connection-button/       # Presentational component
│   └── transcription-display/   # Presentational component
├── services/
│   ├── livekit-connection.service.ts
│   └── transcription.service.ts
├── models/
│   ├── connection-state.model.ts
│   ├── transcription-message.model.ts
│   └── session.model.ts
└── app.component.ts
```

---

## Testing

### Run Unit Tests

```bash
npm test
```

Runs Jasmine/Karma tests in watch mode.

### Run Tests with Coverage

```bash
npm test -- --code-coverage
```

View coverage report in `coverage/index.html`.

### Run E2E Tests (when implemented)

```bash
npm run e2e
```

---

## Key Implementation Tips

### 1. Using Angular Signals

```typescript
import { signal, computed, effect } from '@angular/core';

// In service
export class LiveKitConnectionService {
  connectionState = signal<ConnectionState>({ status: 'disconnected' });
  
  isConnected = computed(() => this.connectionState().status === 'connected');
}
```

### 2. LiveKit Connection Pattern

```typescript
import { Room, RoomEvent } from 'livekit-client';

async connect(config: LiveKitConfig): Promise<void> {
  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
  });

  room.on(RoomEvent.Connected, () => {
    this.connectionState.set({ status: 'connected', roomName: config.roomName });
  });

  room.on(RoomEvent.Disconnected, () => {
    this.connectionState.set({ status: 'disconnected' });
  });

  await room.connect(config.serverUrl, config.token);
}
```

### 3. Component Input/Output with Signals

```typescript
import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-connection-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectionButtonComponent {
  // Input signal
  connectionState = input.required<ConnectionState>();
  
  // Output emitter
  buttonClick = output<void>();
  
  onClick() {
    this.buttonClick.emit();
  }
}
```

### 4. Virtual Scrolling for Transcriptions

```typescript
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';

@Component({
  selector: 'app-transcription-display',
  standalone: true,
  imports: [ScrollingModule],
  template: `
    <cdk-virtual-scroll-viewport itemSize="60" class="transcription-list">
      @for (message of messages(); track message.id) {
        <div class="transcription-item">{{ message.text }}</div>
      }
    </cdk-virtual-scroll-viewport>
  `,
})
export class TranscriptionDisplayComponent {
  messages = input.required<readonly TranscriptionMessage[]>();
}
```

---

## Accessibility Checklist

Ensure all components meet WCAG 2.1 AA standards:

- [ ] All buttons have descriptive `aria-label` attributes
- [ ] Transcription display uses `role="log"` and `aria-live="polite"`
- [ ] Focus management for keyboard navigation
- [ ] Color contrast ratio >= 4.5:1 for text
- [ ] Screen reader announcements for connection state changes
- [ ] Semantic HTML elements (`<button>`, `<article>`, `<time>`)

---

## Common Issues & Solutions

### Issue: Backend Token API Not Running

**Symptoms**: 
- Frontend shows "Unable to connect" error
- Browser console shows 404 or network error when calling `/api/token`
- Connection fails immediately

**Solution**:
1. Ensure backend API is running:
   ```bash
   cd api
   func start --typescript
   ```
2. Verify backend is accessible:
   ```bash
   curl http://localhost:7071/api/token
   ```
3. Check backend logs for errors
4. Verify `local.settings.json` has valid LiveKit credentials
5. See `specs/002-livekit-token-api/quickstart.md` for detailed backend setup

### Issue: CORS Error When Calling Token API

**Symptoms**:
- Browser console shows CORS policy error
- Network tab shows OPTIONS preflight request failing

**Solution**:
1. Check `api/host.json` has CORS configured:
   ```json
   {
     "extensions": {
       "http": {
         "routePrefix": "api",
         "cors": {
           "allowedOrigins": ["http://localhost:4200"]
         }
       }
     }
   }
   ```
2. Restart backend API after changes
3. Clear browser cache

### Issue: Token Generation Fails (400 Bad Request)

**Symptoms**:
- Backend returns 400 error with validation message
- Error details show which fields are invalid

**Solution**:
- Ensure `roomName` contains only alphanumeric, dash, underscore characters
- Ensure `participantIdentity` is not empty
- Check request payload matches `TokenRequest` interface
- Review validation errors in error response `details` field

### Issue: LiveKit Connection Fails

**Solution**: Check browser console for errors. Ensure:
- Valid LiveKit token (not expired)
- Backend API generated token successfully  
- Correct LiveKit server URL in environment config
- Microphone permission granted
- WebRTC supported in browser

### Issue: Transcriptions Not Appearing

**Solution**:
- Verify LiveKit agent has transcription enabled
- Check browser console for `RoomEvent.DataReceived` or transcription events
- Ensure transcription service is properly subscribed to room events
- Verify agent is publishing transcription data messages

### Issue: High Memory Usage

**Solution**:
- Implement transcription history limit (max 500 messages)
- Use virtual scrolling for long lists
- Check for memory leaks with Chrome DevTools

---

## Next Steps

1. ✅ Review `spec.md` for complete requirements
2. ✅ Review `data-model.md` for all TypeScript interfaces
3. ✅ Review `contracts/service-contracts.md` for service interfaces
4. ✅ Follow TDD workflow: Write tests → Implement → Verify
5. ✅ Start with `LiveKitConnectionService` implementation
6. ✅ Then implement `TranscriptionService`
7. ✅ Build components: VoiceChat → ConnectionButton → TranscriptionDisplay
8. ✅ Test on mobile devices (Chrome DevTools device emulation)
9. ✅ Run accessibility tests
10. ✅ Optimize performance (check bundle size, run Lighthouse)

---

## Useful Commands Reference

```bash
# Development
npm start                    # Start dev server (localhost:4200)
npm test                     # Run unit tests in watch mode
npm run lint                 # Run linter
npm run build                # Production build

# Testing
npm test -- --code-coverage  # Run tests with coverage
npm run e2e                  # Run E2E tests (when configured)

# Code Generation
ng generate component <name> --standalone
ng generate service <name>
ng generate interface <name> --type=model

# Angular CLI
ng version                   # Check Angular version
ng update                    # Update dependencies
```

---

## Resources

### Documentation
- [Angular 20 Docs](https://angular.dev)
- [Angular Signals Guide](https://angular.dev/guide/signals)
- [LiveKit JavaScript SDK](https://docs.livekit.io/client-sdk-js/)
- [Angular Material](https://material.angular.io)
- [Angular CDK](https://material.angular.io/cdk)

### LiveKit Resources
- [LiveKit Cloud Dashboard](https://cloud.livekit.io)
- [LiveKit Transcription Guide](https://docs.livekit.io/guides/transcription/)
- [LiveKit Agent Docs](https://docs.livekit.io/agents/)

### Testing Resources
- [Jasmine Documentation](https://jasmine.github.io)
- [Angular Testing Guide](https://angular.dev/guide/testing)

---

## Support

For questions or issues:
1. Check `spec.md` for requirement clarifications
2. Review `research.md` for technical decisions
3. Consult `data-model.md` for type definitions
4. Check LiveKit documentation for SDK-specific questions

---

**Ready to start coding!** 🚀

Begin with TDD: Write your first test for `LiveKitConnectionService.connect()` method.
