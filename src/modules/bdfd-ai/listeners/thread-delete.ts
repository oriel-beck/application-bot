import { cleanupClosedSupportChannel } from '@lib/bdfd-ai/cleanup-channel.js';
import { getBdfdAiChannelKind } from '@lib/bdfd-ai/channel-utils.js';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import type { AnyThreadChannel } from 'discord.js';

@ApplyOptions<Listener.Options>({
    event: Events.ThreadDelete,
    name: 'bdfdAiThreadDelete',
})
export class BdfdAiThreadDeleteListener extends Listener<typeof Events.ThreadDelete> {
    async run(thread: AnyThreadChannel) {
        if (!getBdfdAiChannelKind(thread)) return;
        await cleanupClosedSupportChannel(thread.id, { deleteTranscript: true });
    }
}
