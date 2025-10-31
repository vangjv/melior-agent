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

// Type definition for response modes
type ResponseMode = 'voice' | 'chat';

class Assistant extends voice.Agent {
  constructor() {
    super({
      instructions: `You are a helpful voice AI assistant. The user is interacting with you via voice, even if you perceive the conversation as text.
      You eagerly assist users with their questions by providing information from your extensive knowledge.
      Your responses are concise, to the point, and without any complex formatting or punctuation including emojis, asterisks, or other symbols.
      You are curious, friendly, and have a sense of humor.`,

      // To add tools, specify `tools` in the constructor.
      // Here's an example that adds a simple weather tool.
      // You also have to add `import { llm } from '@livekit/agents' and `import { z } from 'zod'` to the top of this file
      // tools: {
      //   getWeather: llm.tool({
      //     description: `Use this tool to look up current weather information in the given location.
      //
      //     If the location is not supported by the weather service, the tool will indicate this. You must tell the user the location's weather is unavailable.`,
      //     parameters: z.object({
      //       location: z
      //         .string()
      //         .describe('The location to look up weather information for (e.g. city name)'),
      //     }),
      //     execute: async ({ location }) => {
      //       console.log(`Looking up weather for ${location}`);
      //
      //       return 'sunny with a temperature of 70 degrees.';
      //     },
      //   }),
      // },
    });
  }
}

