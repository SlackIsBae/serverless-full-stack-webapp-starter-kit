import { pgTable, jsonb, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('User', {
  id: text('id').primaryKey(),
});

export const todoItems = pgTable('TodoItem', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  userId: text('userId').notNull(),
  status: text('status').notNull().default('PENDING'),
  // Nullable with no default: DSQL cannot ADD COLUMN with NOT NULL/DEFAULT. NULL means no tags.
  tags: jsonb('tags').$type<string[]>(),
  // Nullable with no default for the same DSQL reason. NULL means no owner.
  owner: text('owner'),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const usersRelations = relations(users, ({ many }) => ({
  todoItems: many(todoItems),
}));

export const todoItemsRelations = relations(todoItems, ({ one }) => ({
  user: one(users, { fields: [todoItems.userId], references: [users.id] }),
}));
