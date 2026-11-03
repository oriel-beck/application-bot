import {
  ActionRowBuilder,
  AttachmentBuilder,
  Colors,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type InteractionReplyOptions
} from 'discord.js';
import type { BdscriptFunctionIndex } from '@lib/bdfd-ai/bdscript-function-index.js';
import { lintBdscript, type BdscriptDiagnostic } from '@lib/bdfd-ai/bdscript-validation.js';
import { DISCORD_EMBED_DESCRIPTION_MAX } from '@lib/bdfd-ai/response-utils.js';
import { CheckCodeCustomIDs } from '@lib/constants/custom-ids.js';

/** Discord's max length for a paragraph text input. */
export const CHECK_CODE_MAX_LENGTH = 4000;

const CODE_FENCE = /```[^\n`]*\n?([\s\S]*?)```/g;
const ATTACHMENT_FILENAME = 'bdscript-check.txt';

export function buildCheckCodeModal(): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(CheckCodeCustomIDs.modals.code)
    .setTitle('Check BDScript code')
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(CheckCodeCustomIDs.inputs.code)
          .setLabel('Your BDScript code')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('$argsCheck[2;Usage: !pay [@user\\] [amount\\]]')
          .setMaxLength(CHECK_CODE_MAX_LENGTH)
          .setRequired(true)
      )
    );
}

/** Code fence bodies if the text has any (so prose around them is ignored), otherwise the whole text. */
export function extractBdscriptCode(text: string): string {
  const fences = [...text.matchAll(CODE_FENCE)].map((match) => match[1]!.trim());
  return fences.length ? fences.join('\n') : text.trim();
}

function formatDiagnostic(diagnostic: BdscriptDiagnostic): string {
  return `**Line ${diagnostic.line}:${diagnostic.column}** — ${diagnostic.message}`;
}

/** Embed (plus a .txt attachment if the report is too long) listing every problem found in `code`. */
export function buildCheckCodeResult(
  code: string,
  index: BdscriptFunctionIndex
): Pick<InteractionReplyOptions, 'embeds' | 'files'> {
  const embed = new EmbedBuilder().setTitle('BDScript check');

  if (index.size === 0) {
    return {
      embeds: [
        embed
          .setColor(Colors.Grey)
          .setDescription('The BDScript function list is unavailable right now. Try again later.')
      ]
    };
  }

  const diagnostics = lintBdscript(code, index);
  if (!diagnostics.length) {
    return {
      embeds: [
        embed
          .setColor(Colors.Green)
          .setDescription(
            'No problems found. This checks function names, argument counts and `;` / `]` escaping only — ' +
              'it does not run your code.'
          )
      ]
    };
  }

  const header = `Found **${diagnostics.length}** problem(s):\n\n`;
  const body = diagnostics.map(formatDiagnostic).join('\n');
  embed.setColor(Colors.Red);

  if (header.length + body.length <= DISCORD_EMBED_DESCRIPTION_MAX) {
    return { embeds: [embed.setDescription(header + body)] };
  }

  const notice = `\n\n…full report attached as \`${ATTACHMENT_FILENAME}\`.`;
  const preview = body.slice(0, DISCORD_EMBED_DESCRIPTION_MAX - header.length - notice.length);
  const plain = diagnostics.map((d) => `Line ${d.line}:${d.column} — ${d.message}`).join('\n');
  return {
    embeds: [embed.setDescription(header + preview.slice(0, preview.lastIndexOf('\n') + 1) + notice)],
    files: [new AttachmentBuilder(Buffer.from(plain, 'utf-8'), { name: ATTACHMENT_FILENAME })]
  };
}
