import {
    generateQuestionListComponents,
    generateQuestionListEmbed,
} from "@lib/command-utils/question/list/question-list.utils.js";
import { QuestionCustomIDs } from "@lib/constants/custom-ids.js";
import { hasRole } from "@lib/precondition-util.js";
import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import type { ButtonInteraction } from "discord.js";
import type { Question } from "@lib/types.js";

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.Button,
})
export class QuestionListDirPageHandler extends InteractionHandler {
    public async run(interaction: ButtonInteraction) {
        if (!hasRole(interaction.member!, this.container.config.roles.mod)) {
            return interaction.reply({
                content: "You are missing permissions to use this.",
                ephemeral: true,
            });
        }

        const raw = interaction.customId;
        const prefix = `${QuestionCustomIDs.buttons.listDir}:`;
        if (!raw.startsWith(prefix)) {
            return;
        }
        const token = raw.slice(prefix.length);
        if (token === "noop") {
            return;
        }

        const pageIndex = Number(token);
        if (!Number.isInteger(pageIndex) || pageIndex < 0) {
            return interaction.reply({
                content: "Invalid list navigation.",
                ephemeral: true,
            });
        }

        const rows = await this.container.questions.getAll().catch(() => null);
        if (!rows?.length) {
            return interaction.update({
                content: "No questions (or failed to load).",
                embeds: [],
                components: [],
            });
        }

        const list = rows as unknown as Question[];
        const totalCount = list.length;
        const perPage = 25;
        const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
        const safePage = Math.min(pageIndex, totalPages - 1);

        return interaction.update({
            embeds: generateQuestionListEmbed(list, {
                pageIndex: safePage,
                perPage,
                totalPages,
            }),
            components: generateQuestionListComponents(list, safePage, totalCount),
        });
    }

    public parse(interaction: ButtonInteraction) {
        const id = interaction.customId;
        if (!id.startsWith(`${QuestionCustomIDs.buttons.listDir}:`)) {
            return this.none();
        }
        if (id.endsWith(":noop")) {
            return this.none();
        }
        return this.some();
    }
}
