import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import { isMod } from "../../../util/precondition-util";
import { ApplicationCustomIDs } from "../../../constants/custom-ids";
import { generateApplicationComponents, generateApplicationEmbed } from "../../../util/command-utils/application/embeds/application-embed.utils";
import type { ModalSubmitInteraction } from "discord.js";
import type { DecisionType } from "../../../util/command-utils/application/modals/application-modals.types";
import type { Application } from "../../../types";

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class DecisionButtonHandler extends InteractionHandler {
    public async run(interaction: ModalSubmitInteraction) {
        if (!isMod(interaction.member!)) {
            return interaction.reply({
                content: 'You are missing permissions to use this.',
                ephemeral: true
            });
        }

        const split = interaction.customId.split('-');
        const decisionType = split.at(1) as DecisionType;
        const user = split.at(2)!;
        const reason = interaction.fields.getTextInputValue('reason');

        const app = await this.container.applications.get(user).then((res) => res.first() as unknown as Application).catch(() => null);

        if (!app) {
            return interaction.reply({
                content: 'This application does not exist in the database.',
                ephemeral: true
            });
        }

        switch (decisionType) {
            case "deny":
                this.deny(interaction, app!, reason);
                return interaction.reply('Denied the application');
            case "accept":
                this.accept(interaction, app!, reason)
                return interaction.reply('Accepted the application');
            case "delete":
                this.delete(interaction, app!, reason);
                return interaction.reply('Deleted the application');
        }
        return;
    }

    public parse(interaction: ModalSubmitInteraction) {
        return interaction.customId.startsWith(ApplicationCustomIDs.buttons.decide) ? this.some() : this.none()
    }

    async deny(interaction: ModalSubmitInteraction, application: Application, reason?: string) {
        let res = await this.container.applications.update(application.user.toString(), 'state', 'denied').catch(() => null);
        if (!res) {
            return interaction.reply({
                content: 'Application not found.',
                ephemeral: true
            });
        }

        interaction.reply({
            content: `Denied application from <@${application.user.toString()}> ${!!reason ? `with the reason: ${reason}` : 'with no reason'}`
        });

        this.deletePendingApplication(application);
        this.sendDecidedApplication(application, 'deny');
        this.sendDM('deny', application.user.toString(), reason);
        return;
    }

    async accept(interaction: ModalSubmitInteraction, application: Application, reason: string) {
        let res = await this.container.applications.update(application.user.toString(), 'state', 'denied').catch(() => null);
        if (!res) {
            return interaction.reply({
                content: 'Application not found.',
                ephemeral: true
            });
        }

        interaction.reply({
            content: `Accepted application from <@${application.user.toString()}> ${!!reason ? `with the reason: ${reason}` : 'with no reason'}`
        });

        this.deletePendingApplication(application);
        this.sendDecidedApplication(application, 'accept');
        this.sendDM('accept', application.user.toString(), reason)
        return;
    }

    async delete(interaction: ModalSubmitInteraction, application: Application, reason: string) {
        let res = await this.container.applications.delete(application.user.toString()).catch(() => null);
        if (!res) {
            return interaction.reply({
                content: 'Application not found.',
                ephemeral: true
            });
        }

        this.deletePendingApplication(application);
        this.sendDM('delete', application.user.toString(), reason);
        return;
    }

    deletePendingApplication(application: Application) {
        const pendingChannel = this.container.client.channels.cache.get(this.container.config.channels.pending);
        if (pendingChannel?.isTextBased()) {
            pendingChannel.messages.delete(application.message.toString()).catch(() => null);
        }
    }

    async sendDecidedApplication(application: Application, type: DecisionType) {
        const channel = this.container.client.channels.cache.get(type === 'deny' ? this.container.config.channels.denied : this.container.config.channels.accepted);
        if (channel?.isTextBased()) {
            const denyMessage = await channel.send({
                embeds: await generateApplicationEmbed(application),
                components: generateApplicationComponents(application)
            }).catch(() => null);

            if (denyMessage) {
                this.container.applications.update(application.user.toString(), 'message', denyMessage.id);
            }
        }
    }

    async sendDM(type: DecisionType, userid: string, reason?: string) {
        if (!reason) return;
        const user = await this.container.client.users.fetch(userid).catch(() => null);
        const channel = await user?.createDM().catch(() => null);
        channel?.send({
            content: `Your application has been **${type === 'deny' ? 'DENIED' : type === 'accept' ? 'ACCEPTED' : 'DELETED'}**${!!reason ?  `\nReason: ${reason}` : ''}`
        }).catch(() => null);
    }
}