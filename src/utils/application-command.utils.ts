import {
  APIMessageComponentEmoji,
  ButtonStyle,
  StringSelectMenuBuilder,
} from 'discord.js';
import {
  ApplicationCommandListEmbedFunctionResponses,
  ApplicationCommandListEmbedResponses,
  ApplicationListCommandComponentsFunctionResponses,
  ApplicationListCommandComponentsResponses,
  ApplicationState,
} from '../constants';
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
  state ||= ApplicationState.Pending;
  return [
    new EmbedBuilder()
      .setTitle(ApplicationCommandListEmbedResponses.Title)
      .setDescription(
        ApplicationCommandListEmbedFunctionResponses.description(
          count,
          state,
          page,
        ),
      ),
  ];
}

export function generateApplicationListComponents(
  applications: BDFDApplication[],
  count: number,
  prevEmoji: APIMessageComponentEmoji,
  nextEmoji: APIMessageComponentEmoji,
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
          .setPlaceholder(ApplicationListCommandComponentsResponses.Placeholder)
          .addOptions(
            applications.splice(0, 25).map((app) => ({
              label:
                ApplicationListCommandComponentsFunctionResponses.selectLabel(
                  app.userid,
                ),
              value: app.userid.toString(),
              description:
                ApplicationListCommandComponentsFunctionResponses.selectDescription(
                  app.userid,
                ),
            })),
          ),
      ),
  );

  if (count > 125) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`app-list-prev-${page}`)
        .setLabel(prevEmoji.id ? null : 'Prev')
        .setEmoji(prevEmoji.id ? prevEmoji : null)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === 0),
    );

    buttons.push(
      new ButtonBuilder()
        .setCustomId(`app-list-next-${page}`)
        .setLabel(nextEmoji.id ? null : 'Next')
        .setEmoji(nextEmoji.id ? nextEmoji : null)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(Math.ceil(count / 100) === page),
    );
  }
  return selects.concat(buttons);
}
