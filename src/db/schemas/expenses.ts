import { timestamp } from 'drizzle-orm/pg-core';
import { uuid } from 'drizzle-orm/pg-core';
import { pgTable } from 'drizzle-orm/pg-core';
import { groupsTable } from './groups';
import { text } from 'drizzle-orm/pg-core';
import { numeric } from 'drizzle-orm/pg-core';
import { usersTable } from './user-schema';

export const expensesTable = pgTable('expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  description: text('description').notNull(),
  groupId: uuid('group_id')
    .notNull()
    .references(() => groupsTable.id, { onDelete: 'cascade' }),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  date: timestamp('date').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const expensesPayersTable = pgTable('expenses_payers', {
  id: uuid('id').primaryKey().defaultRandom(),
  expenseId: uuid('expense_id')
    .notNull()
    .references(() => expensesTable.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
});

export const expensesSplitsTable = pgTable('expense_splits', {
  id: uuid('id').primaryKey().defaultRandom(),
  expenseId: uuid('expense_id')
    .notNull()
    .references(() => expensesTable.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => usersTable.id),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
});

export const paymentsTable = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id')
    .notNull()
    .references(() => groupsTable.id, { onDelete: 'cascade' }),
  fromUserId: uuid('from_user_id')
    .notNull()
    .references(() => usersTable.id),
  toUserId: uuid('to_user_id')
    .notNull()
    .references(() => usersTable.id),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
