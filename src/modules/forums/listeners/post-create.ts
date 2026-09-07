import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import type { ActionRowBuilder, AnyThreadChannel, ButtonBuilder, EmbedBuilder } from 'discord.js';
import { generateHelpPayload, getForumPostKind, storeForumHelpMessageId, storeForumTags } from '../post-util.js';

@ApplyOptions<Listener.Options>({
  event: Events.ThreadCreate,
  name: 'supportPostCreate'
})
export class PostCreateListener extends Listener<typeof Events.ThreadCreate> {
  async run(thread: AnyThreadChannel, newlyCreated: boolean) {
    if (!newlyCreated) return;

    const kind = getForumPostKind(thread.parent?.id ?? thread.parentId);
    if (!kind) return;

    const { row, embed } = generateHelpPayload(kind, thread.appliedTags);
    await storeForumTags(thread.id, thread.appliedTags ?? []);
    await retryMessage(thread, embed, row);
  }
}

async function retryMessage(channel: AnyThreadChannel, embed: EmbedBuilder, row: ActionRowBuilder<ButtonBuilder>) {
  let attempts = 0;
  return await retry();
  async function retry() {
    return await channel
      .send({
        embeds: [embed],
        components: [row]
      })
      .then(async (message) => {
        await storeForumHelpMessageId(channel.id, message.id);
        return message;
      })
      .catch(() => {
        if (attempts === 5) return;
        attempts++;
        setTimeout(() => {
          retry();
        }, 5000);
      });
  }
}
