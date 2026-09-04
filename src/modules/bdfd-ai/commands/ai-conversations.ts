import { buildAiConversationListMessage } from '@lib/command-utils/bdfd-ai/list/ai-conversation-list.utils.js';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';

@ApplyOptions<Command.Options>({
  name: 'ai-conversations',
  description: 'Browse and manage stored AI conversations (owner only).',
  preconditions: ['OwnerOnly']
})
export class AiConversationsCommand extends Command {
  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const channels = await this.container.aiConversation.listChannels();
    const message = await buildAiConversationListMessage(
      channels,
      0,
      (id) => this.container.aiRate.getUsage(id),
      (id) => this.container.aiRate.getLimit(id)
    );
    return interaction.reply(message);
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName(this.name).setDescription(this.description).setDMPermission(false)
    );
  }
}
