import { generateStickyMessageComponents, generateStickyMessageEmbed } from '@lib/command-utils/sticky-message/resend.js';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { Subcommand } from '@sapphire/plugin-subcommands';
import { ChannelType } from 'discord.js';
@ApplyOptions<Subcommand.Options>({
    name: 'shareyourbot',
    description: 'Controls the share your bot channel',
    preconditions: ["OwnerOnly", "ModOnly"],
    subcommands: [
        {
            name: "resend",
            chatInputRun: "resend"
        },
        {
            name: "cooldown",
            chatInputRun: "cooldown"
        }
    ]
})
export class SlashCommand extends Subcommand {
    public async resend(interaction: Subcommand.ChatInputCommandInteraction) {
        const shareBotChannel = interaction.client?.channels.cache.get(this.container.config.channels.share_your_bot);
        if (shareBotChannel?.type !== ChannelType.GuildText) return interaction.reply({
            content: `<#${this.container.config.channels.share_your_bot}> is not a valid text channel`,
            ephemeral: true
        });

        const oldMessage = await this.container.redis.get("share-your-bot-sticky-message");
        if (oldMessage) {
            await shareBotChannel.messages.delete(oldMessage).catch(() => null);
        }

        const newMessage = await shareBotChannel.send({
            embeds: generateStickyMessageEmbed(),
            components: generateStickyMessageComponents()
        });

        await this.container.cooldown.setMessage(newMessage.id);

        return interaction.reply("Re-sent the share your bot rules.")
    }

    public async cooldown(interaction: Subcommand.ChatInputCommandInteraction) {
        const shareBotChannel = interaction.client?.channels.cache.get(this.container.config.channels.share_your_bot);
        if (!shareBotChannel?.isTextBased()) return interaction.reply({
            content: `<#${this.container.config.channels.share_your_bot}> is not a valid text channel`,
            ephemeral: true
        });

        const seconds = interaction.options.getString("cooldown");
        const user = interaction.options.getUser("user", true);
        if (!seconds) {
            await this.container.cooldown.deleteCooldown(user.id);
        } else {
            await this.container.cooldown.setCooldown(user.id, +seconds);
        }

        return interaction.reply({
            content: seconds ? `Reset ${user}'s cooldown.` : `Set ${user}'s cooldown to ${seconds} seconds`,
            ephemeral: true
        });
    }

    public registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) => builder
            .setName(this.name)
            .setDescription(this.name)
            .addSubcommand(builder => builder
                .setName("resend")
                .setDescription("re-sends the share your bot rules")
            )
            .addSubcommand(builder => builder
                .setName("cooldown")
                .setDescription("Set a user's cooldown")
                .addUserOption(builder => builder
                    .setName("user")
                    .setDescription("The user to reset the cooldown for")
                    .setRequired(true)
                )
                .addNumberOption(builder => builder
                    .setName("seconds")
                    .setDescription("The amount of seconds to set the cooldown to, use 0 to reset")
                )
            )
        )
    }
}