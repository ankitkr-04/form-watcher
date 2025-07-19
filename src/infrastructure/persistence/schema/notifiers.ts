import { jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';

import { forms } from './forms';

export const notifiers = pgTable('notifiers', {
  id: uuid('id').primaryKey().defaultRandom(),
  formId: uuid('form_id')
    .notNull()
    .references(() => forms.id, { onDelete: 'cascade' }),
  strategy: text('strategy').notNull().$type<'email' | 'discord' | 'slack'>(),
  emailTo: text('email_to').array(),
  webhookUrl: text('webhook_url'),
  customVars: jsonb('custom_vars').notNull().default('{}'),
});
