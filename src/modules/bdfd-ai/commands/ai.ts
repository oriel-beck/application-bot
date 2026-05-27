import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ChannelType, type TextChannel, type ThreadChannel } from 'discord.js';
import { processAiRequest } from '@lib/bdfd-ai/process-request.js';
import {
    getBdfdAiChannelKind,
    resolveChannelAuthorId,
    resolveChannelFromInteraction,
} from '@lib/bdfd-ai/channel-utils.js';

@ApplyOptions<Command.Options>({
    name: 'ai',
    description: 'Ask the BDFD AI assistant a question in this support thread or ticket.',
    preconditions: ['BdfdAiEnabled'],
})
export class AiCommand extends Command {
    public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const channel = interaction.channel;

        if (
            channel.type !== ChannelType.GuildText &&
            channel.type !== ChannelType.PublicThread &&
            channel.type !== ChannelType.PrivateThread
        ) {
            return interaction.reply({
                content: 'Use this command in a support forum post, international support post, or ticket channel.',
                ephemeral: true,
            });
        }

        const textChannel = channel as TextChannel | ThreadChannel;
        if (!resolveChannelFromInteraction(textChannel)) {
            return interaction.reply({
                content: 'This command only works in support forum posts, international support posts, or ticket channels.',
                ephemeral: true,
            });
        }

        const kind = getBdfdAiChannelKind(textChannel)!;
        const authorId = await resolveChannelAuthorId(textChannel, kind);

        if (!authorId || interaction.user.id !== authorId) {
            return interaction.reply({
                content: 'Only the author of this support post or ticket can use the AI assistant here.',
                ephemeral: true,
            });
        }

        const userText = interaction.options.getString('message', true).trim();
        if (!userText) {
            return interaction.reply({
                content: 'Please provide a message.',
                ephemeral: true,
            });
        }

        await processAiRequest({
            container: this.container,
            channelId: channel.id,
            userText,
            source: { type: 'interaction', interaction },
        });
    }

    public registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDMPermission(false)
                .addStringOption((option) =>
                    option
                        .setName('message')
                        .setDescription('Your question or code (use pastebin links if it is very long)')
                        .setRequired(true)
                        .setMaxLength(2000)
                )
        );
    }
}
