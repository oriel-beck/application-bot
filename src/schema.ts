import { relations } from 'drizzle-orm';
import { bigint, pgEnum, varchar, boolean, pgTable, timestamp, uuid, text } from 'drizzle-orm/pg-core';

export const stateEnum = pgEnum('state', ['pending', 'denied', 'accepted', 'deleted', 'active']);

export const applicationsTable = pgTable("applications", {
    user: bigint("user", { mode: 'bigint' }).primaryKey(),
    questions: text("questions").array().notNull().default([]),
    answers: text("answers").array().notNull().default([]),
    message: bigint("message", { mode: 'bigint' }),
    state: stateEnum("state").notNull(),
    expiry: timestamp("expiry")
});

export const blacklistTable = pgTable("blacklist", {
    user: bigint("user", { mode: 'bigint' }).primaryKey(),
    reason: varchar("reason", { length: 500 }),
    mod: bigint("mod", { mode: 'bigint' })
});

export const settingsTable = pgTable("settings", {
    guild: bigint("guild", { mode: 'bigint' }).primaryKey(),
    enabled: boolean("enabled"),
    aiEnabled: boolean("ai_enabled").notNull().default(false),
});

export const aiTurnRoleEnum = pgEnum('ai_turn_role', ['user', 'assistant']);

export const aiConversationTurnsTable = pgTable('ai_conversation_turns', {
    id: uuid('id').primaryKey().defaultRandom(),
    channel: bigint('channel', { mode: 'bigint' }).notNull(),
    role: aiTurnRoleEnum('role').notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
});

export const questionsTable = pgTable("questions", {
    id: uuid("id").primaryKey().notNull(),
    question: varchar("question", { length: 500 }).notNull().unique()
});

export const transcriptTable = pgTable("transcript", {
    author: bigint("author", { mode: "bigint" }).notNull(),
    channel: bigint("channel", { mode: "bigint" }).notNull().primaryKey(),
});

export const messagesTable = pgTable("messages", {
    id: bigint("id", { mode: "bigint" }).primaryKey(),
    user: bigint("user", { mode: "bigint" }).notNull(),
    message: text("message").notNull(),
    createdAt: timestamp({ mode: 'date' }),
    channel: bigint("channel", { mode: "bigint" })
        .notNull()
        .references(() => transcriptTable.channel, { onDelete: "cascade" }),
});

// Define relationships
export const transcriptRelations = relations(transcriptTable, ({ many }) => ({
    messages: many(messagesTable), // A transcript has many messages
}));

export const messagesRelations = relations(messagesTable, ({ one }) => ({
    transcript: one(transcriptTable, {
        fields: [messagesTable.channel], // foreign key in messages
        references: [transcriptTable.channel], // primary key in transcript
    }),
}));
