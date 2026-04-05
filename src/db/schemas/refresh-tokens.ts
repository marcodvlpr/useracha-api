import { text, timestamp, uuid, pgTable } from 'drizzle-orm/pg-core';
import { usersTable } from './user-schema';

export const refreshTokensTable = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid()
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  token: text('token').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
