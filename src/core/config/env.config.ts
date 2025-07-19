// ┌── src/@core/env.ts
/**
 * @description Environment configuration with validation
 */

import { config } from 'dotenv';

import { getValidatedConfig } from './validator.config';

config(); // Load environment variables from .env file

// Validate and export environment variables
export const env = getValidatedConfig(process.env);

// Backward compatibility
export function validateEnv(): typeof env {
  return env;
}
