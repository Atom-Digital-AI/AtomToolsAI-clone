const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

const currentLevel = LOG_LEVELS[(process.env.LOG_LEVEL as LogLevel) || 'INFO'] ?? LOG_LEVELS.INFO;

export const logger = {
  error: (...args: any[]) => {
    if (currentLevel >= LOG_LEVELS.ERROR) {
      console.error('[ERROR]', new Date().toISOString(), ...args);
    }
  },
  warn: (...args: any[]) => {
    if (currentLevel >= LOG_LEVELS.WARN) {
      console.warn('[WARN]', new Date().toISOString(), ...args);
    }
  },
  info: (...args: any[]) => {
    if (currentLevel >= LOG_LEVELS.INFO) {
      console.log('[INFO]', new Date().toISOString(), ...args);
    }
  },
  debug: (...args: any[]) => {
    if (currentLevel >= LOG_LEVELS.DEBUG) {
      console.log('[DEBUG]', new Date().toISOString(), ...args);
    }
  },
};
