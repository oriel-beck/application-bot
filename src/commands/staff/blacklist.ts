import { ApplyOptions } from '@sapphire/decorators';
import { Subcommand } from '@sapphire/plugin-subcommands';
import { SlashCommandSubcommandBuilder } from 'discord.js';
import { generateBlacklistShowEmbed } from '../../util/command-utils/blacklist/show/blacklist-show.util';
import type { Blacklist } from '../../types';

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

    const create = await this.container.blacklists.create(user.id, reason, interaction.user.id).catch(() => null);

    if (!create?.first()) {
      return interaction.editReply(`Failed to blacklist ${user}, try again later.`);
    }

    return interaction.editReply(`Blacklisted ${user}.`);
  }

  public async remove(interaction: Subcommand.ChatInputCommandInteraction) {
    await interaction.deferReply();
    const user = interaction.options.getUser('user', true);

    const remove = await this.container.blacklists.delete(user.id).catch(() => null);

    if (!remove) {
      return interaction.editReply(`Failed to unblacklisted ${user}.`)
    }

    return interaction.editReply(`Unblacklisted ${user}.`);
  }

  public async reason(interaction: Subcommand.ChatInputCommandInteraction) {
    await interaction.deferReply();
    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason', true);

    const update = await this.container.blacklists.update(user.id, 'reason', reason).catch(() => null);

    if (!update) {
      return interaction.editReply(`Failed to re-reason ${user}, try again later`);
    }

    return interaction.editReply(`Re-reasoned the blacklist for ${user}.`);
  }

  public async show(interaction: Subcommand.ChatInputCommandInteraction) {
    await interaction.deferReply();
    const user = interaction.options.getUser('user', true);

    const select = await this.container.blacklists.get(user.id).catch(() => null);

    if (!select) {
      return interaction.editReply(`Failed to get blacklist information for ${user}.`);
    }

    if (!select?.first()) {
      return interaction.editReply(`${user} is not blacklisted.`);
    }

    return interaction.editReply({
      embeds: generateBlacklistShowEmbed(select.first() as unknown as Blacklist)
    });
  }

  public registerApplicationCommands(registry: Subcommand.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .setDMPermission(false)
        .addSubcommand(this.addSubcommandBuilder())
        .addSubcommand(this.removeSubcommandBuilder())
        .addSubcommand(this.reasonSubcommandBuilder())
        .addSubcommand(this.showSubcommandBuilder())
    );
  }

  private addSubcommandBuilder() {
    return new SlashCommandSubcommandBuilder()
      .setName('add')
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
          .setRequired(true));
  }

  private removeSubcommandBuilder() {
    return new SlashCommandSubcommandBuilder()
      .setName('remove')
      .setDescription('Unblacklists a user.')
      .addUserOption((option) =>
        option
          .setName('user')
          .setDescription('The user to unblacklist')
          .setRequired(true));
  }

  private reasonSubcommandBuilder() {
    return new SlashCommandSubcommandBuilder()
      .setName('reason')
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
          .setRequired(true));
  }

  private showSubcommandBuilder() {
    return new SlashCommandSubcommandBuilder()
      .setName('show')
      .setDescription('Show the information of a blacklisted user.')
      .addUserOption((option) =>
        option
          .setName('user')
          .setDescription('The user to show the blacklist information of.')
          .setRequired(true));
  }
}