import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { generateDMComponents, generateDMEmbed } from '../../util/util';

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
    await interaction.deferReply({
      ephemeral: true
    });

    const get = await this.container.applications.get(interaction.user.id).catch((err) => console.log(err));

    if (!get) {
      return interaction.editReply('Failed to connect to the database, please try again later.')
    }

    if (get.rows.length) {
      return interaction.editReply('You already have an application in progress, please finish or cancel it first.');
    }

    const dm = await interaction.user.createDM().catch(() => null);
    if (!dm) {
      return interaction.editReply('Failed to start the application, please open your DMs.');
    }

    const msg = await dm.send('Starting the application, please wait...').catch(() => null);
    if (!msg) {
      return interaction.editReply('Failed to start the application, please open your DMs.');
    }

    const questions = this.container.questions.getRand(25);
    const create = await this.container.applications.create(interaction.user.id, questions).catch((err) => console.log(err));

    if(!create) {
      msg.delete().catch(() => null);
      return interaction.editReply('Failed to create application, please try again later, if this error repeats open a ticket.')
    }

    msg.edit({
      content: '',
      embeds: generateDMEmbed(questions[0]!),
      components: generateDMComponents([])
    }).catch((err) => console.log(err));

    return interaction.editReply({
      content: 'Started the application in your DMs, good luck!',
    })
  }
}