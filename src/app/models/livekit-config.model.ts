/**
 * LiveKit connection configuration
 */
export interface LiveKitConfig {
  readonly serverUrl: string;
  readonly token?: string; // Optional - obtained from backend if not provided
  readonly roomName: string;
  readonly participantIdentity?: string;
  readonly options?: RoomOptions;
}

export interface RoomOptions {
  readonly adaptiveStream?: boolean;
  readonly dynacast?: boolean;
  readonly audioCaptureDefaults?: AudioCaptureOptions;
  readonly reconnectPolicy?: ReconnectPolicy;
}

export interface AudioCaptureOptions {
  readonly autoGainControl?: boolean;
  readonly echoCancellation?: boolean;
  readonly noiseSuppression?: boolean;
  readonly sampleRate?: number;
  readonly channelCount?: number;
}

export interface ReconnectPolicy {
  readonly maxRetries: number;
  readonly retryDelayMs: number;
  readonly maxRetryDelayMs: number;
}

/**
 * Default room options
 */
export const DEFAULT_ROOM_OPTIONS: RoomOptions = {
  adaptiveStream: true,
  dynacast: true,
  audioCaptureDefaults: {
    autoGainControl: true,
    echoCancellation: true,
    noiseSuppression: true,
    sampleRate: 48000,
    channelCount: 1,
  },
  reconnectPolicy: {
    maxRetries: 5,
    retryDelayMs: 1000,
    maxRetryDelayMs: 30000,
  },
};
