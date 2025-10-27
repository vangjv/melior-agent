/**
 * Message Metadata Interface
 * Feature: 005-unified-conversation
 * 
 * Defines optional extended metadata for debugging and analytics
 */

/**
 * Message source type - where the message originated
 */
export type MessageSource = 
  | 'livekit-transcription'   // From LiveKit transcription track
  | 'livekit-data-channel'    // From LiveKit data channel
  | 'local-echo'              // Local user input echo
  | 'storage-restored';       // Restored from sessionStorage

/**
 * Extended message metadata for debugging/analytics
 * Not required for MVP but structured for future use
 */
export interface MessageMetadata {
  readonly messageSource: MessageSource;     // Where message originated
  readonly deliveryLatency?: number;         // Time from creation to display (ms)
  readonly transcriptionModel?: string;      // Which transcription model used
  readonly dataChannelId?: string;           // Data channel identifier
  readonly networkLatency?: number;          // Network roundtrip time (ms)
  readonly processingTime?: number;          // Processing time on device (ms)
}

/**
 * Extended conversation message with metadata
 * Used for debugging and performance monitoring
 */
export interface ConversationMessageWithMetadata {
  readonly id: string;
  readonly content: string;
  readonly timestamp: Date;
  readonly sender: 'user' | 'agent';
  readonly messageType: 'transcription' | 'chat';
  readonly metadata: MessageMetadata;
}

/**
 * Factory: Create message metadata
 */
export function createMessageMetadata(
  source: MessageSource,
  deliveryLatency?: number
): MessageMetadata {
  return {
    messageSource: source,
    deliveryLatency
  };
}

/**
 * Type guard for valid message source
 */
export function isValidMessageSource(value: unknown): value is MessageSource {
  return (
    value === 'livekit-transcription' ||
    value === 'livekit-data-channel' ||
    value === 'local-echo' ||
    value === 'storage-restored'
  );
}

/**
 * Calculate delivery latency in milliseconds
 */
export function calculateDeliveryLatency(
  createdAt: Date,
  displayedAt: Date = new Date()
): number {
  return displayedAt.getTime() - createdAt.getTime();
}
