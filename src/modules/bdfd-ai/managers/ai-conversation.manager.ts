import { BaseManager } from '@lib/managers/base.manager.js';
import { asc, count, desc, eq, lt, max } from 'drizzle-orm';
import { aiConversationTurnsTable, aiFailedRequestsTable } from '../../../schema.js';
import type { ChatTurn } from '@lib/bdfd-ai/types.js';
import type { RejectedAttempt } from '@lib/bdfd-ai/bdscript-validation.js';

const DEFAULT_HISTORY_LIMIT = 20;
/** Failed requests older than this are pruned whenever a new one is recorded. */
const FAILURE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export interface AiFailure {
  channelId: string;
  userId: string;
  question: string;
  reason: 'validation' | 'error';
  error: string;
  attempts?: RejectedAttempt[];
}

export interface AiConversationChannelSummary {
  channelId: string;
  turnCount: number;
  lastAt: Date;
}

export default class AiConversationManager extends BaseManager {
  constructor() {
    super('aiConversation');
  }

  public async create() {
    throw new Error('Use addTurn instead');
  }

  public async delete(channelId: string) {
    return this.drizzle.delete(aiConversationTurnsTable).where(eq(aiConversationTurnsTable.channel, BigInt(channelId)));
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
        content: aiConversationTurnsTable.content
      })
      .from(aiConversationTurnsTable)
      .where(eq(aiConversationTurnsTable.channel, BigInt(channelId)))
      .orderBy(desc(aiConversationTurnsTable.createdAt))
      .limit(limit);

    return rows.reverse().map((row) => ({
      role: row.role,
      content: row.content
    }));
  }

  public async addTurn(channelId: string, role: ChatTurn['role'], content: string) {
    return this.drizzle
      .insert(aiConversationTurnsTable)
      .values({
        channel: BigInt(channelId),
        role,
        content
      })
      .returning();
  }

  public async addExchange(channelId: string, userContent: string, assistantContent: string) {
    await this.addTurn(channelId, 'user', userContent);
    await this.addTurn(channelId, 'assistant', assistantContent);
  }

  /** All channels with stored turns, newest activity first. */
  public async listChannels(): Promise<AiConversationChannelSummary[]> {
    const rows = await this.drizzle
      .select({
        channel: aiConversationTurnsTable.channel,
        turnCount: count(),
        lastAt: max(aiConversationTurnsTable.createdAt)
      })
      .from(aiConversationTurnsTable)
      .groupBy(aiConversationTurnsTable.channel)
      .orderBy(desc(max(aiConversationTurnsTable.createdAt)));

    return rows
      .filter((row) => row.lastAt != null)
      .map((row) => ({
        channelId: row.channel.toString(),
        turnCount: Number(row.turnCount),
        lastAt: row.lastAt!
      }));
  }

  /** Channels whose newest turn is older than `before` */
  public async listInactiveChannelIds(before: Date): Promise<string[]> {
    const rows = await this.drizzle
      .select({ channel: aiConversationTurnsTable.channel })
      .from(aiConversationTurnsTable)
      .groupBy(aiConversationTurnsTable.channel)
      .having(lt(max(aiConversationTurnsTable.createdAt), before));

    return rows.map((row) => row.channel.toString());
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

  /** Persist a request that got no answer, so it can be looked up after the container's logs are gone. */
  public async recordFailure(failure: AiFailure) {
    await this.drizzle
      .delete(aiFailedRequestsTable)
      .where(lt(aiFailedRequestsTable.createdAt, new Date(Date.now() - FAILURE_RETENTION_MS)));
    await this.drizzle.insert(aiFailedRequestsTable).values({
      channel: BigInt(failure.channelId),
      user: BigInt(failure.userId),
      question: failure.question,
      reason: failure.reason,
      error: failure.error,
      attempts: failure.attempts ?? null
    });
  }
}
