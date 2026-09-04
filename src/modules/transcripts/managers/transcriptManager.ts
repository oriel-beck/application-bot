import { BaseManager } from "@lib/managers/base.manager.js";
import { and, count, eq, lt, max, sql } from "drizzle-orm";
import { messagesTable, transcriptTable } from "../../../schema.js";

export interface TranscriptChannelSummary {
    channelId: string;
    authorId: string;
    messageCount: number;
}

/** Discord snowflake for an instant (no worker/process bits). */
function snowflakeAt(date: Date): bigint {
    return BigInt(date.getTime() - 1_420_070_400_000) << 22n;
}

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
        let result: {
            transcriptAuthor: bigint;
            transcriptChannel: bigint;
            messageId?: bigint | null;
            messageUser?: bigint | null;
            messageText?: string | null;
        }[];

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
                .orderBy(messagesTable.id)
                .where(eq(transcriptTable.channel, BigInt(channel)));
        } else {
            result = await this.drizzle
                .select({
                    transcriptAuthor: transcriptTable.author,
                    transcriptChannel: transcriptTable.channel
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

    public async update(
        channel: bigint,
        field: keyof typeof transcriptTable.$inferInsert,
        value: (typeof transcriptTable.$inferInsert)[keyof typeof transcriptTable.$inferInsert]
    ) {
        return await this.drizzle.update(transcriptTable).set({
            [field]: value
        }).where(eq(transcriptTable.channel, channel)).returning();
    }

    public async getAll() {
        return await this.drizzle.select().from(transcriptTable);
    }

    /** All transcripts with message counts (0 if none). */
    public async listWithCounts(): Promise<TranscriptChannelSummary[]> {
        const rows = await this.drizzle
            .select({
                channel: transcriptTable.channel,
                author: transcriptTable.author,
                messageCount: count(messagesTable.id),
            })
            .from(transcriptTable)
            .leftJoin(messagesTable, eq(messagesTable.channel, transcriptTable.channel))
            .groupBy(transcriptTable.channel, transcriptTable.author)
            .orderBy(sql`${max(messagesTable.id)} DESC NULLS LAST`);

        return rows.map((row) => ({
            channelId: row.channel.toString(),
            authorId: row.author.toString(),
            messageCount: Number(row.messageCount),
        }));
    }

    /** Channels whose newest stored message snowflake is older than `before`. */
    public async listInactiveChannelIds(before: Date): Promise<string[]> {
        const cutoff = snowflakeAt(before);
        const rows = await this.drizzle
            .select({ channel: messagesTable.channel })
            .from(messagesTable)
            .groupBy(messagesTable.channel)
            .having(lt(max(messagesTable.id), cutoff));

        return rows.map((row) => row.channel.toString());
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