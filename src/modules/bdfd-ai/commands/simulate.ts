import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ApplicationCommandType, MessageFlags } from 'discord.js';
import { extractBdscriptCode } from '@lib/command-utils/bdfd-ai/check-code.utils.js';
import {
  buildSimulateModal,
  replyWithSimulation,
  SIMULATE_CODE_MAX_LENGTH
} from '@lib/command-utils/bdfd-ai/simulate.utils.js';

@ApplyOptions<Command.Options>({
  name: 'simulate',
  description: 'Run BDScript code and see what your bot would send — nothing is actually done.',
  cooldownDelay: 3000
})
export class SimulateCommand extends Command {
  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const code = interaction.options.getString('code')?.trim();
    const args = interaction.options.getString('message')?.trim() ?? '';

    // Slash options are single-line, so multi-line code goes through the modal instead.
    if (!code) {
      return interaction.showModal(buildSimulateModal('', args));
    }

    return replyWithSimulation(interaction, code, args, this.container.rag.bdscriptFunctionIndex);
  }

  public async contextMenuRun(interaction: Command.ContextMenuCommandInteraction) {
    if (!interaction.isMessageContextMenuCommand()) return;

    const code = extractBdscriptCode(interaction.targetMessage.content ?? '');
    if (!code) {
      return interaction.reply({ content: 'That message has no code to simulate.', flags: MessageFlags.Ephemeral });
    }

    // Open the form pre-filled, so the user can add what `$message` should be before running it.
    return interaction.showModal(buildSimulateModal(code));
  }

  public registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .setDMPermission(false)
        .addStringOption((option) =>
          option
            .setName('code')
            .setDescription('Single-line code. Leave empty to paste multi-line code in a form.')
            .setRequired(false)
            .setMaxLength(SIMULATE_CODE_MAX_LENGTH)
        )
        .addStringOption((option) =>
          option
            .setName('message')
            .setDescription('What the user typed after the trigger — what $message returns.')
            .setRequired(false)
            .setMaxLength(1000)
        )
    );

    registry.registerContextMenuCommand((builder) =>
      builder.setName('Simulate BDScript').setType(ApplicationCommandType.Message).setDMPermission(false)
    );
  }
}
