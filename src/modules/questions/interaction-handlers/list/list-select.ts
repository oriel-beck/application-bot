import { generateQuestionShowComponents, generateQuestionShowEmbed } from "@lib/command-utils/question/show/question-show.utils.js";
import { QuestionCustomIDs } from "@lib/constants/custom-ids.js";
import { hasRole } from "@lib/precondition-util.js";
import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import type { StringSelectMenuInteraction } from "discord.js";
import type { Question } from "@lib/types.js";

const LIST_SEL_RE = /^q:list:sel:\d+$/;

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.SelectMenu,
})
export class QuestionListSelectHandler extends InteractionHandler {
    public async run(interaction: StringSelectMenuInteraction) {
        if (!hasRole(interaction.member!, this.container.config.roles.mod)) {
            return interaction.reply({
                content: "You are missing permissions to use this.",
                ephemeral: true,
            });
        }

        const id = interaction.values[0]!;

        const row = await this.container.questions
            .get(id)
            .then((res) => res.at(0))
            .catch(() => null);

        if (!row) {
            return interaction.reply({
                content: "That question could not be found.",
                ephemeral: true,
            });
        }

        const question = row as unknown as Question;

        return interaction.reply({
            embeds: generateQuestionShowEmbed(question),
            components: generateQuestionShowComponents(question),
            ephemeral: false,
        });
    }

    public parse(interaction: StringSelectMenuInteraction) {
        return LIST_SEL_RE.test(interaction.customId) ? this.some() : this.none();
    }
}
