import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ChannelType, EmbedBuilder, MessageFlags } from 'discord.js';
import { DEFAULT_AI_LIMIT } from '../managers/ai-rate.manager.js';

@ApplyOptions<Command.Options>({
    name: 'ai-limit',
    description: 'Configure per-channel AI response limits (owner only).',
    preconditions: ['OwnerOnly'],
})
export class AiLimitCommand extends Command {
    public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const action = interaction.options.getString('action', true);
        const channel = interaction.options.getChannel('channel', true);

        if (
            channel.type !== ChannelType.GuildText &&
            channel.type !== ChannelType.PublicThread &&
            channel.type !== ChannelType.PrivateThread
        ) {
            return interaction.reply({
                content: 'Channel must be a ticket channel or support thread.',
                flags: MessageFlags.Ephemeral,
            });
        }

        const channelId = channel.id;

        if (action === 'get') {
            const limit = await this.container.aiRate.getLimit(channelId);
            const usage = await this.container.aiRate.getUsage(channelId);
            const custom = limit !== DEFAULT_AI_LIMIT;

            const embed = new EmbedBuilder()
                .setTitle('AI limit')
                .setDescription(
                    `Channel: <#${channelId}>\nUsage: **${usage}** / **${limit}**${custom ? ' (custom limit)' : ' (default)'}`
                );

            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        if (action === 'reset-usage') {
            await this.container.aiRate.resetUsage(channelId);
            return interaction.reply({
                content: `Reset AI usage for <#${channelId}>.`,
                flags: MessageFlags.Ephemeral,
            });
        }

        if (action === 'reset-conversation') {
            await this.container.aiConversation.delete(channelId);
            return interaction.reply({
                content: `Cleared saved AI conversation for <#${channelId}>.`,
                flags: MessageFlags.Ephemeral,
            });
        }

        const limit = interaction.options.getInteger('limit', true);
        if (limit < 1 || limit > 500) {
            return interaction.reply({
                content: 'Limit must be between 1 and 500.',
                flags: MessageFlags.Ephemeral,
            });
        }

        if (action === 'set') {
            await this.container.aiRate.setLimit(channelId, limit);
            return interaction.reply({
                content: `Set AI limit for <#${channelId}> to **${limit}** responses.`,
                flags: MessageFlags.Ephemeral,
            });
        }

        if (action === 'clear-limit') {
            await this.container.aiRate.clearLimit(channelId);
            return interaction.reply({
                content: `Cleared custom AI limit for <#${channelId}> (default **${DEFAULT_AI_LIMIT}**).`,
                flags: MessageFlags.Ephemeral,
            });
        }

        return interaction.reply({ content: 'Unknown action.', flags: MessageFlags.Ephemeral });
    }

    public registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDMPermission(false)
                .addStringOption((option) =>
                    option
                        .setName('action')
                        .setDescription('What to do')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Get usage & limit', value: 'get' },
                            { name: 'Set custom limit', value: 'set' },
                            { name: 'Clear custom limit', value: 'clear-limit' },
                            { name: 'Reset usage counter', value: 'reset-usage' },
                            { name: 'Clear AI conversation', value: 'reset-conversation' }
                        )
                )
                .addChannelOption((option) =>
                    option.setName('channel').setDescription('Ticket or support thread').setRequired(true)
                )
                .addIntegerOption((option) =>
                    option
                        .setName('limit')
                        .setDescription('Max AI responses (required for set)')
                        .setMinValue(1)
                        .setMaxValue(500)
                )
        );
    }
}
