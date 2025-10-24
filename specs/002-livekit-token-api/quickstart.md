# Quick Start Guide: LiveKit Token Generation API

**Feature**: 002-livekit-token-api  
**Last Updated**: October 24, 2025

## Overview

This guide helps developers set up and test the LiveKit token generation API locally. The API runs as an Azure Functions application and generates JWT tokens for LiveKit voice chat sessions.

---

## Prerequisites

### Required Software
- **Node.js** 18.x LTS or higher ([Download](https://nodejs.org/))
- **Azure Functions Core Tools** v4 ([Installation Guide](https://learn.microsoft.com/azure/azure-functions/functions-run-local))
- **npm** or **yarn** (comes with Node.js)
- **Git** (for cloning the repository)

### Verify Installation
```bash
# Check Node.js version (should be 18.x or higher)
node --version

# Check Azure Functions Core Tools (should be 4.x)
func --version

# Check npm
npm --version
```

### LiveKit Credentials
You'll need LiveKit API credentials to generate tokens. You can obtain these by:

1. **Using LiveKit Cloud**: Sign up at [LiveKit Cloud](https://cloud.livekit.io/)
2. **Self-hosting LiveKit**: Follow the [LiveKit deployment guide](https://docs.livekit.io/realtime/self-hosting/deployment/)

After setup, you'll have:
- `LIVEKIT_API_KEY` (e.g., `APIxxxxxxxx`)
- `LIVEKIT_API_SECRET` (e.g., `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)

---

## Local Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd melior-agent
```

### 2. Install Dependencies

Navigate to the `api` folder and install dependencies:

```bash
cd api
npm install
```

This will install:
- `@azure/functions` - Azure Functions runtime
- `@livekit/server-sdk` - LiveKit token generation
- `zod` - Runtime validation
- Development dependencies (TypeScript, Jest, etc.)

### 3. Configure Environment Variables

Create a `local.settings.json` file in the `api/` folder:

```bash
# In the api/ directory
cp local.settings.json.example local.settings.json
```

Edit `local.settings.json` with your LiveKit credentials:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "LIVEKIT_API_KEY": "APIxxxxxxxx",
    "LIVEKIT_API_SECRET": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  },
  "Host": {
    "CORS": "http://localhost:4200",
    "CORSCredentials": false
  }
}
```

**Important**: `local.settings.json` is gitignored for security. Never commit this file!

### 4. Build the TypeScript Code

```bash
# In the api/ directory
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` folder.

### 5. Start the Azure Functions Runtime

```bash
# In the api/ directory
npm start
```

You should see output like:

```
Azure Functions Core Tools
Core Tools Version:       4.0.5455 Commit hash: N/A
Function Runtime Version: 4.27.0.21262

Functions:

        generateToken: [POST] http://localhost:7071/api/token

For detailed output, run func with --verbose flag.
```

The API is now running at `http://localhost:7071/api/token`!

---

## Testing the API

### Using cURL

**Generate Token (Basic Request)**:
```bash
curl -X POST http://localhost:7071/api/token \
  -H "Content-Type: application/json" \
  -d '{
    "roomName": "test-room-123",
    "participantIdentity": "user-abc-456"
  }'
```

**Expected Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2025-10-24T16:30:00Z",
  "roomName": "test-room-123",
  "participantIdentity": "user-abc-456"
}
```

**Generate Token (With Custom Expiration)**:
```bash
curl -X POST http://localhost:7071/api/token \
  -H "Content-Type: application/json" \
  -d '{
    "roomName": "test-room-123",
    "participantIdentity": "user-abc-456",
    "expirationSeconds": 7200,
    "participantName": "Dr. Smith"
  }'
```

**Test Validation (Invalid Room Name)**:
```bash
curl -X POST http://localhost:7071/api/token \
  -H "Content-Type: application/json" \
  -d '{
    "roomName": "test room@123",
    "participantIdentity": "user-abc-456"
  }'
```

**Expected Error Response**:
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
  "timestamp": "2025-10-24T15:30:00Z"
}
```

### Using Postman

1. Create a new POST request to `http://localhost:7071/api/token`
2. Set Headers:
   - `Content-Type: application/json`
3. Set Body (raw JSON):
   ```json
   {
     "roomName": "test-room-123",
     "participantIdentity": "user-abc-456"
   }
   ```
4. Click **Send**

### Using VS Code REST Client Extension

Create a file `test-requests.http`:

```http
### Generate Token - Basic Request
POST http://localhost:7071/api/token
Content-Type: application/json

{
  "roomName": "test-room-123",
  "participantIdentity": "user-abc-456"
}

### Generate Token - With Custom Expiration
POST http://localhost:7071/api/token
Content-Type: application/json

{
  "roomName": "test-room-123",
  "participantIdentity": "user-abc-456",
  "expirationSeconds": 7200,
  "participantName": "Dr. Smith"
}

### Test Validation - Invalid Room Name
POST http://localhost:7071/api/token
Content-Type: application/json

{
  "roomName": "invalid room name!",
  "participantIdentity": "user-abc-456"
}

### Test Validation - Missing Required Field
POST http://localhost:7071/api/token
Content-Type: application/json

{
  "roomName": "test-room-123"
}
```

Click "Send Request" above each request to test.

---

## Verifying Token Structure

To decode and verify the generated JWT token, use [jwt.io](https://jwt.io/):

1. Copy the `token` value from the API response
2. Paste it into the "Encoded" section at jwt.io
3. The decoded payload should look like:

```json
{
  "exp": 1729789800,
  "iss": "APIxxxxxxxx",
  "nbf": 1729786200,
  "sub": "user-abc-456",
  "video": {
    "room": "test-room-123",
    "roomJoin": true,
    "canPublish": true,
    "canSubscribe": true
  }
}
```

**Verify**:
- `sub` matches `participantIdentity`
- `video.room` matches `roomName`
- `video.canPublish` and `video.canSubscribe` are `true`
- `exp` is approximately 1 hour in the future (Unix timestamp)

---

## Running Tests

### Unit Tests

```bash
# In the api/ directory
npm test
```

This runs Jest tests for:
- `LiveKitTokenService` (token generation logic)
- Request validation with Zod schemas
- Error handling

### Integration Tests

```bash
# In the api/ directory
npm run test:integration
```

This tests the full HTTP endpoint with:
- Real LiveKit SDK (using test credentials)
- Full request/response cycle
- Validation and error scenarios

### Test Coverage

```bash
# In the api/ directory
npm run test:coverage
```

Aim for **>80% coverage** as required by the constitution.

---

## Development Workflow

### Watch Mode (Auto-recompile TypeScript)

```bash
# In the api/ directory, in a separate terminal
npm run watch
```

This watches TypeScript files and auto-compiles on changes.

### Hot Reload (Restart Functions on Code Changes)

The Azure Functions Core Tools automatically reload when files in `dist/` change. Combine with watch mode:

**Terminal 1** (Watch TypeScript):
```bash
npm run watch
```

**Terminal 2** (Run Functions):
```bash
npm start
```

Now code changes auto-rebuild and reload!

### Linting

```bash
# In the api/ directory
npm run lint
```

Fix linting errors automatically:
```bash
npm run lint:fix
```

---

## Troubleshooting

### Error: "LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be configured"

**Cause**: Missing environment variables in `local.settings.json`

**Fix**: 
1. Ensure `local.settings.json` exists in `api/`
2. Verify `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` are set
3. Restart the Azure Functions runtime

### Error: "Cannot find module '@azure/functions'"

**Cause**: Dependencies not installed

**Fix**:
```bash
cd api
npm install
```

### Error: "Port 7071 is already in use"

**Cause**: Another Azure Functions instance is running

**Fix**:
```bash
# Kill the existing process
Get-Process -Name func | Stop-Process -Force

# Or specify a different port
func start --port 7072
```

### CORS Errors from Frontend

**Cause**: CORS not configured for frontend origin

**Fix**: Update `local.settings.json`:
```json
{
  "Host": {
    "CORS": "http://localhost:4200",
    "CORSCredentials": false
  }
}
```

### Token Validation Fails at jwt.io

**Cause**: Incorrect API secret or key

**Fix**: 
1. Verify credentials match your LiveKit dashboard/deployment
2. Ensure no extra whitespace in `local.settings.json`
3. Try regenerating credentials in LiveKit dashboard

---

## Frontend Integration

Once the API is running, update the Angular frontend to call the token endpoint:

```typescript
// In your Angular service
async getToken(roomName: string, participantIdentity: string): Promise<string> {
  const response = await fetch('http://localhost:7071/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomName, participantIdentity })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
  
  const data = await response.json();
  return data.token;
}
```

See the main project README for full frontend integration details.

---

## Next Steps

- **Implement the API**: Follow `tasks.md` for TDD implementation steps
- **Deploy to Azure**: See deployment guide for production setup
- **Add Authentication**: Secure the endpoint with Azure AD or API keys
- **Monitor Performance**: Configure Application Insights in Azure

---

## Useful Links

- [Azure Functions TypeScript Guide](https://learn.microsoft.com/azure/azure-functions/functions-reference-node)
- [LiveKit Server SDK Docs](https://docs.livekit.io/realtime/server/generating-tokens/)
- [OpenAPI Specification](./contracts/token-api.openapi.yaml)
- [Data Model Documentation](./data-model.md)
- [Feature Specification](./spec.md)

---

## Support

For issues or questions:
1. Check the [troubleshooting section](#troubleshooting) above
2. Review the [data model](./data-model.md) and [OpenAPI spec](./contracts/token-api.openapi.yaml)
3. Consult the [feature specification](./spec.md) for requirements
4. Open an issue in the project repository
