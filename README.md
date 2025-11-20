# MeliorAgent

Voice chat transcription application built with Angular 20, LiveKit, and Azure Functions.

## Features

- 🎤 **Voice Chat**: Connect to LiveKit voice agent for real-time conversation
- 📝 **Live Transcription**: Real-time transcription of both user and agent speech
- 💬 **Chat Mode Toggle**: Switch between voice and text-based chat responses
- 🗂️ **Unified Conversation View**: Single timeline showing all messages (voice and chat) in chronological order
- 💾 **Conversation Persistence**: History saved to sessionStorage and restored on reconnect
- ⚡ **Virtual Scrolling**: Efficient rendering for conversations with 100+ messages
- ⏱️ **Idle Timeout Protection**: Automatic disconnection after 2 minutes of inactivity with 30-second warning
- 🔄 **Auto-Reconnection**: Automatic reconnection with exponential backoff on network interruptions
- 📱 **Mobile-First**: Responsive design optimized for mobile devices
- ♿ **Accessible**: WCAG 2.1 AA compliant with screen reader support
- 🔐 **Secure Authentication**: Microsoft Entra External ID authentication for frontend and backend
- 🔒 **Token-Based API Security**: Azure Functions protected with JWT token validation

## Quick Start

### Prerequisites

- **Node.js**: v20.x or later
- **npm**: v10.x or later
- **Angular CLI**: v20.x (`npm install -g @angular/cli`)
- **LiveKit Account**: Sign up at https://cloud.livekit.io
- **Microsoft Entra External ID**: Tenant with application registration (see Authentication Setup below)

### Installation

1. **Clone and install dependencies**:
   ```bash
   npm install
   ```

2. **Set up backend token API**:
   ```bash
   cd api
   npm install
   # Copy and configure local settings
   cp local.settings.json.example local.settings.json
   # Edit local.settings.json with your LiveKit credentials
   ```

3. **Configure frontend environment**:
   ```bash
   # Create development environment file
   cp src/environments/environment.development.local.ts.example src/environments/environment.development.local.ts
   # Edit with your LiveKit URL and Entra configuration
   ```

