import { container } from '@sapphire/framework';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, EmbedBuilder } from 'discord.js';
import { ForumCustomIDs } from '@lib/constants/custom-ids.js';
import { detectInternationalSupportLanguage, getInternationalSupportStrings } from './international-support.i18n.js';

export function generateInternationalPostHelpEmbed(appliedTags: string[]) {
  const locale = detectInternationalSupportLanguage(appliedTags);
  const strings = getInternationalSupportStrings(locale);

  const embed = new EmbedBuilder()
    .setTitle(strings.embedTitle)
    .setDescription(`${strings.embedDescription}\n\n${strings.aiInvokeHint}`)
    .setColor(Colors.Blurple)
    .setFooter({ text: strings.footer });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${ForumCustomIDs.supportResolve}:${container.config.international_support_tags.resolved}`)
      .setLabel(strings.resolveButton)
      .setStyle(ButtonStyle.Success)
  );

  return { row, embed, locale, strings };
}
