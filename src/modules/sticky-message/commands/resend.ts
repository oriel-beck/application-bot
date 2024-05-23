import { generateStickyMessageComponents, generateStickyMessageEmbed } from '@lib/command-utils/sticky-message/resend.js';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
@ApplyOptions<Command.Options>({
    name: 'resend',
    description: 'Re-sends the sticky message in share-your-bot, will attempt to delete the old one',
    preconditions: ["OwnerOnly", "ModOnly"]
})
export class SlashCommand extends Command {
    public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const shareBotChannel = interaction.client?.channels.cache.get(this.container.config.channels.share_your_bot);
        if (!shareBotChannel?.isTextBased()) return interaction.reply({
            content: `<#${this.container.config.channels.share_your_bot}> is not a valid text channel`,
            ephemeral: true
        });

        const oldMessage = await this.container.redis.get("share-your-bot-sticky-message");
        if (oldMessage) {
            await shareBotChannel.messages.delete(oldMessage).catch(() => null);
        }

        return await shareBotChannel.send({
            embeds: generateStickyMessageEmbed(),
            components: generateStickyMessageComponents()
        });
    }

    public registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) => builder
            .setName(this.name)
            .setDescription(this.name)
        )
    }
}