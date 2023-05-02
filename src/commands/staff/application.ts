//@ts-nocheck
import { ApplyOptions } from '@sapphire/decorators';
import { Subcommand } from '@sapphire/plugin-subcommands';

@ApplyOptions<Subcommand.Options>({
  name: 'application',
  description: 'Manage the application.',
  subcommands: [
    {
        name: 'deny',
        chatInputRun: 'deny'
    },
    {
        name: 'accept',
        chatInputRun: 'accept'
    },
    {
        name: 'delete',
        chatInputRun: 'delete'
    },
    {
        name: 'show',
        chatInputRun: 'show'
    },
    {
        name: 'list',
        chatInputRun: 'list'
    }
  ]
})
export class SlashCommand extends Subcommand {
  public registerApplicationCommands(registry: Subcommand.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description));
  }

  public async deny(interaction: Subcommand.ChatInputCommandInteraction) {

  }

  public async accept(interaction: Subcommand.ChatInputCommandInteraction) {

  }

  public async delete(interaction: Subcommand.ChatInputCommandInteraction) {

  }

  public async show(interaction: Subcommand.ChatInputCommandInteraction) {

  }

  public async list(interaction: Subcommand.ChatInputCommandInteraction) {

  }
}