import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { MessageFlags, type ModalSubmitInteraction } from 'discord.js';
import { extractBdscriptCode } from '@lib/command-utils/bdfd-ai/check-code.utils.js';
import { replyWithSimulation } from '@lib/command-utils/bdfd-ai/simulate.utils.js';
import { SimulateCustomIDs } from '@lib/constants/custom-ids.js';

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class SimulateModalHandler extends InteractionHandler {
  public async run(interaction: ModalSubmitInteraction) {
    const code = extractBdscriptCode(interaction.fields.getTextInputValue(SimulateCustomIDs.inputs.code));
    if (!code) {
      await interaction.reply({ content: 'Please paste some code to simulate.', flags: MessageFlags.Ephemeral });
      return;
    }

    const args = interaction.fields.getTextInputValue(SimulateCustomIDs.inputs.args).trim();
    await replyWithSimulation(interaction, code, args, this.container.rag.bdscriptFunctionIndex);
  }

  public parse(interaction: ModalSubmitInteraction) {
    return interaction.customId === SimulateCustomIDs.modals.code ? this.some() : this.none();
  }
}
