import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Only anonymous play events and cumulative per-track site counts are stored.
// No names, emails, IP addresses, account IDs or persistent visitor IDs.
export const siteListenEvents = sqliteTable('site_listen_events', {
  id: text('id').primaryKey(),
  trackId: text('track_id').notNull(),
  startedAt: integer('started_at').notNull(),
  expiresAt: integer('expires_at').notNull(),
  thresholdSeconds: integer('threshold_seconds').notNull(),
  countedAt: integer('counted_at'),
}, table => [index('site_listen_events_expiry').on(table.expiresAt)]);

export const siteListenTotals = sqliteTable('site_listen_totals', {
  trackId: text('track_id').primaryKey(),
  listens: integer('listens').notNull().default(0),
  updatedAt: integer('updated_at').notNull(),
});
