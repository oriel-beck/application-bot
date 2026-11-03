import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { MessageFlags, type ModalSubmitInteraction } from 'discord.js';
import { buildCheckCodeResult, extractBdscriptCode } from '@lib/command-utils/bdfd-ai/check-code.utils.js';
import { CheckCodeCustomIDs } from '@lib/constants/custom-ids.js';

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class CheckCodeModalHandler extends InteractionHandler {
  public async run(interaction: ModalSubmitInteraction) {
    const code = extractBdscriptCode(interaction.fields.getTextInputValue(CheckCodeCustomIDs.inputs.code));
    if (!code) {
      await interaction.reply({ content: 'Please paste some code to check.', flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.reply({
      ...buildCheckCodeResult(code, this.container.rag.bdscriptFunctionIndex),
      flags: MessageFlags.Ephemeral
    });
  }

  public parse(interaction: ModalSubmitInteraction) {
    return interaction.customId === CheckCodeCustomIDs.modals.code ? this.some() : this.none();
  }
}
