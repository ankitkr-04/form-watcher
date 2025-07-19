import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { forms } from './forms';

export const formHistory = pgTable('form_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  formId: uuid('form_id')
    .notNull()
    .references(() => forms.id, { onDelete: 'cascade' }),
  status: text('status').notNull(),
  hash: text('hash'),
  responseTime: integer('response_time'),
  checkedAt: timestamp('checked_at').notNull().defaultNow(),
});
