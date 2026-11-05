import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ApplicationCommandType, MessageFlags } from 'discord.js';
import {
  buildCheckCodeModal,
  buildCheckCodeResult,
  CHECK_CODE_MAX_LENGTH,
  extractBdscriptCode
} from '@lib/command-utils/bdfd-ai/check-code.utils.js';

@ApplyOptions<Command.Options>({
  name: 'check-code',
  description: 'Check BDScript code for unknown functions, wrong argument counts and unescaped ; or ].',
  cooldownDelay: 3000
})
export class CheckCodeCommand extends Command {
  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const code = interaction.options.getString('code')?.trim();

    // Slash options are single-line, so multi-line code goes through the modal instead.
    if (!code) {
      return interaction.showModal(buildCheckCodeModal());
    }

    return interaction.reply({
      ...buildCheckCodeResult(code, this.container.rag.bdscriptFunctionIndex),
      flags: MessageFlags.Ephemeral
    });
  }

  public async contextMenuRun(interaction: Command.ContextMenuCommandInteraction) {
    if (!interaction.isMessageContextMenuCommand()) return;

    const code = extractBdscriptCode(interaction.targetMessage.content ?? '');
    if (!code) {
      return interaction.reply({
        content: 'That message has no text to check.',
        flags: MessageFlags.Ephemeral
      });
    }

    return interaction.reply({
      ...buildCheckCodeResult(code, this.container.rag.bdscriptFunctionIndex),
      flags: MessageFlags.Ephemeral
    });
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
            .setDescription('Single-line code to check. Leave empty to paste multi-line code in a form.')
            .setRequired(false)
            .setMaxLength(CHECK_CODE_MAX_LENGTH)
        )
    );

    registry.registerContextMenuCommand((builder) =>
      builder.setName('Check BDScript').setType(ApplicationCommandType.Message).setDMPermission(false)
    );
  }
}
