import { ApplyOptions } from "@sapphire/decorators";
import { ChatInputCommand, Command } from "@sapphire/framework";
import { ChatInputCommandInteraction, Colors, EmbedBuilder } from "discord.js";

@ApplyOptions<Command.Options>({
    name: 'tip',
    description: 'Gets the appropriate tip from tips-tutorials.'
})
export class SlashCommand extends Command {
    public async chatInputRun(interaction: ChatInputCommandInteraction, context: ChatInputCommand.RunContext) {
        const tip = interaction.options.getNumber("tip", true);
        
        if (!this.container.tips.tips.has(tip)) return interaction.reply({
            content: "That tip does not exist.",
            ephemeral: true
        });

        const tipMessage = this.container.tips.tips.get(tip);
        const embed = new EmbedBuilder()
            .setTitle(`Tip #${tip}`)
            .setDescription(tipMessage?.content!)
            .setColor(Colors.Blurple)
            .setURL(tipMessage?.url!)

        return interaction.reply({
            embeds: [embed]
        });
    }

    public registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDMPermission(false)
                .addNumberOption((option) =>
                    option.setName('tip')
                        .setDescription('The tip to show.')
                        .setRequired(true)
                ));
    }
}