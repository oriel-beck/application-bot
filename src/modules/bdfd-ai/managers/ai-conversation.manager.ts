import { BaseManager } from '@lib/managers/base.manager.js';
import { asc, desc, eq } from 'drizzle-orm';
import { aiConversationTurnsTable } from '../../../schema.js';
import type { ChatTurn } from '@lib/bdfd-ai/types.js';

const DEFAULT_HISTORY_LIMIT = 20;

export default class AiConversationManager extends BaseManager {
    constructor() {
        super('aiConversation');
    }

    public async create() {
        throw new Error('Use addTurn instead');
    }

    public async delete(channelId: string) {
        return this.drizzle
            .delete(aiConversationTurnsTable)
            .where(eq(aiConversationTurnsTable.channel, BigInt(channelId)));
    }

    public async get(channelId: string) {
        return this.getHistory(channelId);
    }

    public async update() {
        throw new Error('Use addTurn instead');
    }

    public async getHistory(channelId: string, limit = DEFAULT_HISTORY_LIMIT): Promise<ChatTurn[]> {
        const rows = await this.drizzle
            .select({
                role: aiConversationTurnsTable.role,
                content: aiConversationTurnsTable.content,
            })
            .from(aiConversationTurnsTable)
            .where(eq(aiConversationTurnsTable.channel, BigInt(channelId)))
            .orderBy(desc(aiConversationTurnsTable.createdAt))
            .limit(limit);

        return rows.reverse().map((row) => ({
            role: row.role,
            content: row.content,
        }));
    }

    public async addTurn(channelId: string, role: ChatTurn['role'], content: string) {
        return this.drizzle
            .insert(aiConversationTurnsTable)
            .values({
                channel: BigInt(channelId),
                role,
                content,
            })
            .returning();
    }

    public async addExchange(channelId: string, userContent: string, assistantContent: string) {
        await this.addTurn(channelId, 'user', userContent);
        await this.addTurn(channelId, 'assistant', assistantContent);
    }

    /** Trim oldest turns when a channel exceeds max stored turns */
    public async trimChannel(channelId: string, keep = 40) {
        const rows = await this.drizzle
            .select({ id: aiConversationTurnsTable.id })
            .from(aiConversationTurnsTable)
            .where(eq(aiConversationTurnsTable.channel, BigInt(channelId)))
            .orderBy(asc(aiConversationTurnsTable.createdAt));

        const excess = rows.length - keep;
        if (excess <= 0) return;

        const toDelete = rows.slice(0, excess).map((r) => r.id);
        for (const id of toDelete) {
            await this.drizzle.delete(aiConversationTurnsTable).where(eq(aiConversationTurnsTable.id, id));
        }
    }
}
