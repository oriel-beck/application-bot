import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { generateReportComponents, generateReportEmbed, generateReportModal } from '../../util/command-utils/report/report.util';
import { ApplicationCommandType } from 'discord.js';

@ApplyOptions<Command.Options>({
    name: 'report',
    description: 'Report a user to the mod team for cheating.'
})
export class SlashCommand extends Command {
    public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const user = interaction.options.getUser('user', true);
        const reason = interaction.options.getString('reason', true);

        if (interaction.user.id === user.id) {
            return interaction.reply({
                content: 'Why would you report yourself?',
                ephemeral: true
            });
        }

        interaction.reply({
            content: 'Sent the report to the mod team.',
            ephemeral: true
        });

        const reportChannel = this.container.client.channels.cache.get(this.container.config.channels.report);

        if (reportChannel?.isTextBased()) {
            return reportChannel.send({
                embeds: generateReportEmbed(interaction, user, reason),
                components: generateReportComponents()
            });
        }

        return;
    }

    public contextMenuRun(interaction: Command.ContextMenuCommandInteraction) {
        if (interaction.isUserContextMenuCommand()) {
            if (interaction.user.id === interaction.targetUser.id) {
                return interaction.reply({
                    content: 'Why would you report yourself?',
                    ephemeral: true
                });
            }

            return interaction.showModal(generateReportModal(interaction.targetId))
        }

        if (interaction.isMessageContextMenuCommand()) {
            if (interaction.user.id === interaction.targetMessage.author.id) {
                return interaction.reply({
                    content: 'Why would you report yourself?',
                    ephemeral: true
                });
            }

            return interaction.showModal(generateReportModal(interaction.targetMessage.author.id, interaction.targetMessage.id))
        }

        return;
    }

    public registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDMPermission(false)
                .addUserOption((option) =>
                    option.setName('user')
                        .setDescription('The user to report.')
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option.setName('reason')
                        .setDescription('The reason to report the user for.')
                        .setRequired(true)
                ));

        registry.registerContextMenuCommand((builder) =>
            builder.setName('Report User')
                .setDMPermission(false)
                .setType(ApplicationCommandType.User)
        );

        registry.registerContextMenuCommand((builder) =>
            builder.setName('Report User')
                .setDMPermission(false)
                .setType(ApplicationCommandType.Message))
    }
}