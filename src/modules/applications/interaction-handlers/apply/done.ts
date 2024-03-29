import { generateApplicationComponents, generateApplicationEmbed } from "@lib/command-utils/application/embeds/application-embed.utils.js";
import { isCurrentApplicationMessage } from "@lib/util.js";
import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import { ApplicationState } from "@lib/constants/application.js";
import { ApplyCustomIDs } from "@lib/constants/custom-ids.js";
import { Colors, type ButtonInteraction } from "discord.js";

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.Button
})
export class DoneButtonHandler extends InteractionHandler {
    public async run(interaction: ButtonInteraction) {
        await interaction.deferReply({
            ephemeral: true
        });

        const getApp = await this.container.applications.get(interaction.user.id).then((res) => res.first()).catch(() => null);

        if (!isCurrentApplicationMessage(getApp, interaction.message.id)) {
            return interaction.editReply({
                content: 'This application does not exist.'
            });
        }

        const update = this.container.applications.removeTTL(getApp!.get('user'), getApp!.get('answers'), getApp!.get('questions'), getApp!.get('message'), ApplicationState.pending).catch(() => null);

        if (!update) {
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

        this.container.applications.update(interaction.user.id, 'message', pendingApp.id, true).catch(() => null);

        interaction.editReply({
            content: 'Successfully sent application for review.'
        });

        return interaction.message.edit({
            content: '',
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