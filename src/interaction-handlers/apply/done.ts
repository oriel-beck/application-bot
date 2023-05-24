import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import { Colors, type ButtonInteraction } from "discord.js";
import { ApplicationState } from "../../constants/application";
import { isApplicationExist, isCurrentApplicationMessage } from "../../util/util";
import { generateApplicationComponents, generateApplicationEmbed } from "../../util/command-utils/application/embeds/application-embed.utils";
import { ApplyCustomIDs } from "../../constants/custom-ids";
import type { Application } from "../../types";

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.Button
})
export class DoneButtonHandler extends InteractionHandler {
    public async run(interaction: ButtonInteraction) {
        await interaction.deferReply({
            ephemeral: true
        });

        const getApp = await this.container.applications.get(interaction.user.id).then((res) => res.first() as unknown as Application).catch(() => null);

        if (isCurrentApplicationMessage(getApp, interaction.message.id)) {
            return interaction.editReply({
                content: 'This application does not exist.'
            });
        }

        const update = await this.container.applications.update(interaction.user.id, 'state', ApplicationState.pending).then((res) => res.first() as unknown as Application).catch(() => null);

        if (!isApplicationExist(update)) {
            return interaction.editReply({
                content: 'Application update failed, please try again later.'
            });
        }

        const pendingChannel = this.container.client.channels.cache.get(this.container.config.channels.pending);
        if (!pendingChannel?.isTextBased()) {
            return interaction.editReply({
                content: 'Failed to find pending application channel.'
            });
        }

        const pendingApp = await pendingChannel.send({
            content: `Application from ${interaction.user}`,
            embeds: await generateApplicationEmbed(getApp!),
            components: generateApplicationComponents(getApp!)
        });

        if (!pendingApp) {
            return interaction.editReply({
                content: 'Failed to send pending application for review.'
            });
        }

        interaction.editReply({
            content: 'Successfully sent application for review.'
        });

        return interaction.message.edit({
            embeds: [{
                title: 'Application has been sent.',
                color: Colors.Green
            }],
            components: []
        });;
    }

    public parse(interaction: ButtonInteraction) {
        return interaction.customId === ApplyCustomIDs.buttons.done ? this.some() : this.none()
    }
}