/**
 * Response Mode Model
 * Type definitions for voice/chat response mode toggle feature
 */

/**
 * Agent response delivery mode
 * - voice: Agent responds with synthesized speech (TTS)
 * - chat: Agent responds with text messages via data channel
 */
export type ResponseMode = 'voice' | 'chat';

/**
 * Default response mode
 */
export const DEFAULT_RESPONSE_MODE: ResponseMode = 'voice';

/**
 * Type guard for ResponseMode
 */
export function isValidResponseMode(value: unknown): value is ResponseMode {
  return value === 'voice' || value === 'chat';
}

/**
 * Base interface for all data channel messages
 * Uses discriminated union pattern for type-safe message handling
 */
export interface BaseDataChannelMessage {
  readonly type: string;
}

/**
 * Request to change agent response mode
 * Sent from frontend to agent via data channel
 */
export interface SetResponseModeMessage extends BaseDataChannelMessage {
  readonly type: 'set_response_mode';
  readonly mode: ResponseMode;
}

/**
 * Confirmation that agent has changed response mode
 * Sent from agent to frontend via data channel
 */
export interface ResponseModeUpdatedMessage extends BaseDataChannelMessage {
  readonly type: 'response_mode_updated';
  readonly mode: ResponseMode;
}

/**
 * Chat message from agent in chat mode
 * Contains the agent's text response
 */
export interface AgentChatMessage extends BaseDataChannelMessage {
  readonly type: 'chat_message';
  readonly message: string;
  readonly timestamp: number; // Unix timestamp in milliseconds
}

/**
 * Streaming chat chunk from agent in chat mode
 * Contains partial text that should be appended to the current message
 */
export interface AgentChatChunk extends BaseDataChannelMessage {
  readonly type: 'chat_chunk';
  readonly messageId: string;   // Unique ID to identify which message this chunk belongs to
  readonly chunk: string;        // Partial text to append
  readonly isComplete: boolean;  // True if this is the final chunk
  readonly timestamp: number;    // Unix timestamp in milliseconds
}

/**
 * Union of all messages that can be sent to agent
 */
export type OutgoingDataChannelMessage = SetResponseModeMessage;

/**
 * Union of all messages that can be received from agent
 */
export type IncomingDataChannelMessage = ResponseModeUpdatedMessage | AgentChatMessage | AgentChatChunk;

/**
 * Union of all data channel messages
 */
export type DataChannelMessage = OutgoingDataChannelMessage | IncomingDataChannelMessage;

/**
 * Factory function for creating mode change requests
 */
export function createSetResponseModeMessage(mode: ResponseMode): SetResponseModeMessage {
  return {
    type: 'set_response_mode',
    mode,
  };
}

/**
 * Type guard for incoming messages
 */
export function isIncomingMessage(data: unknown): data is IncomingDataChannelMessage {
  if (!data || typeof data !== 'object') return false;

  const message = data as BaseDataChannelMessage;
  return message.type === 'response_mode_updated' ||
         message.type === 'chat_message' ||
         message.type === 'chat_chunk';
}

/**
 * Validates ResponseModeUpdatedMessage structure
 */
export function isResponseModeUpdatedMessage(
  message: BaseDataChannelMessage
): message is ResponseModeUpdatedMessage {
  return (
    message.type === 'response_mode_updated' &&
    'mode' in message &&
    isValidResponseMode((message as ResponseModeUpdatedMessage).mode)
  );
}

/**
 * Validates AgentChatMessage structure
 */
export function isAgentChatMessage(
  message: BaseDataChannelMessage
): message is AgentChatMessage {
  const chatMsg = message as AgentChatMessage;
  return (
    message.type === 'chat_message' &&
    typeof chatMsg.message === 'string' &&
    typeof chatMsg.timestamp === 'number'
  );
}

/**
 * Validates AgentChatChunk structure
 */
export function isAgentChatChunk(
  message: BaseDataChannelMessage
): message is AgentChatChunk {
  const chunk = message as AgentChatChunk;
  return (
    message.type === 'chat_chunk' &&
    typeof chunk.messageId === 'string' &&
    typeof chunk.chunk === 'string' &&
    typeof chunk.isComplete === 'boolean' &&
    typeof chunk.timestamp === 'number'
  );
}
