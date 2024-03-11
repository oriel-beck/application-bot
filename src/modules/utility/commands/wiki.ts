import { ApplyOptions } from "@sapphire/decorators";
import { Command } from "@sapphire/framework";
import { AttachmentBuilder, ChatInputCommandInteraction, TextBasedChannel } from "discord.js";

@ApplyOptions<Command.Options>({
    name: 'wiki',
    description: 'Gets the appropriate wiki as text from wikis.',
    cooldownDelay: 10000,
})
export class SlashCommand extends Command {
    public async chatInputRun(interaction: ChatInputCommandInteraction) {
        const message_url = interaction.options.getString("message_url", true);
        const regex = message_url.match(/^https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/channels\/(\d{17,})\/(\d{17,})\/(\d{17,})$/i)
        if (!regex) return interaction.reply({
            content: "This is not a valid url.",
            ephemeral: true
        });

        if (regex[1] !== interaction.guild?.id) return interaction.reply({
            content: "This is not a valid wiki url.",
            ephemeral: true
        });

        if (regex[2] !== this.container.config.channels.wiki) return interaction.reply({
            content: "This is not a valid wiki url.",
            ephemeral: true
        });

        const channel = interaction.guild.channels.cache.get(this.container.config.channels.wiki) as TextBasedChannel;
        
        await interaction.deferReply({ ephemeral: true });
        const msg = await channel.messages.fetch(regex[3]).catch(() => null);

        if (!msg) return interaction.editReply({
            content: "Failed to fetch the message."
        });

        const att = new AttachmentBuilder(Buffer.from(msg.embeds[0].description!), {
            name: "wiki.txt"
        });


        return interaction.editReply({
            files: [att]
        });
    }

    public registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDMPermission(false)
                .addStringOption((option) =>
                    option.setName('message_url')
                        .setDescription('The url of the wiki to get.')
                        .setRequired(true)
                ));
    }
}