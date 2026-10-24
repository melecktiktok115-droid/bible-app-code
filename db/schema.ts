import {
  pgTable,
  text,
  integer,
  timestamp,
  uuid,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core'
export const quotas = pgTable(
  'quotas',
  {
    userId: text('user_id').notNull(),
    day: text().notNull(),
    count: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] })],
)
export const posts = pgTable('posts', {
  id: uuid().defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  body: text().notNull(),
  parentId: uuid('parent_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
export const messages = pgTable(
  'messages',
  {
    id: uuid().defaultRandom().primaryKey(),
    sender: text().notNull(),
    recipient: text().notNull(),
    body: text().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('messages_participants_created_idx').on(
      t.sender,
      t.recipient,
      t.createdAt,
    ),
  ],
)
export const blocks = pgTable(
  'blocks',
  { owner: text().notNull(), target: text().notNull() },
  (t) => [primaryKey({ columns: [t.owner, t.target] })],
)
export const reports = pgTable('reports', {
  id: uuid().defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  target: text().notNull(),
  reason: text().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
export const sanctions = pgTable('sanctions', {
  userId: text('user_id').primaryKey(),
  reason: text().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
export const moderation = pgTable('moderation', {
  id: uuid().defaultRandom().primaryKey(),
  adminId: text('admin_id').notNull(),
  target: text().notNull(),
  decision: text().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