export default defineAgent({
  prewarm: async (proc: JobProcess) => {
    proc.userData.vad = await silero.VAD.load();
  },
  entry: async (ctx: JobContext) => {
    // Create a custom OpenAI client configured for Letta
    // The agent ID is embedded in the URL, and streaming is enabled via the /stream endpoint
    const lettaAgentId = 'agent-db1ddcf1-82f9-4e5e-9e20-5369826bf7e0'
      //process.env.LETTA_AGENT_ID || 'agent-3bb1869b-b66c-4565-ae62-8817237c6d02';
    const lettaClient = new openai.LLM({
      //baseURL: `https://api.letta.com/v1/agents/${lettaAgentId}/messages`,
      baseURL: `https://api.letta.com/v1`,
      apiKey: process.env.LETTA_API_KEY,
      model: lettaAgentId, // This can be any string since Letta uses the agent ID in the URL
    });

    // Set up a voice AI pipeline using Letta, Cartesia, AssemblyAI, and the LiveKit turn detector
    const session = new voice.AgentSession({
      // Speech-to-text (STT) is your agent's ears, turning the user's speech into text that the LLM can understand
      // See all available models at https://docs.livekit.io/agents/models/stt/
      stt: 'assemblyai/universal-streaming:en',

      // Use the custom Letta LLM
      llm: lettaClient,

      // Text-to-speech (TTS) is your agent's voice, turning the LLM's text into speech that the user can hear
      // See all available models as well as voice selections at https://docs.livekit.io/agents/models/tts/
      tts: 'cartesia/sonic-2:9626c31c-bec5-4cca-baa8-f8ba9e84c8bc',

      // VAD and turn detection are used to determine when the user is speaking and when the agent should respond
      // See more at https://docs.livekit.io/agents/build/turns
      turnDetection: new livekit.turnDetector.MultilingualModel(),
      vad: ctx.proc.userData.vad! as silero.VAD,
    });

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

    // Track response mode (default is 'voice')
    let responseMode: ResponseMode = 'voice';

    // Listen for data channel messages from the frontend
    ctx.room.on('dataReceived', async (payload: Uint8Array) => {
      try {
        const decoder = new TextDecoder();
        const messageText = decoder.decode(payload);
        const message = JSON.parse(messageText);

        // Handle set_response_mode message
        if (message.type === 'set_response_mode') {
          const newMode = message.mode as ResponseMode;

          if (newMode === 'voice' || newMode === 'chat') {
            responseMode = newMode;
            console.log(`Response mode changed to: ${responseMode}`);

            // Send confirmation back to frontend
            const confirmation = JSON.stringify({
              type: 'response_mode_updated',
              mode: responseMode,
            });
            const encoder = new TextEncoder();
            const confirmationPayload = encoder.encode(confirmation);

            await ctx.room.localParticipant?.publishData(confirmationPayload, {
              reliable: true,
            });
          }
        }

        // Handle text_message from user (Feature 007-text-chat-input)
        if (message.type === 'text_message') {
          const textContent = message.content as string;
          const messageId = message.messageId as string;
          
          console.log(`📨 Received text message: "${textContent}" (ID: ${messageId})`);

          // Inject the text message directly into the conversation session
          // This bypasses VAD/STT pipeline for instant, accurate text input
          session.conversation.item.create({
            type: 'message',
            role: 'user',
            content: [{ type: 'input_text', text: textContent }],
          });

          // Optional: Send acknowledgment back to frontend
          const ack = JSON.stringify({
            type: 'text_message_ack',
            messageId: messageId,
            received: true,
            timestamp: Date.now(),
          });
          const encoder = new TextEncoder();
          const ackPayload = encoder.encode(ack);

          await ctx.room.localParticipant?.publishData(ackPayload, {
            reliable: true,
          });

          console.log(`✅ Text message injected into conversation (ID: ${messageId})`);
        }
      } catch (error) {
        console.error('Error processing data channel message:', error);
      }
    });

    // Track current message ID for chat chunks and abort controller
    let currentChatMessageId = '';
    let currentStreamAbortController: AbortController | null = null;

    // Listen for user state changes to detect interruptions
    session.on(voice.AgentSessionEventTypes.UserStateChanged, (ev) => {
      // If user starts speaking while we're streaming a chat response, abort it
      if (ev.newState === 'speaking' && responseMode === 'chat' && currentStreamAbortController) {
        currentStreamAbortController.abort();
        console.log('🛑 User interrupted - aborting chat stream');
      }
    });

    //Listen for conversation items being added
    session.on(voice.AgentSessionEventTypes.ConversationItemAdded, async (ev) => {
      if (responseMode === 'chat') {
        const item = ev.item;

        // Check if it's a user message
        if (item.role === 'user' && item.type === 'message') {
          const messageText = item.content
            .filter((c): c is string => typeof c === 'string')
            .join('')
            .trim();

          if (messageText) {
            // Cancel any ongoing stream from previous message
            if (currentStreamAbortController) {
              currentStreamAbortController.abort();
              console.log('🛑 Aborted previous stream due to new user message');
            }

            // Generate a new message ID for this conversation turn
            currentChatMessageId = `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            currentStreamAbortController = new AbortController();

            // const chatMessage = JSON.stringify({
            //   type: 'chat_message',
            //   message: messageText,
            //   timestamp: Date.now(),
            // });

            // const encoder = new TextEncoder();
            // const messagePayload = encoder.encode(chatMessage);

            // await ctx.room.localParticipant?.publishData(messagePayload, {
            //   reliable: true,
            // });

            console.log(`✅ Chat message sent: "${messageText}"`);

            // Make direct request to Letta API to get streaming response
            try {
              const response = await fetch('https://api.letta.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${process.env.LETTA_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  agent_id: lettaAgentId,
                  model: lettaAgentId,
                  messages: [
                    { role: 'user', content: messageText }
                  ],
                  stream: true
                }),
                signal: currentStreamAbortController.signal
              });

              if (!response.ok) {
                throw new Error(`Letta API error: ${response.status}`);
              }

              const reader = response.body?.getReader();
              const decoder = new TextDecoder();

              if (!reader) {
                throw new Error('Response body is not readable');
              }

              let buffer = '';

              while (true) {
                const { done, value } = await reader.read();

                if (done) {
                  // Send final chunk
                  const finalChunk = JSON.stringify({
                    type: 'chat_chunk',
                    messageId: currentChatMessageId,
                    chunk: '',
                    isComplete: true,
                    timestamp: Date.now(),
                  });

                  const encoder = new TextEncoder();
                  await ctx.room.localParticipant?.publishData(encoder.encode(finalChunk), {
                    reliable: true,
                  });

                  console.log(`✅ Chat streaming complete for ${currentChatMessageId}`);
                  currentStreamAbortController = null;
                  break;
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                  const trimmedLine = line.trim();

                  if (trimmedLine === '' || trimmedLine === 'data: [DONE]') {
                    continue;
                  }

                  if (trimmedLine.startsWith('data: ')) {
                    try {
                      const jsonData = JSON.parse(trimmedLine.substring(6));

                      if (jsonData.choices?.[0]?.delta?.content) {
                        const chunkText = jsonData.choices[0].delta.content;

                        const chatChunk = JSON.stringify({
                          type: 'chat_chunk',
                          messageId: currentChatMessageId,
                          chunk: chunkText,
                          isComplete: false,
                          timestamp: Date.now(),
                        });

                        const encoder = new TextEncoder();
                        await ctx.room.localParticipant?.publishData(encoder.encode(chatChunk), {
                          reliable: true,
                        });

                        console.log(`📤 Sent chunk: "${chunkText}"`);
                      }
                    } catch (parseError) {
                      console.error('Error parsing SSE chunk:', parseError);
                    }
                  }
                }
              }
            } catch (error) {
              // Check if error is due to abort
              if (error instanceof Error && error.name === 'AbortError') {
                console.log('⚠️ Stream aborted by user interruption');

                // Send interrupted completion chunk
                const interruptedChunk = JSON.stringify({
                  type: 'chat_chunk',
                  messageId: currentChatMessageId,
                  chunk: '',
                  isComplete: true,
                  timestamp: Date.now(),
                });

                const encoder = new TextEncoder();
                await ctx.room.localParticipant?.publishData(encoder.encode(interruptedChunk), {
                  reliable: true,
                });
              } else {
                console.error('Error streaming from Letta:', error);

                // Send error as final chunk
                const errorChunk = JSON.stringify({
                  type: 'chat_chunk',
                  messageId: currentChatMessageId,
                  chunk: '',
                  isComplete: true,
                  timestamp: Date.now(),
                });

                const encoder = new TextEncoder();
                await ctx.room.localParticipant?.publishData(encoder.encode(errorChunk), {
                  reliable: true,
                });
              }

              currentStreamAbortController = null;
            }
          }
        }
      }
    });

    // Listen for agent speech to handle chat mode
    session.on(voice.AgentSessionEventTypes.SpeechCreated, async (ev) => {
      if (responseMode === 'chat' && ev.speechHandle) {
        // Just interrupt, don't extract text here
        ev.speechHandle.interrupt();
        console.log('🔇 Interrupted speech for chat mode');
      }
    });

    // Start the session, which initializes the voice pipeline and warms up the models
    await session.start({
      agent: new Assistant(),
      room: ctx.room,
      inputOptions: {
        // LiveKit Cloud enhanced noise cancellation
        // - If self-hosting, omit this parameter
        // - For telephony applications, use `BackgroundVoiceCancellationTelephony` for best results
        noiseCancellation: BackgroundVoiceCancellation(),
      },
    });

    // Join the room and connect to the user
    await ctx.connect();
  },
});

cli.runApp(new WorkerOptions({ agent: fileURLToPath(import.meta.url) }));
```