4. **Configure authentication** (see [Authentication Setup](#authentication-setup) below)

5. **Start the backend API**:
   ```bash
   cd api
   npm start
   # Backend runs at http://localhost:7071
   ```

6. **Start the development server** (in a new terminal):
   ```bash
   cd api
   npm start
   # Backend runs at http://localhost:7071
   ```

5. **Start the development server** (in a new terminal):
   ```bash
   cd ..
   npm start
   # App runs at http://localhost:4200
   ```

### Using the App

1. Open http://localhost:4200 in your browser
2. Click "Connect" to start a voice session
3. Grant microphone permissions when prompted
4. **Toggle Response Mode** (optional):
   - Click the mode toggle button to switch between **Voice Mode** and **Chat Mode**
   - **Voice Mode**: Agent responds with synthesized speech (default)
   - **Chat Mode**: Agent responds with text messages displayed on screen
   - Your preference is saved and automatically applied on reconnect
5. Start speaking - your speech will be transcribed in real-time
6. The AI agent will respond according to the selected mode:
   - In Voice Mode: Spoken responses are transcribed
   - In Chat Mode: Text responses are displayed in the chat window
7. Click "Disconnect" when finished

### Response Mode Toggle

The mode toggle button allows you to choose how the agent responds:

- **🎤 Voice Mode** (default): Agent speaks responses aloud
- **💬 Chat Mode**: Agent sends text messages to the chat display

**Features:**
- Seamless switching without disconnecting
- Visual feedback shows current mode and pending state
- Mode preference persists across sessions
- Mobile-optimized with 44x44px touch target
- Accessible with ARIA labels and keyboard navigation

**Usage Tips:**
- Use Voice Mode for hands-free conversation
- Switch to Chat Mode in quiet environments or to review agent responses
- Chat history is preserved during the session but cleared on disconnect
- The button shows "Switching..." while waiting for agent confirmation

### Idle Timeout Protection

The application automatically disconnects idle sessions to conserve resources:

**Features:**
- **Automatic Disconnection**: Sessions disconnect after 2 minutes of inactivity
- **Visual Warning**: Warning banner appears 30 seconds before timeout
- **Countdown Timer**: Real-time countdown displayed in MM:SS format
- **Dismiss Action**: Clicking the dismiss button counts as activity and resets the timer
- **Activity Detection**: Any chat message or transcription resets the idle timer
- **Configurable Duration**: Timeout can be configured from 30 seconds to 60 minutes
- **Session Persistence**: Custom timeout preferences persist across browser sessions

**How It Works:**
1. Timer starts automatically when you connect to a voice session
2. Timer resets whenever you speak (transcription received) or send a chat message
3. Warning appears when 30 seconds remain before auto-disconnect
4. Clicking "Dismiss" on the warning resets the timer
5. Session disconnects automatically if timer reaches zero

**Accessibility:**
- Warning uses `role="alert"` and `aria-live="assertive"` for screen readers
- WCAG 2.1 AA compliant color contrast (7.46:1 ratio)
- Keyboard accessible dismiss button

**Configuration:**
The timeout duration can be customized via `IdleTimeoutService.updateConfig()`:
```typescript
// Example: Set 5-minute timeout with 60-second warning
idleTimeoutService.updateConfig({
  durationSeconds: 300,
  warningThresholdSeconds: 60,
  enabled: true
});
```

### Unified Conversation View

All conversation messages (both transcriptions and chat) appear in a single, chronological timeline:

**Features:**
- **Single Message Feed**: View all user speech and agent responses together
- **Visual Distinctions**: User messages right-aligned (blue), agent messages left-aligned (gray)
- **Delivery Badges**: Icons indicate if message was voice 🎤 or chat 💬
- **Auto-Scroll**: Automatically scrolls to latest message
- **Scroll Control**: Manual scrolling pauses auto-scroll; "scroll to bottom" button appears
- **Session Boundaries**: Visual separator shows where previous session ended and new one began
- **Persistent History**: Conversation saved to sessionStorage and restored on reconnect
- **Virtual Scrolling**: Activates automatically for conversations with 100+ messages
- **Clear History**: Optional button to clear all conversation history

**Performance:**
- Handles 500+ messages smoothly with virtual scrolling
- Message rendering latency: <500ms
- Efficient DOM updates using `trackBy` optimization

## Development

### Project Structure

```
src/
  app/
    components/          # UI components
      connection-button/ # Connect/disconnect button
      mode-toggle-button/ # Voice/Chat mode toggle
      unified-conversation-display/ # Unified message feed (NEW)
      conversation-message/ # Individual message display (NEW)
      transcription-display/ # DEPRECATED: Use unified-conversation-display
      chat-message-display/ # DEPRECATED: Use unified-conversation-display
      voice-chat/        # Main chat container
    models/              # TypeScript interfaces
      unified-conversation-message.model.ts # Unified message model (NEW)
      conversation-feed-state.model.ts      # Conversation state (NEW)
      chat-message.model.ts     # Chat message types
      response-mode.model.ts    # Response mode types
    services/            # Business logic
      livekit-connection.service.ts  # Connection management
      conversation-storage.service.ts # Unified message storage (NEW)
      response-mode.service.ts      # Mode toggle logic
      chat-storage.service.ts       # DEPRECATED: Use conversation-storage
      transcription.service.ts       # Transcription handling
      token.service.ts              # Backend API integration
    utils/               # Utility functions (NEW)
      message-merger.util.ts      # Message sorting/deduplication
      storage-migration.util.ts   # Legacy data migration
  environments/          # Environment configs
api/
  src/functions/         # Azure Functions
    generateToken.ts     # Token generation endpoint
tests/
  integration/           # Integration tests
  e2e/                  # End-to-end tests
```

### Development Commands

- `npm start` - Start dev server (http://localhost:4200)
- `npm test` - Run unit tests with Karma
- `npm run lint` - Run ESLint
- `ng build` - Build for production
- `ng build --configuration production` - Production build with optimization

### Architecture

- **Angular 20**: Standalone components with zoneless change detection
- **TypeScript 5.9**: Strict mode enabled
- **Angular Material 20**: UI components and theming
- **LiveKit Client SDK 2.x**: WebRTC voice communication
- **Angular Signals**: Reactive state management
- **RxJS 7.x**: Reactive programming for HTTP calls

## Configuration

### Authentication Setup

The application uses **Microsoft Entra External ID** for authentication. Follow these steps to configure:

#### 1. Create Microsoft Entra Application Registration

1. Go to [Azure Portal](https://portal.azure.com) → **Microsoft Entra ID** → **App registrations**
2. Click **New registration**:
   - Name: `Melior Agent` (or your preferred name)
   - Supported account types: **Accounts in this organizational directory only** (single tenant)
   - Redirect URI (SPA): `http://localhost:4200` (add production URL later)
3. Click **Register**
4. Note the **Application (client) ID** and **Directory (tenant) ID**

#### 2. Configure Authentication

In your app registration:
1. Go to **Authentication** → **Single-page application**
2. Add redirect URIs:
   - Development: `http://localhost:4200`
   - Production: Your deployed app URL
3. Under **Implicit grant and hybrid flows**, ensure **PKCE** is enabled (should be default)
4. Set **Logout URL**: `http://localhost:4200` (or your app URL)

#### 3. Configure Frontend Environment

Edit `src/environments/environment.development.ts`:

```typescript
export const environment = {
  production: false,
  tokenApiUrl: 'http://localhost:7071/api/generateToken',
  liveKitUrl: 'wss://your-livekit-server.livekit.cloud',
  auth: {
    clientId: 'YOUR_CLIENT_ID',  // From step 1
    tenantId: 'YOUR_TENANT_ID',  // From step 1
    authority: 'https://login.microsoftonline.com/YOUR_TENANT_ID',
    redirectUri: 'http://localhost:4200',
    scopes: ['openid', 'profile', 'email']
  }
};
```

For production (`src/environments/environment.ts`), update with production URLs.

#### 4. Configure Backend API

Edit `api/local.settings.json`:

```json
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AzureWebJobsStorage": "",
    "LIVEKIT_URL": "https://your-livekit-server.livekit.cloud",
    "LIVEKIT_API_KEY": "your-api-key",
    "LIVEKIT_API_SECRET": "your-api-secret",
    "ENTRA_TENANT_ID": "YOUR_TENANT_ID",
    "ENTRA_CLIENT_ID": "YOUR_CLIENT_ID",
    "ENTRA_AUTHORITY": "https://login.microsoftonline.com/YOUR_TENANT_ID"
  },
  "Host": {
    "CORS": "http://localhost:4200"
  }
}
```

#### 5. Test Authentication Flow

1. Start both backend and frontend
2. Navigate to `http://localhost:4200`
3. Click "Sign In" on the landing page
4. Sign in with a Microsoft account from your tenant
5. You'll be redirected back to the app as an authenticated user
6. Voice chat features will now be accessible

### Environment Variables

**Frontend** (`src/environments/environment.ts`):
- `tokenApiUrl`: Backend API endpoint for token generation
- `liveKitUrl`: LiveKit server WebSocket URL

**Backend** (`api/local.settings.json`):
- `LIVEKIT_URL`: LiveKit server URL
- `LIVEKIT_API_KEY`: Your LiveKit API key
- `LIVEKIT_API_SECRET`: Your LiveKit API secret

### Performance Budgets

The project enforces bundle size limits:
- **Warning**: 500KB
- **Error**: 1MB

## Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
npm test -- --include='tests/integration/**/*.spec.ts'
```

### E2E Tests

```bash
# Start dev server first
npm start

# In another terminal
npm run e2e
```

## Deployment

### Frontend (Angular)

```bash
ng build --configuration production
# Deploy dist/ to your static hosting (Azure Static Web Apps, Netlify, etc.)
```

### Backend (Azure Functions)

```bash
cd api
func azure functionapp publish <your-function-app-name>
```

## Troubleshooting

### Authentication Issues

**Issue**: "Sign in failed" or "Configuration error"
- **Solution**: Verify your Microsoft Entra app registration configuration:
  1. Check that **Client ID** and **Tenant ID** match in both frontend and backend configs
  2. Verify redirect URI is registered in Azure Portal (must be exact match including protocol and port)
  3. Ensure app registration has "Single-page application" platform configured
  4. Check browser console for specific MSAL error codes

**Issue**: "401 Unauthorized" when calling Azure Functions API
- **Solution**: Token validation failing on backend:
  1. Verify backend `ENTRA_CLIENT_ID` matches frontend configuration
  2. Check `ENTRA_AUTHORITY` includes correct tenant ID
  3. Ensure CORS is configured correctly in `api/local.settings.json`
  4. Check Azure Functions logs for token validation errors

**Issue**: Authentication redirect loop
- **Solution**:
  1. Clear browser cache and cookies
  2. Verify `postLogoutRedirectUri` in `app.config.ts` is correct
  3. Check that no MsalGuard is applied to the landing page route (should be public)

**Issue**: "Interaction in progress" - Cannot sign in or sign out
- **Solution**:
  1. Wait for current authentication flow to complete
  2. If stuck, clear browser local storage and session storage
  3. Restart the application

**Issue**: User signed in but name not displayed
- **Solution**: Token may be missing `name` claim:
  1. Check token claims in browser DevTools → Application → Session Storage → msal.*
  2. Update app registration to include `name` claim in token configuration
  3. User's profile may not have displayName set in Microsoft Entra

**Issue**: Multi-tab authentication not syncing
- **Solution**: MSAL uses BroadcastChannel for cross-tab sync:
  1. Ensure browser supports BroadcastChannel (modern browsers)
  2. Check browser console for MSAL broadcast service errors
  3. Try signing out and back in

### Common Issues

**Issue**: "Microphone permission denied"
- **Solution**: Grant microphone permissions in browser settings

**Issue**: "Failed to obtain access token"
- **Solution**: Verify backend API is running and credentials are correct

**Issue**: "Network connection lost"
- **Solution**: Check internet connection; app will auto-reconnect

**Issue**: No transcription appearing
- **Solution**: Ensure LiveKit agent has transcription enabled

### Debug Mode

Enable console logging by opening browser DevTools (F12). The app logs:
- Connection lifecycle events
- Transcription events
- Performance metrics

## Documentation

- [Voice Chat Transcription](specs/001-voice-chat-transcription/spec.md)
- [LiveKit Token API](specs/002-livekit-token-api/spec.md)
- [Voice/Chat Mode Toggle](specs/003-voice-chat-mode/spec.md)
- [Microsoft Entra External ID Authentication](specs/004-entra-external-id-auth/spec.md)
- [Implementation Plan](specs/001-voice-chat-transcription/plan.md)
- [Angular Best Practices](.github/copilot-instructions.md)
- [Security Policy](SECURITY.md) - **Important for contributors**

## Security

This is an open source project. Please review our [Security Policy](SECURITY.md) before contributing.

**Key security practices:**
- Never commit secrets, API keys, or real credentials to version control
- Use `.local.ts` files for development configuration (automatically git-ignored)
- Run `npm audit` regularly to check for dependency vulnerabilities
- Report security issues responsibly (see SECURITY.md)
- Follow secure coding practices outlined in our security documentation

**For development setup:**
1. Copy `src/environments/environment.development.local.ts.example` to `.local.ts`
2. Add your real credentials to the `.local.ts` file
3. The `.local.ts` file is git-ignored and will never be committed

See [SECURITY.md](SECURITY.md) for complete security guidelines.

## License

[Your License Here]

## Support

For issues and questions, please open a GitHub issue.

**Security vulnerabilities:** Please follow responsible disclosure practices outlined in [SECURITY.md](SECURITY.md).
