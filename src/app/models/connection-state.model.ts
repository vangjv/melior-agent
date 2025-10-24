/**
 * Connection state discriminated union
 * Enables exhaustive type checking in switch/if statements
 */
export type ConnectionState =
  | DisconnectedState
  | ConnectingState
  | ConnectedState
  | ReconnectingState
  | ErrorState;

export interface DisconnectedState {
  readonly status: 'disconnected';
}

export interface ConnectingState {
  readonly status: 'connecting';
  readonly startedAt: Date;
}

export interface ConnectedState {
  readonly status: 'connected';
  readonly roomName: string;
  readonly sessionId: string;
  readonly connectedAt: Date;
  readonly connectionQuality: ConnectionQuality;
}

export interface ReconnectingState {
  readonly status: 'reconnecting';
  readonly attempt: number;
  readonly maxAttempts: number;
  readonly lastError?: ConnectionError;
}

export interface ErrorState {
  readonly status: 'error';
  readonly error: ConnectionError;
}

export type ConnectionQuality = 'excellent' | 'good' | 'poor' | 'unknown';

/**
 * Connection error with categorized error codes
 */
export interface ConnectionError {
  readonly code: ConnectionErrorCode;
  readonly message: string;
  readonly timestamp: Date;
  readonly originalError?: unknown;
  readonly recoverable: boolean;
}

export type ConnectionErrorCode =
  | 'PERMISSION_DENIED'
  | 'MICROPHONE_NOT_FOUND'
  | 'NETWORK_ERROR'
  | 'SERVER_UNAVAILABLE'
  | 'AUTHENTICATION_FAILED'
  | 'ROOM_NOT_FOUND'
  | 'TIMEOUT'
  | 'UNKNOWN';

/**
 * Maps error codes to user-friendly messages
 */
export const ERROR_MESSAGES: Record<ConnectionErrorCode, string> = {
  PERMISSION_DENIED:
    'Microphone access denied. Please grant permission in your browser settings.',
  MICROPHONE_NOT_FOUND: 'No microphone detected. Please connect a microphone and try again.',
  NETWORK_ERROR: 'Network connection lost. Please check your internet connection.',
  SERVER_UNAVAILABLE: 'Voice service is currently unavailable. Please try again later.',
  AUTHENTICATION_FAILED: 'Failed to authenticate. Please refresh and try again.',
  ROOM_NOT_FOUND: 'Voice chat room not found. Please contact support.',
  TIMEOUT: 'Connection timeout. Please try again.',
  UNKNOWN: 'An unexpected error occurred. Please try again.',
};

/**
 * Connection button UI state
 */
export interface ConnectionButtonState {
  readonly label: string;
  readonly disabled: boolean;
  readonly loading: boolean;
  readonly variant: 'connect' | 'disconnect' | 'reconnect';
  readonly ariaLabel: string;
}

/**
 * Derives button state from connection state
 */
export function deriveButtonState(connectionState: ConnectionState): ConnectionButtonState {
  switch (connectionState.status) {
    case 'disconnected':
      return {
        label: 'Connect',
        disabled: false,
        loading: false,
        variant: 'connect',
        ariaLabel: 'Connect to voice agent',
      };
    case 'connecting':
      return {
        label: 'Connecting...',
        disabled: true,
        loading: true,
        variant: 'connect',
        ariaLabel: 'Connecting to voice agent',
      };
    case 'connected':
      return {
        label: 'Disconnect',
        disabled: false,
        loading: false,
        variant: 'disconnect',
        ariaLabel: 'Disconnect from voice agent',
      };
    case 'reconnecting':
      return {
        label: `Reconnecting (${connectionState.attempt}/${connectionState.maxAttempts})`,
        disabled: true,
        loading: true,
        variant: 'reconnect',
        ariaLabel: `Reconnecting, attempt ${connectionState.attempt} of ${connectionState.maxAttempts}`,
      };
    case 'error':
      return {
        label: 'Retry',
        disabled: false,
        loading: false,
        variant: 'reconnect',
        ariaLabel: 'Retry connection',
      };
  }
}
