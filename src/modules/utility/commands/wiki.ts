import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import {
  ApplicationCommandType,
  AttachmentBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
  type Message
} from 'discord.js';

function wikiText(message: Pick<Message, 'content' | 'embeds'>): string | null {
  const description = message.embeds[0]?.description?.trim();
  if (description) return description;
  const content = message.content?.trim();
  return content || null;
}

@ApplyOptions<Command.Options>({
  name: 'wiki',
  description: 'Gets the appropriate wiki as text from wikis.',
  cooldownDelay: 10000
})
export class SlashCommand extends Command {
  public async chatInputRun(interaction: ChatInputCommandInteraction) {
    const message_url = interaction.options.getString('message_url', true);
    const regex = message_url.match(
      /^https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/channels\/(\d{17,})\/(\d{17,})\/(\d{17,})$/i
    );
    if (!regex)
      return interaction.reply({
        content: 'This is not a valid url.',
        flags: MessageFlags.Ephemeral
      });

    if (regex[1] !== interaction.guild?.id)
      return interaction.reply({
        content: 'This is not a valid wiki url.',
        flags: MessageFlags.Ephemeral
      });

    if (regex[2] !== this.container.config.channels.wiki)
      return interaction.reply({
        content: 'This is not a valid wiki url.',
        flags: MessageFlags.Ephemeral
      });

    const channel = interaction.guild.channels.cache.get(this.container.config.channels.wiki);
    if (!channel?.isTextBased())
      return interaction.reply({
        content: 'This is not a valid wiki url.',
        flags: MessageFlags.Ephemeral
      });

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const msg = await channel.messages.fetch(regex[3]!).catch(() => null);

    if (!msg)
      return interaction.editReply({
        content: 'Failed to fetch the message.'
      });

    const text = wikiText(msg);
    if (!text)
      return interaction.editReply({
        content: "I can't read that wiki message. Right-click it and use **Wiki as text**."
      });

    return interaction.editReply({
      files: [new AttachmentBuilder(Buffer.from(text), { name: 'wiki.txt' })]
    });
  }

  public async contextMenuRun(interaction: Command.ContextMenuCommandInteraction) {
    if (!interaction.isMessageContextMenuCommand()) return;

    if (interaction.channelId !== this.container.config.channels.wiki) {
      return interaction.reply({
        content: 'Use this on a message in the wiki channel.',
        flags: MessageFlags.Ephemeral
      });
    }

    const text = wikiText(interaction.targetMessage);
    if (!text) {
      return interaction.reply({
        content: 'That message has no wiki text.',
        flags: MessageFlags.Ephemeral
      });
    }

    return interaction.reply({
      files: [new AttachmentBuilder(Buffer.from(text), { name: 'wiki.txt' })],
      flags: MessageFlags.Ephemeral
    });
  }

  public registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .setDMPermission(false)
        .addStringOption((option) =>
          option.setName('message_url').setDescription('The url of the wiki to get.').setRequired(true)
        )
    );

    registry.registerContextMenuCommand((builder) =>
      builder.setName('Wiki as text').setType(ApplicationCommandType.Message).setDMPermission(false)
    );
  }
}
