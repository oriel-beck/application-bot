import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { QuestionCustomIDs } from '@lib/constants/custom-ids.js';
import { MessageFlags, type ModalSubmitInteraction } from 'discord.js';

const PREFIX = `${QuestionCustomIDs.modals.edit}:`;

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class EditModalHandler extends InteractionHandler {
  public async run(interaction: ModalSubmitInteraction) {
    const id = interaction.customId.slice(PREFIX.length);
    const question = interaction.fields.getTextInputValue('question');

    const edit = await this.container.questions.update(id, 'question', question).catch(() => null);

    if (!edit) {
      return interaction.reply({
        content: `Failed to edit question \`${id}\`.`,
        flags: MessageFlags.Ephemeral
      });
    }

    return interaction.reply({
      content: `Edited question \`${id}\`.`,
      flags: MessageFlags.Ephemeral
    });
  }

  public parse(interaction: ModalSubmitInteraction) {
    return interaction.customId.startsWith(PREFIX) ? this.some() : this.none();
  }
}
