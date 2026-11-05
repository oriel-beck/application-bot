import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  EmbedBuilder,
  ModalBuilder,
  parseEmoji,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
  type ChatInputCommandInteraction,
  type Guild,
  type InteractionEditReplyOptions,
  type ModalSubmitInteraction,
  type MessageActionRowComponentBuilder,
  type User
} from 'discord.js';
import type { BdscriptFunctionIndex } from '@lib/bdfd-ai/bdscript-function-index.js';
import { simulateBdscript } from '@lib/bdscript-sim/interpreter.js';
import type { SimComponentRow, SimContext, SimEmbed, SimResult, SimUser } from '@lib/bdscript-sim/types.js';
import { SimulateCustomIDs } from '@lib/constants/custom-ids.js';

/** Discord's max length for a paragraph text input. */
export const SIMULATE_CODE_MAX_LENGTH = 4000;
const ARGS_MAX_LENGTH = 1000;
/** Users fetched for `$username[ID]` & co.; more IDs than this stay "not simulated". */
const MAX_RESOLVED_USERS = 10;
const FIELD_VALUE_MAX = 1024;
/** Discord's limit on the combined text of all embeds in one message. */
const EMBED_TOTAL_MAX = 6000;
/** Room kept for the report embed out of `EMBED_TOTAL_MAX`. */
const REPORT_BUDGET = 2500;

const BUTTON_STYLES = {
  primary: ButtonStyle.Primary,
  secondary: ButtonStyle.Secondary,
  success: ButtonStyle.Success,
  danger: ButtonStyle.Danger,
  link: ButtonStyle.Link
} as const;

export function buildSimulateModal(code = '', args = ''): ModalBuilder {
  const codeInput = new TextInputBuilder()
    .setCustomId(SimulateCustomIDs.inputs.code)
    .setLabel('BDScript code')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('$nomention\nHello $username! You said: $message')
    .setMaxLength(SIMULATE_CODE_MAX_LENGTH)
    .setRequired(true);
  if (code) codeInput.setValue(code.slice(0, SIMULATE_CODE_MAX_LENGTH));

  return new ModalBuilder()
    .setCustomId(SimulateCustomIDs.modals.code)
    .setTitle('Simulate BDScript')
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(codeInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(SimulateCustomIDs.inputs.args)
          .setLabel('Message after the trigger ($message)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('hello <@123456789012345678>')
          .setMaxLength(ARGS_MAX_LENGTH)
          .setRequired(false)
          .setValue(args.slice(0, ARGS_MAX_LENGTH))
      )
    );
}

function simUser(user: User, nickname: string | null = null, displayName?: string): SimUser {
  return {
    id: user.id,
    username: user.username,
    displayName: displayName ?? user.displayName,
    nickname,
    avatarUrl: user.displayAvatarURL()
  };
}

/**
 * The invoking user is the command's author. Users mentioned in the args or whose IDs appear
 * in the code are fetched too, so `$username[ID]` can resolve them.
 */
export async function buildSimContext(options: {
  user: User;
  guild: Guild;
  channel: { id: string; name: string };
  code: string;
  args: string;
}): Promise<SimContext> {
  const { user, guild, channel, code, args } = options;
  const ids = [...new Set([...`${args}\n${code}`.matchAll(/(?<![\d])(\d{17,20})(?!\d)/g)].map((m) => m[1]!))]
    .filter((id) => id !== user.id)
    .slice(0, MAX_RESOLVED_USERS);

  const users = new Map<string, SimUser>();
  const author = await guild.members.fetch(user.id).catch(() => null);
  users.set(user.id, author ? simUser(user, author.nickname, author.displayName) : simUser(user));

  await Promise.all(
    ids.map(async (id) => {
      const member = await guild.members.fetch(id).catch(() => null);
      if (member) {
        users.set(id, simUser(member.user, member.nickname, member.displayName));
        return;
      }
      const found = await guild.client.users.fetch(id).catch(() => null);
      if (found) users.set(id, simUser(found));
    })
  );

  return {
    author: users.get(user.id)!,
    users,
    channel,
    guild: { id: guild.id, name: guild.name, memberCount: guild.memberCount },
    args,
    now: new Date(),
    random: Math.random
  };
}

