import { ApplyOptions } from '@sapphire/decorators';
import { Subcommand } from '@sapphire/plugin-subcommands';
import { SlashCommandSubcommandBuilder } from 'discord.js';
import { generateModal } from '../../util/command-utils/application/modals/utils';
import { generateApplicationEmbed } from '../../util/command-utils/application/embeds/utils';
import type { Application, ApplicationState } from '../../types';
import { generateComponents, generateEmbed } from '../../util/command-utils/application/list/util';

@ApplyOptions<Subcommand.Options>({
  name: 'application',
  description: 'Manage the application.',
  preconditions: ['ModOnly'],
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
  public async deny(interaction: Subcommand.ChatInputCommandInteraction) {
    const user = interaction.options.getUser('user', true).id;
    const app = await this.container.applications.get(user).catch(() => null);

    if (!app || !app.rowLength) {
      return interaction.reply({
        content: 'This application does not exist in the database.',
        ephemeral: true
      });
    }

    return interaction.showModal(generateModal('deny', user))
  }

  public async accept(interaction: Subcommand.ChatInputCommandInteraction) {
    const user = interaction.options.getUser('user', true).id;
    const app = await this.container.applications.get(user).catch(() => null);

    if (!app || !app.rowLength) {
      return interaction.reply({
        content: 'This application does not exist in the database.',
        ephemeral: true
      });
    }

    return interaction.showModal(generateModal('accept', user))
  }

  public async delete(interaction: Subcommand.ChatInputCommandInteraction) {
    const user = interaction.options.getUser('user', true).id;
    const app = await this.container.applications.get(user).catch(() => null);

    if (!app || !app.rowLength) {
      return interaction.reply({
        content: 'This application does not exist in the database.',
        ephemeral: true
      });
    }

    return interaction.showModal(generateModal('delete', user))
  }

  public async show(interaction: Subcommand.ChatInputCommandInteraction) {
    await interaction.deferReply();

    const user = interaction.options.getUser('user', true).id;
    const app = await this.container.applications.get(user).catch(() => null);

    if (!app || !app.rowLength) {
      return interaction.editReply('This application does not exist in the database.');
    }

    return interaction.editReply({
      content: '',
      embeds: await generateApplicationEmbed(app.first() as unknown as Application)
    })
  }

  public async list(interaction: Subcommand.ChatInputCommandInteraction) {
    interaction.deferReply();

    const state: ApplicationState = interaction.options.getString('state', false) as ApplicationState || 'pending'

    const allApps = await this.container.applications.getAll(state).catch(console.log);
    if (!allApps) {
      return interaction.editReply('There are no applications currently in the database.')
    }

    return interaction.editReply({
      embeds: generateEmbed(allApps.rowLength, state),
      components: generateComponents(allApps.rows as unknown as Application[])
    })
  }

  public registerApplicationCommands(registry: Subcommand.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .setDMPermission(false)
        .addSubcommand(this.denySubcommandBuilder())
        .addSubcommand(this.acceptSubcommandBuilder())
        .addSubcommand(this.deleteSubcommandBuilder())
        .addSubcommand(this.showSubcommandBuilder())
        .addSubcommand(this.listSubcommandBuilder())
    )
  }

  private denySubcommandBuilder() {
    return new SlashCommandSubcommandBuilder()
      .setName('deny')
      .setDescription('Deny an application.')
      .addUserOption((option) =>
        option
          .setName('user')
          .setDescription('The user to deny the application of.')
          .setRequired(true));
  }

  private acceptSubcommandBuilder() {
    return new SlashCommandSubcommandBuilder()
      .setName('accept')
      .setDescription('Accept an application.')
      .addUserOption((option) =>
        option
          .setName('user')
          .setDescription('The user to accept the application of.')
          .setRequired(true));
  }

  private deleteSubcommandBuilder() {
    return new SlashCommandSubcommandBuilder()
      .setName('delete')
      .setDescription('Delete an application.')
      .addUserOption((option) =>
        option
          .setName('user')
          .setDescription('The user to delete the application of.')
          .setRequired(true));
  }

  private showSubcommandBuilder() {
    return new SlashCommandSubcommandBuilder()
      .setName('show')
      .setDescription('Show an application.')
      .addUserOption((option) =>
        option
          .setName('user')
          .setDescription('The user to show the application of.')
          .setRequired(true));
  }

  private listSubcommandBuilder() {
    return new SlashCommandSubcommandBuilder()
      .setName('list')
      .setDescription('List all applications.')
      .addStringOption((option) =>
        option
          .setName('state')
          .setDescription('The state to search applications by (default pending).')
          .setRequired(false)
          .addChoices(
            {
              name: 'Active Applications',
              value: 'active'
            },
            {
              name: 'Pending Applications',
              value: 'pending'
            },
            {
              name: 'Denied Applications',
              value: 'denied'
            },
            {
              name: 'Accepted Applications',
              value: 'accepted'
            }
          ));
  }
}