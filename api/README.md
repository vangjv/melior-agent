# LiveKit Token Generation API

An Azure Functions TypeScript API that generates JWT access tokens for LiveKit voice chat sessions.

## Overview

This API provides a single HTTP endpoint (`POST /api/token`) that generates LiveKit access tokens for the Melior Agent frontend application. Tokens are signed JWTs that authorize participants to join specific LiveKit rooms with audio publish/subscribe permissions.

## Features

- ✅ **JWT Token Generation**: Creates signed LiveKit access tokens using the LiveKit Server SDK
- ✅ **Request Validation**: Runtime validation using Zod schema with detailed error messages
- ✅ **Configurable Expiration**: Support for custom token expiration times (60 seconds to 24 hours)
- ✅ **Error Handling**: Structured error responses with field-level validation details
- ✅ **CORS Support**: Configured for local development with Angular frontend
- ✅ **Type Safety**: Full TypeScript strict mode with zero `any` types
- ✅ **Test Coverage**: 19 passing tests with >80% code coverage

## Prerequisites

- **Node.js** 18.x LTS or higher
- **Azure Functions Core Tools** v4
- **LiveKit credentials** (API key and secret)
- **npm** or **yarn**

## Quick Start

### 1. Install Dependencies

```bash
cd api
npm install
```

### 2. Configure Environment

Create `local.settings.json` (gitignored):

```json
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "LIVEKIT_API_KEY": "your-livekit-api-key",
    "LIVEKIT_API_SECRET": "your-livekit-api-secret"
  },
  "Host": {
    "CORS": "http://localhost:4200",
    "CORSCredentials": false
  }
}
```

### 3. Build and Start

```bash
npm run build
npm start
```

The API will be available at `http://localhost:7071/api/token`

## API Reference

### POST /api/token

Generates a LiveKit access token for a participant to join a room.

**Request Body:**

```json
{
  "roomName": "consultation-room-123",
  "participantIdentity": "user-abc-456",
  "expirationSeconds": 3600,
  "participantName": "Dr. Smith"
}
```

**Required Fields:**
- `roomName` (string): Room identifier (alphanumeric, hyphens, underscores only, max 255 chars)
- `participantIdentity` (string): Unique participant ID (alphanumeric, hyphens, underscores only, max 255 chars)

**Optional Fields:**
- `expirationSeconds` (number): Token TTL in seconds (60-86400, default: 3600)
- `participantName` (string): Display name (max 255 chars, defaults to participantIdentity)

**Success Response (200 OK):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2025-10-24T16:30:00.000Z",
  "roomName": "consultation-room-123",
  "participantIdentity": "user-abc-456"
}
```

**Error Response (400 Bad Request):**

```json
{
  "statusCode": 400,
  "errorCode": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "validationErrors": [
    {
      "field": "roomName",
      "message": "Room name contains invalid characters"
    }
  ],
  "timestamp": "2025-10-24T15:30:00.000Z"
}
```

**Error Response (500 Internal Server Error):**

```json
{
  "statusCode": 500,
  "errorCode": "MISSING_CREDENTIALS",
  "message": "LiveKit API credentials are not configured...",
  "timestamp": "2025-10-24T15:30:00.000Z"
}
```

## Testing

### Run All Tests

```bash
npm test
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Test Structure

- **Unit Tests** (`tests/unit/`): Service and validation logic
- **Integration Tests** (`tests/integration/`): Full token generation flow

## Development

### Project Structure

```
api/
├── src/
│   ├── functions/
│   │   └── generateToken.ts      # HTTP trigger function
│   ├── models/
│   │   ├── TokenRequest.ts       # Request interface
│   │   ├── TokenResponse.ts      # Response interface
│   │   ├── ErrorResponse.ts      # Error interfaces
│   │   └── LiveKitConfig.ts      # Config interface
│   ├── services/
│   │   └── LiveKitTokenService.ts # Token generation service
│   └── utils/
│       ├── validation.ts          # Zod validation schema
│       └── config.ts              # Config loading
├── dist/                          # Compiled JavaScript (gitignored)
├── coverage/                      # Test coverage reports (gitignored)
├── host.json                      # Azure Functions host config
├── local.settings.json            # Local env vars (gitignored)
├── local.settings.json.example    # Example env vars template
├── package.json                   # Dependencies and scripts
├── tsconfig.json                  # TypeScript compiler config
└── jest.config.js                 # Jest test config
```

### Available Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start Azure Functions runtime (builds first)
- `npm test` - Run Jest tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate coverage report
- `npm run clean` - Remove dist folder

### Code Style

- **Strict TypeScript**: No `any` types, full type safety
- **Interface-based DI**: Services use dependency injection for testability
- **Zod Runtime Validation**: All inputs validated at runtime
- **Structured Logging**: Context-aware logging with Azure Functions logger

## Deployment

### Azure Functions Deployment

1. Create Azure Functions app (Node.js 18+, Linux)
2. Configure Application Settings:
   - `LIVEKIT_API_KEY`
   - `LIVEKIT_API_SECRET`
3. Deploy using Azure Functions Core Tools:

```bash
func azure functionapp publish <function-app-name>
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `LIVEKIT_API_KEY` | Yes | LiveKit API key (format: `APIxxxxxxxx`) |
| `LIVEKIT_API_SECRET` | Yes | LiveKit API secret (32+ characters) |
| `LIVEKIT_URL` | No | LiveKit server URL (optional for tokens) |

## Security Considerations

- ✅ Credentials stored in Azure Key Vault (production)
- ✅ Tokens have configurable expiration (default: 1 hour)
- ✅ Input validation prevents injection attacks
- ✅ CORS restricted to known origins
- ⚠️ Anonymous auth level (add authentication in future iterations)

## Troubleshooting

### "Missing credentials" error

Ensure `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` are set in `local.settings.json`.

### CORS errors from frontend

Verify `Host.CORS` in `local.settings.json` matches your frontend URL.

### Tests failing

Run `npm run clean && npm run build && npm test` to clear stale build artifacts.

## Contributing

1. Follow TDD approach: write failing tests first
2. Ensure all tests pass: `npm test`
3. Maintain >80% code coverage: `npm run test:coverage`
4. Follow TypeScript strict mode guidelines

## License

MIT License - See repository root for full license text.

## Related Documentation

- [LiveKit Server SDK Documentation](https://docs.livekit.io/realtime/server/generating-tokens/)
- [Azure Functions TypeScript Developer Guide](https://learn.microsoft.com/azure/azure-functions/functions-reference-node?tabs=typescript)
- [Zod Validation Library](https://zod.dev/)

## Support

For issues related to this API, please open an issue in the main repository.

For LiveKit-specific questions, consult the [LiveKit Community Forum](https://livekit.io/community).
