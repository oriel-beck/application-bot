import { BaseManager } from "@lib/managers/base.manager.js";
import { and, eq } from "drizzle-orm";
import { messagesTable, transcriptTable } from "schema.js";

interface TransriptMessageCreatePayload {
    id: string;
    user: bigint;
    message?: string;
    channel: bigint;
}

interface TranscriptCreatePayload {
    channel: bigint;
    author: bigint;
}

export default class TranscriptManager extends BaseManager {
    constructor() {
        super('transcripts');
    }

    public async create(payload: TranscriptCreatePayload) {
        const v = await this.drizzle.insert(transcriptTable).values(payload).returning();
        return v.at(0);
    }

    public async delete(channel: string) {
        return await this.drizzle.delete(transcriptTable).where(eq(transcriptTable.channel, BigInt(channel)));
    }

    public async get(channel: string, includeMessages = false) {
        let result;
        if (includeMessages) {
            result = await this.drizzle
                .select({
                    transcriptAuthor: transcriptTable.author,
                    transcriptChannel: transcriptTable.channel,
                    messageId: messagesTable.id,
                    messageUser: messagesTable.user,
                    messageText: messagesTable.message,
                })
                .from(transcriptTable)
                .leftJoin(messagesTable, eq(messagesTable.channel, transcriptTable.channel))
                .where(eq(transcriptTable.channel, BigInt(channel)));
        } else {
            result = await this.drizzle
                .select({
                    transcriptAuthor: transcriptTable.author,
                    transcriptChannel: transcriptTable.channel,
                    messageId: messagesTable.id,
                    messageUser: messagesTable.user,
                    messageText: messagesTable.message,
                })
                .from(transcriptTable)
                .where(eq(transcriptTable.channel, BigInt(channel)));
        }

        if (!result[0]) return;

        // Group the results by transcript to build the final structure
        const transcript = {
            author: result[0].transcriptAuthor!,
            channel: result[0].transcriptChannel!,
        };

        const messages = result.map((row) => ({
            id: row.messageId!,
            user: row.messageUser!,
            message: row.messageText!,
        })).filter((message) => message.id !== null); // Filter out null messages from unmatched joins

        return { transcript, messages };
    }

    public async update(channel: bigint, field: any, value: any) {
        return await this.drizzle.update(transcriptTable).set({
            [field]: value
        }).where(eq(transcriptTable.channel, channel)).returning();
    }

    public async getAll() {
        return await this.drizzle.select().from(transcriptTable);
    }

    public async addMessage(payload: TransriptMessageCreatePayload) {
        const v = await this.drizzle.insert(messagesTable).values({
            ...payload,
            message: payload.message ?? "EMPTY",
            id: BigInt(payload.id)
        }).returning();
        return v.at(0);
    }

    public async updateMessage(messageId: string, message: string) {
        return await this.drizzle.update(messagesTable).set({
            message
        }).where(eq(messagesTable.id, BigInt(messageId)));
    }

    public async deleteMessage(channelId: string, messageId: string) {
        return await this.drizzle.delete(messagesTable).where(
            and(
                eq(messagesTable.channel, BigInt(channelId)),
                eq(messagesTable.id, BigInt(messageId))
            )
        )
    }
}