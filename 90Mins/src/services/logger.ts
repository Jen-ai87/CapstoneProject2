/**
 * Logger Service
 * Handles all console logging with environment-based log levels
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDev = import.meta.env.DEV;
const isTest = import.meta.env.MODE === 'test';

// Only show logs in development mode
const shouldLog = isDev && !isTest;

class Logger {
  private prefix: string;

  constructor(moduleName: string) {
    this.prefix = `[${moduleName}]`;
  }

  debug(message: string, data?: unknown) {
    if (shouldLog) {
      console.debug(`${this.prefix}`, message, data);
    }
  }

  info(message: string, data?: unknown) {
    if (shouldLog) {
      console.info(`${this.prefix}`, message, data);
    }
  }

  warn(message: string, data?: unknown) {
    if (shouldLog) {
      console.warn(`${this.prefix}`, message, data);
    }
  }

  error(message: string, error?: unknown) {
    if (shouldLog) {
      console.error(`${this.prefix}`, message, error);
    }
  }
}

export default Logger;
