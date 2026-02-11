// src/constants/index.ts
import { Logger, LogLevel, ServiceUnavailableException } from '@nestjs/common';

export const HOST = process.env.SERVER_HOST || '0.0.0.0';
export const PORT = parseInt(process.env.SERVER_PORT || '3000', 10);
export const DEBUG_LEVEL = (process.env.SERVER_LOG_LEVEL ||
  'debug') as LogLevel;
export const APP_DOCUMENTATION = process.env.APP_DOCUMENTATION || '';
export const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/school-platform';

export const debugLevel: LogLevel[] = (() => {
  switch (DEBUG_LEVEL) {
    case 'debug':
      return ['debug', 'warn', 'error'];
    case 'warn':
      return ['warn', 'error'];
    case 'error':
      return ['error'];
    default:
      return ['log', 'error', 'warn'];
  }
})();

export const handleControllerError = (app: string, msg: string) => {
  return (err: Error) => {
    Logger.error(`${msg} ${err.name}: ${err.message}`, app);
    throw new ServiceUnavailableException(err.message || JSON.stringify(err));
  };
};
