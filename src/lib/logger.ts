/**
 * Logger utility for controlled logging
 * - In development: logs all levels
 * - In production: only logs errors (optionally disabled)
 */

type LogLevel = 'debug' | 'info' | 'log' | 'warn' | 'error';

interface LoggerConfig {
  enableInProduction: boolean;
  productionLevels: LogLevel[];
}

const config: LoggerConfig = {
  enableInProduction: true,
  productionLevels: ['error'], // Only errors in production
};

const isDev = import.meta.env.DEV;

const shouldLog = (level: LogLevel): boolean => {
  if (isDev) return true;
  if (!config.enableInProduction) return false;
  return config.productionLevels.includes(level);
};

const formatPrefix = (level: LogLevel): string => {
  const timestamp = new Date().toISOString().slice(11, 23);
  return `[${timestamp}] [${level.toUpperCase()}]`;
};

export const logger = {
  debug: (...args: unknown[]): void => {
    if (shouldLog('debug')) {
      console.debug(formatPrefix('debug'), ...args);
    }
  },

  info: (...args: unknown[]): void => {
    if (shouldLog('info')) {
      console.info(formatPrefix('info'), ...args);
    }
  },

  log: (...args: unknown[]): void => {
    if (shouldLog('log')) {
      console.log(formatPrefix('log'), ...args);
    }
  },

  warn: (...args: unknown[]): void => {
    if (shouldLog('warn')) {
      console.warn(formatPrefix('warn'), ...args);
    }
  },

  error: (...args: unknown[]): void => {
    if (shouldLog('error')) {
      console.error(formatPrefix('error'), ...args);
    }
  },

  /**
   * Group related logs together (only in development)
   */
  group: (label: string, fn: () => void): void => {
    if (isDev) {
      console.group(label);
      fn();
      console.groupEnd();
    }
  },

  /**
   * Log with timing measurement (only in development)
   */
  time: (label: string): void => {
    if (isDev) {
      console.time(label);
    }
  },

  timeEnd: (label: string): void => {
    if (isDev) {
      console.timeEnd(label);
    }
  },
};

// Default export for convenience
export default logger;
