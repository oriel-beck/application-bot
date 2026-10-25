import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { ChannelType, Message, PartialMessage } from 'discord.js';
import { deliveredMessageText } from '../managers/transcriptManager.js';

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
    if (!(await this.container.transcripts.recordingEnabled())) return;
    const text = deliveredMessageText(newMessage.content);
    if (!text) return;
    await this.container.transcripts.updateMessage(newMessage.id, text);
  }
}
