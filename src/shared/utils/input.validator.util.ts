import safeRegex from 'safe-regex';

import { urlSchema } from '@src/core/config/validator.config';
import { ValidationError } from '@src/core/custom.errors';

export class InputValidator {
  static validateUrl(url: string): string {
    return urlSchema.parse(url);
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
