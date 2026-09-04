import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { ChannelType, Colors, EmbedBuilder, type Message } from 'discord.js';
import { resolveChannelAuthorId } from '@lib/bdfd-ai/channel-utils.js';
import { AI_INTRO_KEY_PREFIX } from '@lib/bdfd-ai/cleanup-channel.js';

@ApplyOptions<Listener.Options>({
  event: Events.MessageCreate,
  name: 'bdfdAiTicketIntro'
})
export class BdfdAiTicketIntroListener extends Listener<typeof Events.MessageCreate> {
  async run(message: Message) {
    if (!message.inGuild() || message.author.bot) return;
    if (message.channel.type !== ChannelType.GuildText) return;
    if (message.channel.parentId !== this.container.config.categories.tickets) return;

    const settings = await this.container.settings.get(this.container.config.guild).catch(() => null);
    if (!settings?.at(0)?.aiEnabled) return;

    const authorId = await resolveChannelAuthorId(message.channel, 'ticket');
    if (!authorId || message.author.id !== authorId) return;

    const sentKey = `${AI_INTRO_KEY_PREFIX}${message.channel.id}`;
    if (await this.container.redis.exists(sentKey)) return;

    const botId = this.container.client.user?.id;
    if (!botId) return;

    const recent = await message.channel.messages.fetch({ limit: 20 }).catch(() => null);
    if (recent?.some((m) => m.author.id === botId)) return;

    const embed = new EmbedBuilder()
      .setColor(Colors.Blurple)
      .setTitle('BDFD AI')
      .setDescription(
        'Need quick help? Use **`/ai`** or **reply to this message** to chat with the wiki-powered assistant.\n\nSend code in ` ``` ` blocks, or use a pastebin / `.txt` link if it is too large.'
      );

    const sent = await message.channel.send({ embeds: [embed] }).catch(() => null);
    if (sent) {
      await this.container.redis.set(sentKey, '1');
    }
  }
}
