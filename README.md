# MeliorAgent

Voice chat transcription application built with Angular 20, LiveKit, and Azure Functions.

## Features

- 🎤 **Voice Chat**: Connect to LiveKit voice agent for real-time conversation
- 📝 **Live Transcription**: Real-time transcription of both user and agent speech
- 🔄 **Auto-Reconnection**: Automatic reconnection with exponential backoff on network interruptions
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
4. Start speaking - your speech will be transcribed in real-time
5. The AI agent will respond, and responses will also be transcribed
6. Click "Disconnect" when finished

## Development

### Project Structure

```
src/
  app/
    components/          # UI components
      connection-button/ # Connect/disconnect button
      transcription-display/ # Transcription list view
      voice-chat/        # Main chat container
    models/              # TypeScript interfaces
    services/            # Business logic
      livekit-connection.service.ts  # Connection management
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

- [Feature Specification](specs/001-voice-chat-transcription/spec.md)
- [Implementation Plan](specs/001-voice-chat-transcription/plan.md)
- [API Documentation](specs/002-livekit-token-api/spec.md)
- [Angular Best Practices](.github/copilot-instructions.md)

## License

[Your License Here]

## Support

For issues and questions, please open a GitHub issue.
