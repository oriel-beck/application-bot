import { ButtonStyle, StringSelectMenuBuilder } from 'discord.js';
import { ApplicationState } from './constants';
import { BDFDApplication } from '../entities';
import {
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
} from '@discordjs/builders';

export function generateApplicationListEmbed(
  count: number,
  state,
  page = 1,
): [EmbedBuilder] {
  state = state || ApplicationState.Pending;
  return [
    new EmbedBuilder()
      .setTitle('Applications list')
      .setDescription(
        `There are currently \`${count}\` applications \`${state}\`, page \`${page}/${
          count > 125 ? Math.ceil(count / 100) : 1
        }\``,
      ),
  ];
}

export function generateApplicationListComponents(
  applications: BDFDApplication[],
  count: number,
  page = 0,
): ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] {
  if (!count) return [];
  const buttons = [];
  const selectCount = Math.ceil(count / (count > 125 ? 100 : 125));

  const selects: ActionRowBuilder<StringSelectMenuBuilder>[] = Array.from(
    {
      length: selectCount > 5 ? 4 : selectCount,
    },
    (_, i) =>
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`app-list-${i}`)
          .setPlaceholder('Select an application to view')
          .addOptions(
            applications.splice(0, 25).map((app) => ({
              label: `Application from ${app.userid}`,
              value: app.userid.toString(),
              description: `Click to view the application of ${app.userid}`,
            })),
          ),
      ),
  );

  if (count > 125) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`app-list-prev-${page}`)
        // TODO: find a prev emoji
        .setLabel('Prev')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === 0),
    );

    buttons.push(
      new ButtonBuilder()
        .setCustomId(`app-list-next-${page}`)
        .setLabel('Next')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(Math.ceil(count / 100) === page),
    );
  }
  return selects.concat(buttons);
}
