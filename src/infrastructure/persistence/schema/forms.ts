import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  text,
  time,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { WatcherType } from '@src/shared/enums/watcher-type.enum';

export const forms = pgTable('forms', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  url: text('url').notNull(),
  watcherType: text('watcher_type').notNull().$type<WatcherType>(),
  watcherConfig: jsonb('watcher_config').notNull().default('{}'),
  intervalSeconds: integer('interval_seconds').notNull(),
  cronSchedule: text('cron_schedule'),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  weekdays: text('weekdays').array().notNull(),
  activeFrom: time('active_from').notNull(),
  activeTo: time('active_to').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  priority: integer('priority').notNull().default(2),
  lastCheckedAt: timestamp('last_checked_at'),
  lastStatus: text('last_status'),
  lastHash: text('last_hash'),
  lastNotifiedAt: timestamp('last_notified_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
