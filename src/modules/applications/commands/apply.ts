import { generateApplyComponents, generateApplyEmbed } from '@lib/command-utils/apply/apply.utils.js';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';

@ApplyOptions<Command.Options>({
  name: 'apply',
  description: 'Start a staff application.',
  preconditions: ['ApplicationsEnabled', 'Blacklisted', 'ApplicationInProgress', 'RequiredRole']
})
export class SlashCommand extends Command {
  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply({
      ephemeral: true
    });

    const dm = await interaction.user.createDM().catch(() => null);
    if (!dm) {
      return interaction.editReply('Failed to start the application, please open your DMs.');
    }

    const msg = await dm.send('Starting the application, please wait...').catch(() => null);
    if (!msg) {
      return interaction.editReply('Failed to start the application, please open your DMs.');
    }

    const questions = this.container.questions.getRand(25);
    const create = await this.container.applications.create(interaction.user.id, questions, msg.id).catch((err) => console.log(err));

    if (!create) {
      msg.delete().catch(() => null);
      return interaction.editReply('Failed to create application, please try again later, if this error repeats open a ticket.')
    }

    const edit = await msg.edit({
      content: `This application will expire <t:${Math.round(Date.now() / 1000) + 2400}:R>`,
      embeds: generateApplyEmbed(questions[0]!),
      components: generateApplyComponents([])
    }).catch((err) => console.log(err));

    if (!edit) {
      await this.container.applications.delete(interaction.user.id).catch(() => null);
      return interaction.editReply('Failed to edit the message, cancelling application process...');
    }

    return interaction.editReply({
      content: 'Started the application in your DMs, good luck!',
    })
  }

  public registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .setDMPermission(false),
      {
        idHints: ['1098190026841538650']
      });
  }
}