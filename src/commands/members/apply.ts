import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';

@ApplyOptions<Command.Options>({
  name: 'apply',
  description: 'Start a staff application.'
})
export class SlashCommand extends Command {
  public registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description),
        {
          idHints: ['1098190026841538650']
        });
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    // const create = await this.container.applications.create(interaction.user.id).catch((err) => {
    //   console.log(err);
    //   return null;
    // });
    // console.log(create);

    // const get = await this.container.applications.get(interaction.user.id).catch((err) => {
    //   console.log(err);
    //   return null;
    // });
    // console.log(get);

    interaction.reply({
      content: 'Hello there',
      ephemeral: true
    })
  }
}