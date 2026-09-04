import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { ShareCustomIDs } from '../../constants/custom-ids.js';

export function generateStickyMessageEmbed(): EmbedBuilder[] {
  return [
    new EmbedBuilder()
      .setTitle('Bot Sharing Channel')
      .setDescription(
        'The bot sharing channel is intended for sharing (advertising) your own bots on our server as long as you follow the sharing rules.'
      )
      .setColor(0x738ed1),
    new EmbedBuilder()
      .setDescription(
        "- Your ad must comply with our server <#594598851155984426>.\n- A bot must be only made with the use of BDFD.\n- Only single user can advertise a particular bot.\n- Once you posted your ad, you gain a cooldown for 24 hours. Don't try to post more, our automod won't let you. \n- Don't include invite links to any Discord server in your ads, this rule also applies to your bot's invite link redirections and ad banners.\n- Don't use url shorteners for links in your ad.\n- Provide proper information about your bot.\n\nClick the button below for additional information and mini FAQ."
      )
      .setColor(0x738ed1)
  ];
}

export function generateStickyMessageComponents(): ActionRowBuilder<ButtonBuilder>[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(ShareCustomIDs.stickyAdditions)
        .setLabel('Additions')
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

export function generateStickyMessageAdditionsEmbeds(): EmbedBuilder[] {
  return [
    new EmbedBuilder()
      .setTitle('Additions')
      .setDescription(
        "- I posted my ad but typed something wrong, what should I do? — You can edit your ad message at any time. Deleting your ad is a bad option because you will still be on a cooldown.\n- Referring to the previous point, what should I do if I still deleted my ad? — You can contact a moderator to ask for a cooldown removal but a moderator allowed to refuse in it for a reason.\n- Am I allowed to use my bot's top.gg page as the bot invite? — Yes, you are.\n- Although the rules say that a bot must be only made with the use of BDFD, you're allowed to use APIs but with one restriction. You aren't allowed to use __any__ APIs which require a bot's token.\n- Providing proper information about your bot means describing what your bot does and the interaction way (slash or text commands)."
      )
      .setColor(0x738ed1)
  ];
}
