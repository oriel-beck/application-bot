import { container } from '@sapphire/framework';

export const DEFAULT_AI_LIMIT = 20;
const THINKING_TTL_SEC = 180;

export default class AiRateManager {
    name = 'aiRate' as const;
    private limitPrefix = 'bdfd-ai:limit:';
    private usagePrefix = 'bdfd-ai:usage:';
    private thinkingPrefix = 'bdfd-ai:thinking:';

    private redis = container.redis;

    init() {}

    async getLimit(channelId: string): Promise<number> {
        const custom = await this.redis.get(`${this.limitPrefix}${channelId}`);
        if (custom) {
            const n = Number.parseInt(custom, 10);
            if (Number.isFinite(n) && n > 0) return n;
        }
        return DEFAULT_AI_LIMIT;
    }

    async setLimit(channelId: string, limit: number): Promise<void> {
        await this.redis.set(`${this.limitPrefix}${channelId}`, String(limit));
    }

    async clearLimit(channelId: string): Promise<void> {
        await this.redis.del(`${this.limitPrefix}${channelId}`);
    }

    async getUsage(channelId: string): Promise<number> {
        const raw = await this.redis.get(`${this.usagePrefix}${channelId}`);
        return raw ? Number.parseInt(raw, 10) || 0 : 0;
    }

    async incrementUsage(channelId: string): Promise<number> {
        return this.redis.incr(`${this.usagePrefix}${channelId}`);
    }

    async resetUsage(channelId: string): Promise<void> {
        await this.redis.del(`${this.usagePrefix}${channelId}`);
    }

    async canRespond(
        channelId: string
    ): Promise<{ ok: true } | { ok: false; reason: 'busy' | 'limit'; limit: number; usage: number }> {
        if (await this.isThinking(channelId)) {
            return { ok: false, reason: 'busy', limit: 0, usage: 0 };
        }

        const limit = await this.getLimit(channelId);
        const usage = await this.getUsage(channelId);
        if (usage >= limit) {
            return { ok: false, reason: 'limit', limit, usage };
        }

        return { ok: true };
    }

    async isThinking(channelId: string): Promise<boolean> {
        return (await this.redis.exists(`${this.thinkingPrefix}${channelId}`)) === 1;
    }

    async setThinking(channelId: string): Promise<boolean> {
        const key = `${this.thinkingPrefix}${channelId}`;
        const result = await this.redis.set(key, '1', 'EX', THINKING_TTL_SEC, 'NX');
        return result === 'OK';
    }

    async clearThinking(channelId: string): Promise<void> {
        await this.redis.del(`${this.thinkingPrefix}${channelId}`);
    }
}
