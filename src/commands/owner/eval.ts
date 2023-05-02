import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { Colors } from 'discord.js';
import { inspect } from 'util';

@ApplyOptions<Command.Options>({
  name: 'eval',
  description: 'Evaluate JS code.'
})
export class SlashCommand extends Command {
  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const ephemeral = !!interaction.options.getBoolean('ephemeral', false);
    await interaction.deferReply({ ephemeral });

    let code = interaction.options.getString('code', true);
    const hidden = !!interaction.options.getBoolean('hidden', false);
    const async = !!interaction.options.getBoolean('async', false);
    const depth = interaction.options.getNumber('depth', false) ?? 0;

    if (async) code = `(async () => { ${code} })`;

    let result;
    let error = false;

    try {
      result = async ? await eval(code) : eval(code)
    } catch (err) {
      error = true;
      result = err;
    }

    result = inspect(result, hidden, depth);

    return interaction.editReply({
      embeds: [
        {
          title: error ? 'Error accured' : 'Result:',
          description: `\`\`\`js\n${result}\n\`\`\``,
          color: error ? Colors.Red : Colors.Green
        }
      ]
    })
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