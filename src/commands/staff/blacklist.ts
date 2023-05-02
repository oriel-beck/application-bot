//@ts-nocheck
import { ApplyOptions } from '@sapphire/decorators';
import { Subcommand } from '@sapphire/plugin-subcommands';

@ApplyOptions<Subcommand.Options>({
  name: 'blacklist',
  description: 'Manages the blacklist system.',
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
        name: 'reason',
        chatInputRun: 'reason'
    },
    {
        name: 'show',
        chatInputRun: 'show'
    }
  ]
})
export class SlashCommand extends Subcommand {
  public async add(interaction: Subcommand.ChatInputCommandInteraction) {

  }

  public async remove(interaction: Subcommand.ChatInputCommandInteraction) {

  }

  public async reason(interaction: Subcommand.ChatInputCommandInteraction) {

  }

  public async show(interaction: Subcommand.ChatInputCommandInteraction) {

  }

  public registerApplicationCommands(registry: Subcommand.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description));
  }
}