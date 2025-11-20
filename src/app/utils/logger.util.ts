/**
 * Production-safe logging utility
 * 
 * This utility provides conditional logging that:
 * - Logs detailed information in development mode
 * - Suppresses or sanitizes logs in production mode
 * - Prevents accidental leakage of sensitive data
 * 
 * Security best practices:
 * - Never log authentication tokens, passwords, or API keys
 * - Sanitize user data before logging
 * - Use appropriate log levels (error, warn, info, debug)
 * - Keep production logs minimal to reduce attack surface
 */

import { environment } from '../../environments/environment';

/**
 * Log levels for categorizing log messages
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

/**
 * Logger configuration
 */
export interface LoggerConfig {
  /** Enable/disable all logging */
  enabled: boolean;
  /** Minimum log level to display (error > warn > info > debug) */
  minLevel: LogLevel;
  /** Enable console output in production */
  productionConsole: boolean;
}

/**
 * Default logger configuration based on environment
 */
const defaultConfig: LoggerConfig = {
  enabled: !environment.production,
  minLevel: environment.production ? 'error' : 'debug',
  productionConsole: false
};

/**
 * Current logger configuration (can be overridden)
 */
let currentConfig: LoggerConfig = { ...defaultConfig };

/**
 * Log level priorities for comparison
 */
const levelPriorities: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

/**
 * Check if a log level should be displayed
 */
function shouldLog(level: LogLevel): boolean {
  if (!currentConfig.enabled) {
    return false;
  }
  if (environment.production && !currentConfig.productionConsole) {
    return false;
  }
  return levelPriorities[level] <= levelPriorities[currentConfig.minLevel];
}

/**
 * Sanitize data before logging to remove sensitive information
 */
function sanitizeData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sanitized = Array.isArray(data) ? [...data] : { ...data };
  const sensitiveKeys = [
    'token', 'password', 'secret', 'apiKey', 'api_key', 
    'authorization', 'auth', 'accessToken', 'refreshToken',
    'clientSecret', 'apiSecret'
  ];

  for (const key in sanitized) {
    if (sensitiveKeys.some(k => key.toLowerCase().includes(k.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeData(sanitized[key]);
    }
  }

  return sanitized;
}

/**
 * Logger class with production-safe methods
 */
export class Logger {
  /**
   * Log an error message
   * Always logged even in production (if config allows)
   */
  static error(message: string, data?: any): void {
    if (shouldLog('error')) {
      const sanitized = data ? sanitizeData(data) : undefined;
      console.error(`[ERROR] ${message}`, sanitized || '');
    }
  }

  /**
   * Log a warning message
   * Logged in development and optionally in production
   */
  static warn(message: string, data?: any): void {
    if (shouldLog('warn')) {
      const sanitized = data ? sanitizeData(data) : undefined;
      console.warn(`[WARN] ${message}`, sanitized || '');
    }
  }

  /**
   * Log an info message
   * Logged in development only by default
   */
  static info(message: string, data?: any): void {
    if (shouldLog('info')) {
      const sanitized = data ? sanitizeData(data) : undefined;
      console.log(`[INFO] ${message}`, sanitized || '');
    }
  }

  /**
   * Log a debug message
   * Logged in development only
   */
  static debug(message: string, data?: any): void {
    if (shouldLog('debug')) {
      const sanitized = data ? sanitizeData(data) : undefined;
      console.log(`[DEBUG] ${message}`, sanitized || '');
    }
  }

  /**
   * Configure the logger
   */
  static configure(config: Partial<LoggerConfig>): void {
    currentConfig = { ...currentConfig, ...config };
  }

  /**
   * Reset logger to default configuration
   */
  static reset(): void {
    currentConfig = { ...defaultConfig };
  }
}
