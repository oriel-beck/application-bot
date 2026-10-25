import { hasRole } from '@lib/precondition-util.js';
import { parseTipNumber } from '../managers/tip-manager.js';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ApplicationCommandType, ChatInputCommandInteraction, Colors, EmbedBuilder, MessageFlags } from 'discord.js';

@ApplyOptions<Command.Options>({
  name: 'tip',
  description: 'Gets the appropriate tip from tips-tutorials.'
})
export class SlashCommand extends Command {
  public async chatInputRun(interaction: ChatInputCommandInteraction) {
    const tip = interaction.options.getNumber('tip', true);
    const tipMessage = this.container.tips.tips.get(tip);

    if (!tipMessage)
      return interaction.reply({
        content: `Tip #${tip} is not indexed. A staff member can right-click that tip and use **Index tip**.`,
        flags: MessageFlags.Ephemeral
      });

    const description =
      tipMessage.content.length > 4096 ? `${tipMessage.content.slice(0, 4093)}...` : tipMessage.content;

    const embed = new EmbedBuilder()
      .setTitle(`Tip #${tip}`)
      .setDescription(description)
      .setColor(Colors.Blurple)
      .setURL(tipMessage.url);

    return interaction.reply({
      embeds: [embed]
    });
  }

  public async contextMenuRun(interaction: Command.ContextMenuCommandInteraction) {
    if (!interaction.isMessageContextMenuCommand()) return;

    const member = interaction.member;
    if (!member || !hasRole(member, this.container.config.roles.staff)) {
      return interaction.reply({
        content: 'You are missing permissions to use this.',
        flags: MessageFlags.Ephemeral
      });
    }

    if (interaction.channelId !== this.container.config.channels.tips) {
      return interaction.reply({
        content: 'Use this on a message in the tips channel.',
        flags: MessageFlags.Ephemeral
      });
    }

    const content = interaction.targetMessage.content;
    const tip = parseTipNumber(content);
    if (tip == null) {
      return interaction.reply({
        content: 'That message does not start with a tip number (`tip #1`).',
        flags: MessageFlags.Ephemeral
      });
    }

    await this.container.tips.save(tip, { content, url: interaction.targetMessage.url });
    return interaction.reply({
      content: `Saved tip #${tip}.`,
      flags: MessageFlags.Ephemeral
    });
  }

  public registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .setDMPermission(false)
        .addNumberOption((option) => option.setName('tip').setDescription('The tip to show.').setRequired(true))
    );

    registry.registerContextMenuCommand((builder) =>
      builder.setName('Index tip').setType(ApplicationCommandType.Message).setDMPermission(false)
    );
  }
}
