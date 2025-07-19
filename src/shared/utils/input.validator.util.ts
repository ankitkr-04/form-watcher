import safeRegex from 'safe-regex';

import { ValidationError } from '@src/core/custom.errors';

export class InputValidator {
  static validateUrl(url: string): string {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') {
        throw new Error('Only HTTPS URLs are allowed');
      }
      if (
        !parsed.hostname ||
        parsed.hostname.includes('..') ||
        parsed.hostname.includes('localhost')
      ) {
        throw new ValidationError('Invalid hostname in URL');
      }
      return url;
    } catch (error) {
      throw new ValidationError(`Invalid URL: ${(error as Error).message}`);
    }
  }

  static validateRegex(pattern: string, timeout = 100): string {
    if (!safeRegex(pattern, { limit: timeout })) {
      throw new ValidationError('Unsafe regex pattern');
    }
    try {
      new RegExp(pattern);
    } catch {
      throw new ValidationError('Invalid regex pattern');
    }
    return pattern;
  }
}
