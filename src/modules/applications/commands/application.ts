import { generateApplicationComponents, generateApplicationEmbed } from '@lib/command-utils/application/embeds/application-embed.utils.js';
import { generateApplicationListComponents, generateApplicationListEmbed } from '@lib/command-utils/application/list/application-list.utils.js';
import { generateModal } from '@lib/command-utils/application/modals/application-modals.utils.js';
import { ApplyOptions } from '@sapphire/decorators';
import { Subcommand } from '@sapphire/plugin-subcommands';
import { ApplicationState, ApplicationStateKeys } from '@lib/constants/application.js';

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
    },
    {
      name: 'toggle',
      chatInputRun: 'toggle'
    },
    {
      name: 'reset',
      chatInputRun: 'reset'
    }
  ]
})
export class SlashCommand extends Subcommand {
  public async deny(interaction: Subcommand.ChatInputCommandInteraction) {
    const user = interaction.options.getUser('user', true).id;
    const app = await this.container.applications.get(user).catch(() => null);

    if (!app?.first()) {
      return interaction.reply({
        content: 'This application does not exist in the database.',
        ephemeral: true
      });
    }

    if (app.first().get('state') !== ApplicationState.pending) {
      return interaction.reply({
        content: 'This is not a pending application.',
        ephemeral: true
      });
    }

    return interaction.showModal(generateModal(ApplicationState.denied, user));
  }

  public async accept(interaction: Subcommand.ChatInputCommandInteraction) {
    const user = interaction.options.getUser('user', true).id;
    const app = await this.container.applications.get(user).catch(() => null);

    if (!app?.first()) {
      return interaction.reply({
        content: 'This application does not exist in the database.',
        ephemeral: true
      });
    }

    if (app.first().get('state') !== ApplicationState.pending) {
      return interaction.reply({
        content: 'This is not a pending application.',
        ephemeral: true
      });
    }

    return interaction.showModal(generateModal(ApplicationState.accepted, user));
  }

  public async delete(interaction: Subcommand.ChatInputCommandInteraction) {
    const user = interaction.options.getUser('user', true).id;
    const app = await this.container.applications.get(user).catch(() => null);

    if (!app?.first()) {
      return interaction.reply({
        content: 'This application does not exist in the database.',
        ephemeral: true
      });
    }

    return interaction.showModal(generateModal(ApplicationState.deleted, user))
  }

  public async show(interaction: Subcommand.ChatInputCommandInteraction) {
    await interaction.deferReply();

    const user = interaction.options.getUser('user', true).id;
    const app = await this.container.applications.get(user).catch(() => null);

    if (!app?.first()) {
      return interaction.editReply('This application does not exist in the database.');
    }

    return interaction.editReply({
      embeds: await generateApplicationEmbed(app.first()),
      components: generateApplicationComponents(app.first(), 0, app.first().get('state') === ApplicationState.pending)
    });
  }

  public async list(interaction: Subcommand.ChatInputCommandInteraction) {
    await interaction.deferReply();

    const state: ApplicationStateKeys = interaction.options.getString('state', false) as ApplicationStateKeys || ApplicationState.pending;

    const allApps = await this.container.applications.getAll(state).catch(() => null);
    if (!allApps) {
      return interaction.editReply('Failed to fetch applications.');
    }

    return interaction.editReply({
      embeds: generateApplicationListEmbed(allApps.rowLength, state),
      components: generateApplicationListComponents(allApps.rows)
    });
  }

  public async toggle(interaction: Subcommand.ChatInputCommandInteraction) {
    const enabled = await this.container.settings.get(interaction.guild?.id!).then((res) => !!res.first().get('enabled')).catch(() => null)
    const toggled = await this.container.settings.update(interaction.guild?.id!, 'enabled', !enabled).catch(() => null);

    if (!toggled) {
      return interaction.reply({
        content: 'Failed to toggle application state.'
      })
    }

    return interaction.reply({
      content: `Toggled applications, applications are currently ${enabled ? 'disabled' : 'enabled'}.`
    })
  }

  public async reset(interaction: Subcommand.ChatInputCommandInteraction) {
    const reseted = await this.container.applications.reset().catch(() => null);

    if (!reseted) {
      return interaction.reply({
        content: 'Failed to reset applications.'
      });
    }

    return interaction.reply({
      content: 'Reset all applications.'
    })
  }

  public registerApplicationCommands(registry: Subcommand.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .setDMPermission(false)
        .addSubcommand((builder) => builder.setName('deny')
          .setDescription('Deny an application.')
          .addUserOption((option) =>
            option
              .setName('user')
              .setDescription('The user to deny the application of.')
              .setRequired(true)))
        .addSubcommand((builder) => builder.setName('accept')
          .setDescription('Accept an application.')
          .addUserOption((option) =>
            option
              .setName('user')
              .setDescription('The user to accept the application of.')
              .setRequired(true)))
        .addSubcommand((builder) => builder.setName('delete')
          .setDescription('Delete an application.')
          .addUserOption((option) =>
            option
              .setName('user')
              .setDescription('The user to delete the application of.')
              .setRequired(true)))
        .addSubcommand((builder) => builder.setName('show')
          .setDescription('Show an application.')
          .addUserOption((option) =>
            option
              .setName('user')
              .setDescription('The user to show the application of.')
              .setRequired(true)))
        .addSubcommand((builder) => builder.setName('list')
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
              )))
        .addSubcommand((builder) => builder.setName('toggle')
          .setDescription('Enable/Disable the of the applications.'))
        .addSubcommand((builder) => builder.setName('reset')
          .setDescription('Deletes all applications.'))
    )
  }
}