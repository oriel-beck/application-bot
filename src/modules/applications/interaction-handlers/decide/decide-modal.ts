import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ChannelType, type ModalSubmitInteraction, MessageFlags } from 'discord.js';
import { hasRole } from '@lib/precondition-util.js';
import { ApplicationState } from '@lib/constants/application.js';
import { ApplicationCustomIDs } from '@lib/constants/custom-ids.js';
import {
  generateApplicationComponents,
  generateApplicationEmbed
} from '@lib/command-utils/application/embeds/application-embed.utils.js';
import type { Application } from '@lib/types.js';

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class DecisionButtonHandler extends InteractionHandler {
  public async run(interaction: ModalSubmitInteraction) {
    if (!hasRole(interaction.member!, this.container.config.roles.mod)) {
      return interaction.reply({
        content: 'You are missing permissions to use this.',
        flags: MessageFlags.Ephemeral
      });
    }

    const parts = interaction.customId.split(':');
    const decisionType = parts[3] as ApplicationState;
    const user = parts[4]!;
    const reason = interaction.fields.getTextInputValue('reason');

    const app = (await this.container.applications
      .get(user)
      .then((res) => res.at(0))
      .catch(() => null)) as Application;

    if (!app) {
      return interaction.reply({
        content: 'This application does not exist in the database.',
        flags: MessageFlags.Ephemeral
      });
    }

    switch (decisionType) {
      case 'denied':
        return this.deny(interaction, app!, reason);
      case 'accepted':
        return this.accept(interaction, app!, reason);
      case 'deleted':
        return this.delete(interaction, app!, reason);
    }
    return;
  }

  public parse(interaction: ModalSubmitInteraction) {
    return interaction.customId.startsWith(`${ApplicationCustomIDs.modals.decide}:`) ? this.some() : this.none();
  }

  async deny(interaction: ModalSubmitInteraction, application: Application, reason?: string) {
    const res = await this.container.applications
      .update(application.user.toString(), 'state', ApplicationState.denied)
      .catch(() => null);

    if (!res) {
      return interaction.reply({
        content: 'Application not found.',
        flags: MessageFlags.Ephemeral
      });
    }

    interaction.reply({
      content: `Denied application from <@${application.user.toString()}> ${reason ? `with the reason: ${reason}` : 'with no reason'}`
    });

    this.deletePendingApplication(application);
    this.sendDecidedApplication(application, ApplicationState.denied);
    this.sendDM(ApplicationState.denied, application.user.toString(), reason);
    return;
  }

  async accept(interaction: ModalSubmitInteraction, application: Application, reason: string) {
    const res = await this.container.applications
      .update(application.user.toString(), 'state', ApplicationState.accepted)
      .catch(() => null);

    if (!res) {
      return interaction.reply({
        content: 'Application not found.',
        flags: MessageFlags.Ephemeral
      });
    }

    const member = await interaction.guild?.members.fetch(application.user.toString()).catch((err) => console.log(err));

    if (!member) {
      return interaction.reply({
        content: 'This member is no longer in the guild, failed to accept.'
      });
    }

    await member.roles.add(this.container.config.roles.trial_support).catch((err) => console.log(err));

    interaction.reply({
      content: `Accepted application from <@${application.user.toString()}> ${reason ? `with the reason: ${reason}` : 'with no reason'}`
    });

    this.deletePendingApplication(application);
    this.sendDecidedApplication(application, ApplicationState.accepted);
    this.sendDM(ApplicationState.accepted, application.user.toString(), reason);
    const staffChannel = this.container.client.channels.cache.get(this.container.config.channels.staff);
    if (staffChannel?.type === ChannelType.GuildText) {
      staffChannel
        .send(
          `Welcome to the Support Team! as for now you can see you're a Trial Support, which means you're limited to some stuff Support can do, read <#594861601035649024> to know more about this.\n**__How do I get fully promoted to Support?__**\nYou just have to help people out in support channels and tickets. You will be promoted once higher ups (mods+) think you're ready to be a Support member!\nIf you have any questions, feel free to ask here.\n<@${application.user}>`
        )
        .catch(() => null);
    }
    return;
  }

  async delete(interaction: ModalSubmitInteraction, application: Application, reason: string) {
    const res = await this.container.applications.delete(application.user.toString()).catch(() => null);
    if (!res) {
      return interaction.reply({
        content: 'Application not found.',
        flags: MessageFlags.Ephemeral
      });
    }

    this.deletePendingApplication(application);
    this.sendDM(ApplicationState.deleted, application.user.toString(), reason);
    return;
  }

  deletePendingApplication(application: Application) {
    const pendingChannel = this.container.client.channels.cache.get(this.container.config.channels.pending);
    if (pendingChannel?.isTextBased()) {
      pendingChannel.messages.delete(application.message.toString()).catch(() => null);
    }
  }

  async sendDecidedApplication(application: Application, type: ApplicationState) {
    const channel = this.container.client.channels.cache.get(
      type === ApplicationState.denied ? this.container.config.channels.denied : this.container.config.channels.accepted
    );
    if (channel?.type === ChannelType.GuildText) {
      const decidedMessage = await channel
        .send({
          content: `Application from <@${application.user.toString()}>`,
          embeds: await generateApplicationEmbed(application, 0, type),
          components: generateApplicationComponents(application, 0, type === ApplicationState.pending)
        })
        .catch(() => null);

      if (decidedMessage) {
        this.container.applications.update(application.user.toString(), 'message', decidedMessage.id);
      }
    }
  }

  async sendDM(type: ApplicationState, userid: string, reason?: string) {
    if (!reason) return;
    const user = await this.container.client.users.fetch(userid).catch(() => null);
    const channel = await user?.createDM().catch(() => null);
    channel
      ?.send({
        content: `Your application has been **${type.toUpperCase()}**${reason ? `\nReason: ${reason}` : ''}`
      })
      .catch(() => null);
  }
}
