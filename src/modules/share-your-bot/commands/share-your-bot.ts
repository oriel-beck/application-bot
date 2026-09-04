import {
  generateStickyMessageComponents,
  generateStickyMessageEmbed
} from '@lib/command-utils/sticky-message/resend.js';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { Subcommand } from '@sapphire/plugin-subcommands';
import { ChannelType, MessageFlags } from 'discord.js';
@ApplyOptions<Subcommand.Options>({
  name: 'shareyourbot',
  description: 'Controls the share your bot channel',
  preconditions: ['OwnerOnly', 'ModOnly'],
  subcommands: [
    {
      name: 'resend',
      chatInputRun: 'resend'
    },
    {
      name: 'cooldown',
      chatInputRun: 'cooldown'
    }
  ]
})
export class SlashCommand extends Subcommand {
  public async resend(interaction: Subcommand.ChatInputCommandInteraction) {
    const shareBotChannel = interaction.client?.channels.cache.get(this.container.config.channels.share_your_bot);
    if (shareBotChannel?.type !== ChannelType.GuildText)
      return interaction.reply({
        content: `<#${this.container.config.channels.share_your_bot}> is not a valid text channel`,
        flags: MessageFlags.Ephemeral
      });

    const oldMessage = await this.container.redis.get('share-your-bot-sticky-message');
    if (oldMessage) {
      await shareBotChannel.messages.delete(oldMessage).catch(() => null);
    }

    const newMessage = await shareBotChannel.send({
      embeds: generateStickyMessageEmbed(),
      components: generateStickyMessageComponents()
    });

    await this.container.cooldown.setMessage(newMessage.id);

    return interaction.reply('Re-sent the share your bot rules.');
  }

  public async cooldown(interaction: Subcommand.ChatInputCommandInteraction) {
    const shareBotChannel = interaction.client?.channels.cache.get(this.container.config.channels.share_your_bot);
    if (!shareBotChannel?.isTextBased())
      return interaction.reply({
        content: `<#${this.container.config.channels.share_your_bot}> is not a valid text channel`,
        flags: MessageFlags.Ephemeral
      });

    const secondsRaw = interaction.options.getNumber('seconds', false);
    const user = interaction.options.getUser('user', true);
    const shouldClear = secondsRaw == null || secondsRaw === 0;

    if (shouldClear) {
      await this.container.cooldown.deleteCooldown(user.id);
      return interaction.reply({
        content: `Reset ${user}'s cooldown.`,
        flags: MessageFlags.Ephemeral
      });
    }

    if (!Number.isFinite(secondsRaw) || secondsRaw <= 0 || !Number.isInteger(secondsRaw)) {
      return interaction.reply({
        content: 'Seconds must be a positive whole number when setting a cooldown.',
        flags: MessageFlags.Ephemeral
      });
    }

    await this.container.cooldown.setCooldown(user.id, secondsRaw);

    return interaction.reply({
      content: `Set ${user}'s cooldown to ${secondsRaw} seconds.`,
      flags: MessageFlags.Ephemeral
    });
  }

  public registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addSubcommand((builder) => builder.setName('resend').setDescription('re-sends the share your bot rules'))
        .addSubcommand((builder) =>
          builder
            .setName('cooldown')
            .setDescription("Set a user's cooldown")
            .addUserOption((builder) =>
              builder.setName('user').setDescription('The user to reset the cooldown for').setRequired(true)
            )
            .addNumberOption((builder) =>
              builder.setName('seconds').setDescription('The amount of seconds to set the cooldown to, use 0 to reset')
            )
        )
    );
  }
}
