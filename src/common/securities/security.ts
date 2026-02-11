/**
 * Security Configuration
 * Express-compatible security utilities
 */
import { Logger } from '@nestjs/common';

const logger = new Logger('Security');

/**
 * Sanitize user input to prevent NoSQL injection
 * Removes MongoDB operators ($gt, $ne, etc.) from input objects
 */
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    return input;
  }
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  if (typeof input === 'object' && input !== null) {
    const sanitized: Record<string, any> = {};
    for (const key of Object.keys(input)) {
      if (key.startsWith('$')) {
        logger.warn(`Blocked NoSQL injection attempt with operator: ${key}`);
        continue;
      }
      sanitized[key] = sanitizeInput(input[key]);
    }
    return sanitized;
  }
  return input;
}

/**
 * Password policy configuration
 */
export const PASSWORD_POLICY = {
  minLength: 8,
  maxLength: 50,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  pattern:
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
};

/**
 * Rate limit presets for different endpoint types
 */
export const RATE_LIMITS = {
  auth: { windowMs: 15 * 60 * 1000, max: 20 },
  api: { windowMs: 60 * 1000, max: 100 },
  upload: { windowMs: 60 * 1000, max: 10 },
};
