//@ts-nocheck
import { ApplyOptions } from '@sapphire/decorators';
import { Subcommand } from '@sapphire/plugin-subcommands';

@ApplyOptions<Subcommand.Options>({
  name: 'question',
  description: 'Manages the questions system.',
  subcommands: [
    {
        name: 'add',
        chatInputRun: 'add'
    },
    {
        name: 'remove',
        chatInputRun: 'remove'
    },
    {
        name: 'list',
        chatInputRun: 'list'
    },
    {
        name: 'edit',
        chatInputRun: 'edit'
    },
    {
        name: 'show',
        chatInputRun: 'show'
    }
  ]
})
export class SlashCommand extends Subcommand {
  public async chatInputRun(interaction: Subcommand.ChatInputCommandInteraction) {

  }

  public registerApplicationCommands(registry: Subcommand.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description));
  }
}