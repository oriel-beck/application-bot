import { QuestionCustomIDs } from "@lib/constants/custom-ids.js";
import { hasRole } from "@lib/precondition-util.js";
import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import { MessageFlags, type ButtonInteraction } from "discord.js";

const PREFIX = `${QuestionCustomIDs.buttons.delete}:`;

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.Button
})
export class DeleteButtonHandler extends InteractionHandler {
    public async run(interaction: ButtonInteraction) {
        if (!hasRole(interaction.member!, this.container.config.roles.mod)) {
            return interaction.reply({
                content: 'You are missing permissions to use this.',
                flags: MessageFlags.Ephemeral
            });
        }
        
        if (!interaction.customId.startsWith(PREFIX)) {
            return;
        }
        const question = interaction.customId.slice(PREFIX.length);

        const deleted = await this.container.questions.delete(question).catch(() => null);

        if (!deleted || !deleted.rowCount) {
            return interaction.reply({
                content: 'Failed to delete the question.',
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.deferUpdate();

        return interaction.update({
            embeds: [{
                description: `Deleted question \`${question}\`.`,
            }],
            components: []
        });
    }

    public parse(interaction: ButtonInteraction) {
        return interaction.customId.startsWith(PREFIX) ? this.some() : this.none();
    }
}
