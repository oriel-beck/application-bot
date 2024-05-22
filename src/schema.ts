import { bigint, json, pgEnum, varchar, boolean, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

export const stateEnum = pgEnum('state', ['pending', 'denied', 'accepted', 'deleted', 'active']);

export const applicationsTable = pgTable("applications", {
    user: bigint("user", { mode: 'bigint' }).primaryKey(),
    questions: json("questions").array(),
    answers: json("answers").array(),
    message: bigint("message", { mode: 'bigint' }),
    state: stateEnum("state"),
    expiry: timestamp("expiry")
})

export const blacklistTable = pgTable("blacklist", {
    user: bigint("user", { mode: 'bigint' }).primaryKey(),
    reason: varchar("reason", { length: 500 }),
    mod: bigint("mod", {mode: 'bigint'})
})

export const settingsTable = pgTable("settings", {
    guild: bigint("guild", {mode: 'bigint'}).primaryKey(),
    enabled: boolean("enabled")
})

export const questionsTable = pgTable("questions", {
    id: uuid("id"),
    question: varchar("question", {length: 500})
})