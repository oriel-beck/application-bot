import { generateBlacklistShowEmbed } from '@lib/command-utils/blacklist/show/blacklist-show.util.js';
import { ApplyOptions } from '@sapphire/decorators';
import { Subcommand } from '@sapphire/plugin-subcommands';
import type { Blacklist } from '@lib/types.js';

function isPostgresUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === '23505'
  );
}

@ApplyOptions<Subcommand.Options>({
  name: 'blacklist',
  description: 'Manages the blacklist system.',
  preconditions: ['ModOnly'],
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
    await interaction.deferReply();
    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason', true);

    let create: Awaited<ReturnType<typeof this.container.blacklists.create>>;
    try {
      create = await this.container.blacklists.create(user.id, reason, interaction.user.id);
    } catch (error) {
      if (isPostgresUniqueViolation(error)) {
        return interaction.editReply(`${user} is already blacklisted.`);
      }
      console.error('[blacklist add]', error);
      return interaction.editReply(
        `Could not blacklist ${user} because the database request failed. Please try again in a moment.`
      );
    }

    if (!create?.at(0)) {
      return interaction.editReply(
        `Could not blacklist ${user} because the database returned an unexpected empty result. Please try again in a moment.`
      );
    }

    return interaction.editReply(`Blacklisted ${user}.`);
  }

  public async remove(interaction: Subcommand.ChatInputCommandInteraction) {
    await interaction.deferReply();
    const user = interaction.options.getUser('user', true);

    let remove: Awaited<ReturnType<typeof this.container.blacklists.delete>>;
    try {
      remove = await this.container.blacklists.delete(user.id);
    } catch (error) {
      console.error('[blacklist remove]', error);
      return interaction.editReply(
        `Could not remove ${user} from the blacklist because the database request failed. Please try again in a moment.`
      );
    }

    if (!remove.length) {
      return interaction.editReply(`${user} is not on the blacklist.`);
    }

    return interaction.editReply(`Unblacklisted ${user}.`);
  }

  public async reason(interaction: Subcommand.ChatInputCommandInteraction) {
    await interaction.deferReply();
    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason', true);

    let update: Awaited<ReturnType<typeof this.container.blacklists.update>>;
    try {
      update = await this.container.blacklists.update(user.id, 'reason', reason);
    } catch (error) {
      console.error('[blacklist reason]', error);
      return interaction.editReply(
        `Could not update the blacklist reason for ${user} because the database request failed. Please try again in a moment.`
      );
    }

    if (!update.length) {
      return interaction.editReply(`${user} is not on the blacklist, so their reason could not be updated.`);
    }

    return interaction.editReply(`Re-reasoned the blacklist for ${user}.`);
  }

  public async show(interaction: Subcommand.ChatInputCommandInteraction) {
    await interaction.deferReply();
    const user = interaction.options.getUser('user', true);

    const select = await this.container.blacklists.get(user.id).catch(() => null);

    if (!select) {
      return interaction.editReply(
        `Could not load blacklist information for ${user} because the database request failed. Please try again in a moment.`
      );
    }

    if (!select?.at(0)) {
      return interaction.editReply(`${user} is not blacklisted.`);
    }

    return interaction.editReply({
      embeds: generateBlacklistShowEmbed(select.at(0) as unknown as Blacklist)
    });
  }

  public registerApplicationCommands(registry: Subcommand.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .setDMPermission(false)
        .addSubcommand((builder) => builder.setName('add')
          .setDescription('Blacklists a user.')
          .addUserOption((option) =>
            option
              .setName('user')
              .setDescription('The user to blacklist.')
              .setRequired(true))
          .addStringOption((option) =>
            option
              .setName('reason')
              .setDescription('The reason to blacklist')
              .setRequired(true)))
        .addSubcommand((builder) => builder.setName('remove')
          .setDescription('Unblacklists a user.')
          .addUserOption((option) =>
            option
              .setName('user')
              .setDescription('The user to unblacklist')
              .setRequired(true)))
        .addSubcommand((builder) => builder.setName('reason')
          .setDescription('Re-reasons a blacklisted user.')
          .addUserOption((option) =>
            option
              .setName('user')
              .setDescription('The user to re-reason.')
              .setRequired(true))
          .addStringOption((option) =>
            option
              .setName('reason')
              .setDescription('The new reason.')
              .setRequired(true)))
        .addSubcommand((builder) => builder.setName('show')
          .setDescription('Show the information of a blacklisted user.')
          .addUserOption((option) =>
            option
              .setName('user')
              .setDescription('The user to show the blacklist information of.')
              .setRequired(true)))
    );
  }
}