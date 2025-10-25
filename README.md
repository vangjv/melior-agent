# MeliorAgent

Voice chat transcription application built with Angular 20, LiveKit, and Azure Functions.

## Features

- 🎤 **Voice Chat**: Connect to LiveKit voice agent for real-time conversation
- 📝 **Live Transcription**: Real-time transcription of both user and agent speech
- � **Chat Mode Toggle**: Switch between voice and text-based chat responses
- �🔄 **Auto-Reconnection**: Automatic reconnection with exponential backoff on network interruptions
- 📱 **Mobile-First**: Responsive design optimized for mobile devices
- ♿ **Accessible**: WCAG 2.1 AA compliant with screen reader support
- 🔒 **Secure**: Token-based authentication via Azure Functions backend

## Quick Start

### Prerequisites

- **Node.js**: v20.x or later
- **npm**: v10.x or later
- **Angular CLI**: v20.x (`npm install -g @angular/cli`)
- **LiveKit Account**: Sign up at https://cloud.livekit.io

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
   # Edit with your LiveKit URL
   ```

4. **Start the backend API**:
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

## Development

### Project Structure

```
src/
  app/
    components/          # UI components
      connection-button/ # Connect/disconnect button
      mode-toggle-button/ # Voice/Chat mode toggle (NEW)
      chat-message-display/ # Chat message list (NEW)
      transcription-display/ # Transcription list view
      voice-chat/        # Main chat container
    models/              # TypeScript interfaces
      chat-message.model.ts     # Chat message types (NEW)
      response-mode.model.ts    # Response mode types (NEW)
    services/            # Business logic
      livekit-connection.service.ts  # Connection management
      response-mode.service.ts      # Mode toggle logic (NEW)
      chat-storage.service.ts       # Chat history (NEW)
      transcription.service.ts       # Transcription handling
      token.service.ts              # Backend API integration
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
- [Voice/Chat Mode Toggle](specs/003-voice-chat-mode/spec.md) **NEW**
- [Implementation Plan](specs/001-voice-chat-transcription/plan.md)
- [Angular Best Practices](.github/copilot-instructions.md)

## License

[Your License Here]

## Support

For issues and questions, please open a GitHub issue.
