import { ApplyOptions } from "@sapphire/decorators";
import { Subcommand } from "@sapphire/plugin-subcommands";
import { AttachmentBuilder, ChannelType, TextChannel } from "discord.js";

@ApplyOptions<Subcommand.Options>({
    name: "transcript",
    description: "Manages the ticket transcripts",
    preconditions: ['ModOnly', 'OwnerOnly'],
    subcommands: [
        {
            name: "delete",
            chatInputRun: "delete"
        },
        {
            name: "clear-deleted",
            chatInputRun: "clearDeleted"
        },
        {
            name: "get",
            chatInputRun: "get"
        }
    ]
})
export class SlashCommand extends Subcommand {

    public async delete(interaction: Subcommand.ChatInputCommandInteraction) {
        const channelId = interaction.options.getString("channel-id");
        let channel = interaction.options.getChannel("channel", false, [ChannelType.GuildText]);
        if (!channelId && !channel) return interaction.reply({
            content: "Please provide a channel ID or a channel!",
            ephemeral: true
        });
        if (!channel && channelId) channel = await interaction.guild?.channels.fetch(channelId) as TextChannel;
        if (!channel) return interaction.reply({
            content: "Failed to get the channel",
            ephemeral: true
        });

        const deleted = await this.container.transcripts.delete(channel.id)
        if (!deleted.rowCount) return interaction.reply({
            content: "I could not find any transcript for this channel",
            ephemeral: true
        });

        return interaction.reply({
            content: "Deleted transcript and messages for the provided channel",
            ephemeral: true
        });
    }

    public async clearDeleted(interaction: Subcommand.ChatInputCommandInteraction) {
        const category = await interaction.guild?.channels.fetch(this.container.config.categories.tickets);
        if (!category || category.type !== ChannelType.GuildCategory) return interaction.reply({
            content: "I was unable to get the tickets category",
            ephemeral: true
        });

        await interaction.deferReply({
            ephemeral: true
        });

        const channelSet = new Set(category.children.cache.map(c => c.id));
        const transcripts = await this.container.transcripts.getAll();
        let deleted = 0;
        for (const transcript of transcripts) {
            if (!channelSet.has(transcript.channel.toString())) {
                await this.container.transcripts.delete(transcript.channel.toString());
                deleted++;
            }
        }

        return interaction.reply({
            content: `Deleted ${deleted} transcipts`,
            ephemeral: true
        });
    }

    public async get(interaction: Subcommand.ChatInputCommandInteraction) {
        const channelId = interaction.options.getString("channel-id");
        let channel = interaction.options.getChannel("channel", false, [ChannelType.GuildText]);
        if (!channelId && !channel) return interaction.reply({
            content: "Please provide a channel ID or a channel!",
            ephemeral: true
        });
        if (!channel && channelId) channel = await interaction.guild?.channels.fetch(channelId) as TextChannel;
        if (!channel) return interaction.reply({
            content: "Failed to get the channel",
            ephemeral: true
        });

        const transcript = await this.container.transcripts.get(channel.id);
        if (!transcript) return interaction.reply({
            content: "I could not find any transcript for this channel",
            ephemeral: true
        });

        const users = new Map<string, string>();
        const author = await this.container.client.users.fetch(transcript.transcript.author.toString()).then((u) => {
            users.set(u.id, u.displayName);
            return u;
        }).catch(() => null);
        if (!author) return;

        let text = `Transcript of ${channel.name}\nTicket author: ${author?.displayName || "UNKNOWN"}`;
        for (const message of transcript.messages) {
            const user = users.get(message.user.toString()) || await this.container.client.users.fetch(message.user.toString()).then((u) => {
                users.set(u.id, u.displayName);
                return u.displayName;
            }).catch(() => "UNKNOWN");
            text += `\n\n${user}: ${message.message}`;
        }

        const attachment = new AttachmentBuilder(Buffer.from(text), { name: `${channel.name}.txt` });
        return interaction.reply({
            content: "Here is the transcript you requested",
            files: [attachment]
        });
    }

    public registerApplicationCommands(registry: Subcommand.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDMPermission(false)
                .addSubcommand((sub) => sub.setName("delete")
                    .setDescription("Delete a transcript")
                    .addStringOption((option) =>
                        option
                            .setName("channel-id")
                            .setDescription("The channel ID to delete the transcript for")
                    )
                    .addChannelOption((option) =>
                        option
                            .setName("channel")
                            .setDescription("The channel to delete the transcript for")
                            .addChannelTypes(ChannelType.GuildText)
                    )
                )
                .addSubcommand((sub) => sub.setName("clear-deleted")
                    .setDescription("Clear all transcripts that belong to deleted channels")
                )
                .addSubcommand((sub) => sub.setName("get")
                    .setDescription("Get a transcript file")
                    .addStringOption((option) =>
                        option
                            .setName("channel-id")
                            .setDescription("The channel ID to get the transcript of")
                    )
                    .addChannelOption((option) =>
                        option
                            .setName("channel")
                            .setDescription("The channel to get the transcript of")
                            .addChannelTypes(ChannelType.GuildText)
                    )
                )

        );
    }
}