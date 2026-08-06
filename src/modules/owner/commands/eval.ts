import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { Colors, MessageFlags } from 'discord.js';
import { inspect } from 'util';

const EVAL_EMBED_MAX_DESCRIPTION = 3900;
const EVAL_CODE_BLOCK_PREFIX = '```js\n';
const EVAL_CODE_BLOCK_SUFFIX = '\n```';

function truncateInspectForEmbedDescription(inspected: string): string {
  const overhead = EVAL_CODE_BLOCK_PREFIX.length + EVAL_CODE_BLOCK_SUFFIX.length;
  const maxBody = EVAL_EMBED_MAX_DESCRIPTION - overhead;
  if (inspected.length <= maxBody) return inspected;
  const ellipsis = '\n...(truncated)';
  const allowed = maxBody - ellipsis.length;
  return `${inspected.slice(0, Math.max(0, allowed))}${ellipsis}`;
}

@ApplyOptions<Command.Options>({
  name: 'eval',
  description: 'Evaluate JS code.',
  preconditions: ['OwnerOnly']
})
export class SlashCommand extends Command {
  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const ephemeral = !!interaction.options.getBoolean('ephemeral', false);
    await interaction.deferReply({ flags: ephemeral ? MessageFlags.Ephemeral : undefined });

    if (process.env.NODE_ENV === 'production' && process.env.EVAL_ENABLED !== 'true') {
      return interaction.editReply({
        content:
          'Eval is disabled in production. Set environment variable `EVAL_ENABLED=true` to enable it.'
      });
    }

    let code = interaction.options.getString('code', true);
    const hidden = !!interaction.options.getBoolean('hidden', false);
    const async = !!interaction.options.getBoolean('async', false);
    const depth = interaction.options.getNumber('depth', false) ?? 0;

    if (async) code = `(async () => { ${code} })()`;

    let result;
    let error = false;

    try {
      if (async) {
        result = await Promise.race([
          eval(code) as Promise<unknown>,
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Eval timed out after 10 seconds.')), 10_000);
          })
        ]);
      } else {
        result = eval(code);
      }
    } catch (err) {
      error = true;
      result = err;
    }

    result = truncateInspectForEmbedDescription(inspect(result, hidden, depth));

    return interaction.editReply({
      embeds: [
        {
          title: error ? 'Error occurred' : 'Result:',
          description: `${EVAL_CODE_BLOCK_PREFIX}${result}${EVAL_CODE_BLOCK_SUFFIX}`,
          color: error ? Colors.Red : Colors.Green
        }
      ]
    });
  }

  public registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption((option) =>
          option
            .setName('code')
            .setDescription('The code to execute.')
            .setRequired(true))
        .addBooleanOption((option) =>
          option
            .setName('hidden')
            .setDescription('Show hidden properties.')
            .setRequired(false))
        .addBooleanOption((option) =>
          option
            .setName('async')
            .setDescription('Run the code asynchronously.')
            .setRequired(false))
        .addBooleanOption((option) =>
          option
            .setName('ephemeral')
            .setDescription('Answer with an ephemeral message.')
            .setRequired(false))
        .addNumberOption((option) =>
          option
            .setName('depth')
            .setDescription('Set the depth to inspect.')
            .setRequired(false))
    );
  }
}
