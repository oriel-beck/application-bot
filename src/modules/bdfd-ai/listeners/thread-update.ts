import { cleanupClosedSupportChannel } from '@lib/bdfd-ai/cleanup-channel.js';
import { getBdfdAiChannelKind } from '@lib/bdfd-ai/channel-utils.js';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import type { AnyThreadChannel } from 'discord.js';

@ApplyOptions<Listener.Options>({
    event: Events.ThreadUpdate,
    name: 'bdfdAiThreadUpdate',
})
export class BdfdAiThreadUpdateListener extends Listener<typeof Events.ThreadUpdate> {
    async run(oldThread: AnyThreadChannel, newThread: AnyThreadChannel) {
        if (!getBdfdAiChannelKind(newThread)) return;

        const becameArchived = !oldThread.archived && newThread.archived;
        const becameLocked = !oldThread.locked && newThread.locked;
        if (!becameArchived && !becameLocked) return;

        await cleanupClosedSupportChannel(newThread.id, { deleteTranscript: true });
    }
}
