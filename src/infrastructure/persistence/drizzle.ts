/**
 * @description drizzle configuration for database connection.
 * This module sets up the Drizzle ORM with the database connection string from environment variables.
 */

import { env } from '@core/config/env.config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { forms, notifiers } from './schema';

const schema = {
  forms,
  notifiers,
};

export const client = neon(env.DATABASE_URL);
export const db = drizzle(client, { schema });
