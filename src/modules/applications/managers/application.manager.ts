import { eq, sql } from "drizzle-orm";
import { applicationsTable } from "../../../schema.js";
import { ApplicationState, type ApplicationStateKeys } from "../../../lib/constants/application.js";
import type { Application } from "../../../lib/types.js";
import { BaseManager } from "@lib/managers/base.manager.js";

export default class ApplicationManager extends BaseManager {
    max = 25;
    constructor() {
        super('applications')
    }

    public create(userid: string, questions: string[], message: string) {
        // TODO: add max to settings
        return this.drizzle.insert(applicationsTable).values({
            user: BigInt(userid),
            questions: questions,
            answers: [],
            message: BigInt(message),
            state: 'active',
            // 40m into the future
            expiry: new Date(Date.now() + 40 * 60 * 60)
        }).onConflictDoUpdate({
            target: applicationsTable.user,
            set: {
                user: BigInt(userid),
                questions: questions,
                answers: [],
                message: BigInt(message),
                state: 'active',
                // 40m into the future
                expiry: new Date(Date.now() + 40 * 60 * 60)
            }
        }).returning();
    }

    public get(userid: string) {
        return this.drizzle.select().from(applicationsTable).where(eq(applicationsTable.user, BigInt(userid))).prepare(`get-${userid}`).execute();
    }

    public getAll(state: ApplicationStateKeys = ApplicationState.pending) {
        return this.drizzle.select().from(applicationsTable).where(eq(applicationsTable.state, state)).prepare(`get-all-${state}`).execute();
    }

    public delete(userid: string) {
        return this.drizzle.delete(applicationsTable).where(eq(applicationsTable.user, BigInt(userid))).returning();
    }

    public update(userid: string, field: keyof Application, value: Application[keyof Application]) {
        return this.drizzle.update(applicationsTable).set({ [field]: value }).where(eq(applicationsTable.user, BigInt(userid)));
    }

    public addAnswer(userid: string, answer: string) {
        return this.drizzle.update(applicationsTable).set({
            answers: sql`array_append(${applicationsTable.answers}, ${answer})`
        }).where(eq(applicationsTable.user, BigInt(userid))).returning();
    }

    public editAnswer(userid: string, oldAnswer: string, newAnswer: string) {
        return this.drizzle.update(applicationsTable).set({
            answers: sql`array_replace(${applicationsTable.answers}, ${oldAnswer}, ${newAnswer})`
        }).where(eq(applicationsTable.user, BigInt(userid))).returning();
    }

    public reset() {
        return this.drizzle.delete(applicationsTable);
    }
}