const isHttpUrl = (value: string | undefined): value is string => !!value && /^https?:\/\/\S+$/i.test(value);

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Simulated embed → real embed, dropping what Discord would reject (and noting it). */
function toEmbed(embed: SimEmbed, notes: string[]): EmbedBuilder {
  const out = new EmbedBuilder();
  if (embed.title) out.setTitle(clip(embed.title, 256));
  if (embed.description) out.setDescription(clip(embed.description, 4096));
  if (embed.color !== undefined) out.setColor(Math.max(0, Math.min(0xffffff, embed.color)));
  if (embed.footer)
    out.setFooter({
      text: clip(embed.footer, 2048),
      iconURL: isHttpUrl(embed.footerIcon) ? embed.footerIcon : undefined
    });
  if (embed.author) {
    out.setAuthor({
      name: clip(embed.author, 256),
      iconURL: isHttpUrl(embed.authorIcon) ? embed.authorIcon : undefined,
      url: isHttpUrl(embed.authorUrl) ? embed.authorUrl : undefined
    });
  }
  if (embed.timestamp) out.setTimestamp(embed.timestamp);
  for (const [key, set] of [
    ['url', (u: string) => out.setURL(u)],
    ['thumbnail', (u: string) => out.setThumbnail(u)],
    ['image', (u: string) => out.setImage(u)]
  ] as const) {
    const value = embed[key];
    if (value === undefined) continue;
    if (isHttpUrl(value)) set(value);
    else notes.push(`Embed ${key} \`${clip(value, 100)}\` isn't a URL, so it was left out.`);
  }
  if (embed.fields.length) {
    out.addFields(
      embed.fields.map((f) => ({
        name: clip(f.name || '​', 256),
        value: clip(f.value || '​', FIELD_VALUE_MAX),
        inline: f.inline
      }))
    );
  }
  return out;
}

function embedLength(embed: EmbedBuilder): number {
  const d = embed.data;
  return (
    (d.title?.length ?? 0) +
    (d.description?.length ?? 0) +
    (d.footer?.text.length ?? 0) +
    (d.author?.name.length ?? 0) +
    (d.fields ?? []).reduce((n, f) => n + f.name.length + f.value.length, 0)
  );
}

/** Simulated rows → real, disabled components. Unrenderable ones (e.g. an empty menu) are noted instead. */
function toComponents(rows: SimComponentRow[], notes: string[]): ActionRowBuilder<MessageActionRowComponentBuilder>[] {
  const out: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [];
  rows.forEach((row, r) => {
    if (row.type === 'buttons') {
      const buttons = row.buttons.map((b, i) => {
        const button = new ButtonBuilder().setStyle(BUTTON_STYLES[b.style]).setDisabled(true);
        if (b.style === 'link') button.setURL(b.id);
        else button.setCustomId(`${SimulateCustomIDs.output}:${r}:${i}`);
        const emoji = b.emoji ? parseEmoji(b.emoji) : null;
        if (emoji)
          button.setEmoji({ id: emoji.id ?? undefined, name: emoji.name ?? undefined, animated: emoji.animated });
        // Discord needs a label or an emoji.
        if (b.label || !emoji) button.setLabel(clip(b.label || '​', 80));
        return button;
      });
      out.push(new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(buttons));
      return;
    }

    const { menu } = row;
    if (!menu.options.length) {
      notes.push(`Select menu \`${menu.id}\` has no options, so Discord can't show it.`);
      return;
    }
    const options = menu.options.slice(0, 25);
    const select = new StringSelectMenuBuilder()
      .setCustomId(`${SimulateCustomIDs.output}:${r}`)
      .setDisabled(true)
      .setMinValues(Math.min(Math.max(0, menu.min), options.length))
      .setMaxValues(Math.min(Math.max(1, menu.max), options.length))
      .addOptions(
        options.map((o, i) => ({
          label: clip(o.label || '​', 100),
          // Option values must be unique; the simulated value only matters for display.
          value: `${i}:${clip(o.value, 90)}`,
          description: o.description ? clip(o.description, 100) : undefined,
          default: o.default
        }))
      );
    if (menu.placeholder) select.setPlaceholder(clip(menu.placeholder, 150));
    out.push(new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(select));
  });
  return out;
}

/** List lines that fit in one embed field, with an "…and N more" tail. */
function listField(items: string[]): string {
  const lines: string[] = [];
  let length = 0;
  for (const [i, item] of items.entries()) {
    const line = `- ${clip(item, 300)}`;
    const tail = `\n…and ${items.length - i} more`;
    if (length + line.length + 1 + tail.length > FIELD_VALUE_MAX) {
      lines.push(tail.trim());
      break;
    }
    lines.push(line);
    length += line.length + 1;
  }
  return lines.join('\n');
}

