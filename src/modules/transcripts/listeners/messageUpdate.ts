import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { ChannelType, Message, PartialMessage } from 'discord.js';

@ApplyOptions<Listener.Options>({
  event: Events.MessageUpdate,
  name: 'transcriptsMessageUpdate'
})
export class MessageDeleteListener extends Listener<typeof Events.MessageUpdate> {
  async run(_oldMessage: Message<boolean> | PartialMessage, newMessage: Message<boolean> | PartialMessage) {
    if (
      newMessage.channel.type !== ChannelType.GuildText ||
      newMessage.channel.parentId !== this.container.config.categories.tickets
    )
      return;
    await this.container.transcripts.updateMessage(newMessage.id, newMessage.content || 'EMPTY');
  }
}
