import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { generateAboutEmbed } from '../../util/command-utils/about/about.utils';

@ApplyOptions<Command.Options>({
    name: 'about',
    description: 'View information about Application Bot.'
})
export class SlashCommand extends Command {
    public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        return interaction.reply({
            embeds: generateAboutEmbed()
        });
    }

    public registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDMPermission(false))
    }
}