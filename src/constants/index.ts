// src/constants/index.ts
import { Logger, LogLevel, ServiceUnavailableException } from '@nestjs/common';

export const HOST = process.env.SERVER_HOST || process.env.HOST || '0.0.0.0';
export const PORT = parseInt(
  process.env.SERVER_PORT || process.env.PORT || '4500',
  10,
);
export const DEBUG_LEVEL = (
  process.env.SERVER_LOG_LEVEL || process.env.LOG_LEVEL || 'debug'
) as LogLevel;
export const APP_DOCUMENTATION = process.env.APP_DOCUMENTATION || '';
export const MONGODB_URI =
  process.env.SERVER_DB_URI ||
  process.env.MONGODB_URI ||
  'mongodb://localhost:27017/school-platform';
export const CORS_ORIGINS = (
  process.env.CORS_ORIGINS || 'http://localhost:3000'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
export const NODE_ENV = process.env.NODE_ENV || 'dev';
export const IS_DEVELOPMENT =
  NODE_ENV === 'dev' || NODE_ENV === 'development';
export const ACCESS_TOKEN_SECRET =
  process.env.ACCESS_TOKEN_SECRET_KALA ||
  process.env.JWT_SECRET ||
  process.env.SERVER_JWT_SECRET ||
  'sadsdfdsffds';
export const REFRESH_TOKEN_SECRET =
  process.env.JWT_REFRESH_SECRET ||
  process.env.SERVER_JWT_REFRESH_SECRET ||
  ACCESS_TOKEN_SECRET || 'dfgdjsfhsdh';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';
export const JWT_REFRESH_EXPIRES_IN =
  process.env.JWT_REFRESH_EXPIRES_IN || '30d';
export const THROTTLE_TTL = parseInt(process.env.THROTTLE_TTL || '60000', 10);
export const THROTTLE_LIMIT = parseInt(
  process.env.THROTTLE_LIMIT || '100',
  10,
);

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
