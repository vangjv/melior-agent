# Adding Transcription to Your LiveKit Agent

## Problem
Your LiveKit Agent processes speech but doesn't send transcriptions to connected clients.

## Solution
Modify your `agent.ts` to listen for transcription events and publish them to the room.

## Updated Agent Code

Replace your current agent code with this version that includes transcription publishing:

```typescript
import {
  type JobContext,
  type JobProcess,
  WorkerOptions,
  cli,
  defineAgent,
  metrics,
  voice,
} from '@livekit/agents';
import * as livekit from '@livekit/agents-plugin-livekit';
import * as openai from '@livekit/agents-plugin-openai';
import * as silero from '@livekit/agents-plugin-silero';
import { BackgroundVoiceCancellation } from '@livekit/noise-cancellation-node';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: '.env.local' });

class Assistant extends voice.Agent {
  constructor() {
    super({
      instructions: `You are a helpful voice AI assistant. The user is interacting with you via voice, even if you perceive the conversation as text.
      You eagerly assist users with their questions by providing information from your extensive knowledge.
      Your responses are concise, to the point, and without any complex formatting or punctuation including emojis, asterisks, or other symbols.
      You are curious, friendly, and have a sense of humor.`,
    });
  }
}

export default defineAgent({
  prewarm: async (proc: JobProcess) => {
    proc.userData.vad = await silero.VAD.load();
  },
  entry: async (ctx: JobContext) => {
    const lettaAgentId =
      process.env.LETTA_AGENT_ID || 'agent-3bb1869b-b66c-4565-ae62-8817237c6d02';
    const lettaClient = new openai.LLM({
      baseURL: `https://api.letta.com/v1`,
      apiKey:
        process.env.LETTA_API_KEY ||
        'YTNhNWFkZmQtYTNkMi00NGRiLTgyNWUtOWJhNDA4ZTIxZjQ2OjUxYjEzZDQ4LTRlOWItNDhjNi1hZDA5LWRiOWM0ZDJhMjhmMA==',
      model: lettaAgentId,
    });

    const session = new voice.AgentSession({
      stt: 'assemblyai/universal-streaming:en',
      llm: lettaClient,
      tts: 'cartesia/sonic-2:9626c31c-bec5-4cca-baa8-f8ba9e84c8bc',
      turnDetection: new livekit.turnDetector.MultilingualModel(),
      vad: ctx.proc.userData.vad! as silero.VAD,
    });

    // ===== ADD THIS SECTION: Transcription Publishing =====
    
    // Listen for user speech transcriptions (STT output)
    session.on(voice.AgentSessionEventTypes.UserSpeechCommitted, (ev) => {
      console.log('User said:', ev.alternatives[0]?.text);
      
      // Publish user's transcription to the room
      const transcriptionData = JSON.stringify({
        type: 'transcription',
        speaker: 'user',
        text: ev.alternatives[0]?.text || '',
        isFinal: true,
        timestamp: Date.now(),
      });
      
      ctx.room.localParticipant.publishData(
        Buffer.from(transcriptionData, 'utf-8'),
        { topic: 'transcription', reliable: true }
      );
    });

    // Listen for agent speech (before TTS)
    session.on(voice.AgentSessionEventTypes.AgentSpeechCommitted, (ev) => {
      console.log('Agent said:', ev.text);
      
      // Publish agent's transcription to the room
      const transcriptionData = JSON.stringify({
        type: 'transcription',
        speaker: 'agent',
        text: ev.text || '',
        isFinal: true,
        timestamp: Date.now(),
      });
      
      ctx.room.localParticipant.publishData(
        Buffer.from(transcriptionData, 'utf-8'),
        { topic: 'transcription', reliable: true }
      );
    });

    // Optional: Listen for interim (partial) transcriptions
    session.on(voice.AgentSessionEventTypes.UserTranscription, (ev) => {
      if (!ev.isFinal) {
        console.log('User speaking (interim):', ev.alternatives[0]?.text);
        
        // Publish interim transcription
        const transcriptionData = JSON.stringify({
          type: 'transcription',
          speaker: 'user',
          text: ev.alternatives[0]?.text || '',
          isFinal: false,
          timestamp: Date.now(),
        });
        
        ctx.room.localParticipant.publishData(
          Buffer.from(transcriptionData, 'utf-8'),
          { topic: 'transcription', reliable: false }
        );
      }
    });
    
    // ===== END TRANSCRIPTION SECTION =====

    // Metrics collection
    const usageCollector = new metrics.UsageCollector();
    session.on(voice.AgentSessionEventTypes.MetricsCollected, (ev) => {
      metrics.logMetrics(ev.metrics);
      usageCollector.collect(ev.metrics);
    });

    const logUsage = async () => {
      const summary = usageCollector.getSummary();
      console.log(`Usage: ${JSON.stringify(summary)}`);
    };

    ctx.addShutdownCallback(logUsage);

    await session.start({
      agent: new Assistant(),
      room: ctx.room,
      inputOptions: {
        noiseCancellation: BackgroundVoiceCancellation(),
      },
    });

    await ctx.connect();
  },
});

cli.runApp(new WorkerOptions({ agent: fileURLToPath(import.meta.url) }));
```

## Key Changes

### 1. User Speech Transcriptions
```typescript
session.on(voice.AgentSessionEventTypes.UserSpeechCommitted, (ev) => {
  // Sends finalized user speech to the Angular app
});
```

### 2. Agent Speech Transcriptions
```typescript
session.on(voice.AgentSessionEventTypes.AgentSpeechCommitted, (ev) => {
  // Sends agent's responses to the Angular app
});
```

### 3. Optional: Interim Transcriptions
```typescript
session.on(voice.AgentSessionEventTypes.UserTranscription, (ev) => {
  // Sends real-time partial transcriptions as user speaks
});
```

## Data Format

The agent publishes transcriptions in this JSON format that your Angular app expects:

```json
{
  "type": "transcription",
  "speaker": "user" | "agent",
  "text": "transcribed text",
  "isFinal": true | false,
  "timestamp": 1234567890
}
```

## Testing

1. **Update your agent code** with the changes above
2. **Restart your agent** server
3. **Reload your Angular app** and connect
4. **Speak into your microphone** - you should now see transcriptions appear!

## Console Logs to Expect

In your agent console:
```
User said: Hello, how are you?
Agent said: I'm doing great, thanks for asking!
```

In your Angular app console:
```
📨 Data received from: agent-xxx topic: transcription
📨 Parsed JSON data: { type: 'transcription', speaker: 'user', text: 'Hello, how are you?', ... }
✅ Processing transcription data
```

## Troubleshooting

- **No data received**: Make sure agent is restarted after code changes
- **Wrong format**: Check agent console for transcription data being published
- **Missing events**: Verify LiveKit Agents version supports these event types
- **Empty text**: Check STT (AssemblyAI) is working correctly

## Next Steps

Once transcriptions are flowing, you can:
- Add visual indicators for interim vs final transcriptions
- Implement speaker diarization if multiple users
- Add transcription export functionality
- Store conversation history
