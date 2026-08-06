import { container } from '@sapphire/framework';

export const AI_INTRO_KEY_PREFIX = 'bdfd-ai:intro:';
export const INACTIVE_CHANNEL_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface CleanupClosedSupportChannelOptions {
    /** Remove ticket transcript rows from Postgres (cascade deletes messages) */
    deleteTranscript?: boolean;
}

/**
 * Clears persisted AI conversation and per-channel Redis state when a ticket
 * or support thread is closed or resolved.
 */
export async function cleanupClosedSupportChannel(
    channelId: string,
    options: CleanupClosedSupportChannelOptions = {}
): Promise<void> {
    const { deleteTranscript = false } = options;

    const tasks: Promise<unknown>[] = [
        container.aiConversation.delete(channelId),
        container.aiRate.resetUsage(channelId),
        container.aiRate.clearThinking(channelId),
        container.redis.del(`${AI_INTRO_KEY_PREFIX}${channelId}`),
    ];

    if (deleteTranscript) {
        tasks.push(container.transcripts.delete(channelId));
    }

    await Promise.all(tasks.map((task) => task.catch((err) => console.error('[bdfd-ai] cleanup failed:', err))));
}

/** Wipe AI (+ transcript) for channels with no activity for a week. Returns cleaned channel count. */
export async function sweepInactiveSupportChannels(
    maxAgeMs = INACTIVE_CHANNEL_MAX_AGE_MS
): Promise<number> {
    const before = new Date(Date.now() - maxAgeMs);
    const [aiChannels, transcriptChannels] = await Promise.all([
        container.aiConversation.listInactiveChannelIds(before),
        container.transcripts.listInactiveChannelIds(before),
    ]);

    const channelIds = new Set([...aiChannels, ...transcriptChannels]);
    for (const channelId of channelIds) {
        await cleanupClosedSupportChannel(channelId, { deleteTranscript: true });
    }
    return channelIds.size;
}