const OUTCOME: Record<NonNullable<SimResult['stoppedBy']> | 'done', { text: string; color: number }> = {
  done: { text: 'Ran to the end.', color: Colors.Green },
  stop: { text: 'Stopped by `$stop` — output up to that point is sent.', color: Colors.Green },
  onlyIf: { text: '`$onlyIf` failed — only its error message is sent.', color: Colors.Yellow },
  argsCheck: { text: '`$argsCheck` failed — only its error message is sent.', color: Colors.Yellow },
  error: { text: 'Errored — BDFD sends the error above instead of the response.', color: Colors.Red },
  unsupported: { text: 'Simulation stopped early.', color: Colors.Grey }
};

function buildReport(result: SimResult, channelName: string, notes: string[]): EmbedBuilder {
  const outcome = OUTCOME[result.stoppedBy ?? 'done'];
  const outcomeText =
    result.stoppedBy === 'unsupported'
      ? `${outcome.text} ${result.unsupportedReason}, so it can't tell what runs next. Output up to that point is shown.`
      : outcome.text;
  const embed = new EmbedBuilder()
    .setTitle('BDScript simulation')
    .setColor(outcome.color)
    .setDescription(
      `${outcomeText}\n\nEverything above this embed is what the command would send` +
        (result.content || result.embeds.length || result.components.length ? '.' : ' — here, nothing.')
    )
    .setFooter({
      text: `Simulated with you as the author in #${channelName}. Nothing was actually done. Real BDFD output can differ in edge cases.`
    });

  if (result.sideEffects.length) {
    embed.addFields({ name: 'Would also do (not performed)', value: listField(result.sideEffects) });
  }
  if (result.notSimulated.length) {
    embed.addFields({ name: 'Not simulated', value: listField(result.notSimulated) });
  }
  if (notes.length) embed.addFields({ name: 'Notes', value: listField(notes) });
  return embed;
}

/** Ephemeral reply: the simulated message itself, followed by a report embed. Mentions never ping. */
export function buildSimulationReply(result: SimResult, channelName: string): InteractionEditReplyOptions {
  const notes = [...result.notes];
  const embeds: EmbedBuilder[] = [];
  let budget = EMBED_TOTAL_MAX - REPORT_BUDGET;
  for (const sim of result.embeds.slice(0, 9)) {
    const embed = toEmbed(sim, notes);
    const length = embedLength(embed);
    if (length > budget) {
      notes.push("Some embeds were left out: together they exceed Discord's 6000-character limit.");
      break;
    }
    budget -= length;
    embeds.push(embed);
  }
  const components = toComponents(result.components, notes);

  return {
    content: result.content || undefined,
    embeds: [...embeds, buildReport(result, channelName, notes)],
    components,
    allowedMentions: { parse: [] }
  };
}

/** Fallback when Discord rejects the rendered output (e.g. an emoji it doesn't know). */
export function buildSimulationFallback(
  result: SimResult,
  channelName: string,
  error: unknown
): InteractionEditReplyOptions {
  const notes = [
    `Discord rejected the simulated embeds/components, so only the text is shown: ${clip(String(error instanceof Error ? error.message : error), 300)}`,
    ...result.notes
  ];
  return {
    content: result.content || undefined,
    embeds: [buildReport(result, channelName, notes)],
    allowedMentions: { parse: [] }
  };
}

/** Run `code` as if the interaction's user sent the command with `args`, and reply ephemerally. */
export async function replyWithSimulation(
  interaction: ChatInputCommandInteraction | ModalSubmitInteraction,
  code: string,
  args: string,
  index: BdscriptFunctionIndex
): Promise<void> {
  if (index.size === 0) {
    await interaction.reply({
      content: 'The BDScript function list is unavailable right now. Try again later.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }
  if (!interaction.inCachedGuild()) {
    await interaction.reply({ content: 'This only works in a server.', flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const channel = interaction.channel;
  const channelInfo = {
    id: interaction.channelId ?? '',
    name: channel && 'name' in channel ? channel.name : 'unknown'
  };
  const ctx = await buildSimContext({
    user: interaction.user,
    guild: interaction.guild,
    channel: channelInfo,
    code,
    args
  });
  const result = simulateBdscript(code, ctx, index);

  await interaction.editReply(buildSimulationReply(result, channelInfo.name)).catch(async (err: unknown) => {
    await interaction.editReply({ ...buildSimulationFallback(result, channelInfo.name, err), components: [] });
  });
}
