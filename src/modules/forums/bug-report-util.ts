import { container } from '@sapphire/framework';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, EmbedBuilder } from 'discord.js';
import { ForumCustomIDs } from '@lib/constants/custom-ids.js';

const EVIDENCE = '` ● ` Please send videos and/or photos that clearly show the bug.';

export function isBugReportsForum(parentChannelId: string | undefined): boolean {
  return parentChannelId === container.config.channels.bug_reports;
}

export function generateBugReportHelpEmbed(appliedTags: string[]) {
  const tags = container.config.bug_report_tags;
  const topicTags = [tags.website, tags.app, tags.bdl, tags.bdfd_wiki, tags.flowcharts] as const;

  let warning: string | undefined;
  const amountOfTopicTags = topicTags.reduce(
    (current, value) => (appliedTags.includes(value) ? current + 1 : current),
    0
  );
  if (!amountOfTopicTags)
    warning =
      'You cannot have a post without a topic tag (`Website`, `App`, `BDL`, `BDFD Wiki`, or `Flowcharts`), please apply the appropriate tag to your post';
  if (amountOfTopicTags > 1)
    warning =
      'You cannot have a post with multiple topic tags, please use only one of `Website`, `App`, `BDL`, `BDFD Wiki`, or `Flowcharts`.';

  const embed = new EmbedBuilder().setTitle('BDFD Bug Report').setColor(Colors.Blurple);
  if (warning) embed.setDescription(`⚠️ ${warning}`);

  if (appliedTags.includes(tags.website))
    embed.addFields({
      name: 'Website',
      value: EVIDENCE
    });
  if (appliedTags.includes(tags.app))
    embed.addFields({
      name: 'App',
      value:
        '` ● ` Include your phone model (for example iPhone 15 or Samsung Galaxy S24).\n` ● ` Include your Android or iOS version.\n` ● ` Include the BDFD app version.\nHow to find the app version: open the BDFD app → Settings → tap the information (i) icon → copy the app version shown there.\n' +
        EVIDENCE
    });
  if (appliedTags.includes(tags.bdl))
    embed.addFields({
      name: 'BDL',
      value: EVIDENCE
    });
  if (appliedTags.includes(tags.bdfd_wiki))
    embed.addFields({
      name: 'BDFD Wiki',
      value: EVIDENCE
    });
  if (appliedTags.includes(tags.flowcharts))
    embed.addFields({
      name: 'Flowcharts',
      value: EVIDENCE
    });

  embed.setFooter({
    text: 'Do not try to hoist your post in any channel in the server, this is against our rules and you will receive a warning if you do so.'
  });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents([
    new ButtonBuilder()
      .setCustomId(`${ForumCustomIDs.bugClose}:${tags.resolved}`)
      .setLabel('Resolved')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`${ForumCustomIDs.bugClose}:${tags.not_a_bug}`)
      .setLabel('Not a bug')
      .setStyle(ButtonStyle.Danger)
  ]);

  return { row, embed };
}

export function bugReportResolvedEmbed() {
  return new EmbedBuilder()
    .setTitle('Resolved')
    .setDescription(
      'Your post has been resolved, locked, and archived, if there are additional issues please open a new post.'
    )
    .setFooter({ text: 'Thank you for using BDFD! ❤️' })
    .setColor(Colors.Green);
}

export function bugReportNotABugEmbed() {
  return new EmbedBuilder()
    .setTitle('Not a Bug')
    .setDescription(
      'This post has been marked as not a bug, locked, and archived. If you still need help, please open a new post.'
    )
    .setFooter({ text: 'Thank you for using BDFD! ❤️' })
    .setColor(Colors.Red);
}

export function bugReportResolvedDm(guildName: string, url: string) {
  return `Your post in ${guildName} was resolved, you can return to read your post at any time in ${url}.`;
}

export function bugReportNotABugDm(guildName: string, url: string) {
  return `Your post in ${guildName} was marked as not a bug, you can return to read your post at any time in ${url}.`;
}
