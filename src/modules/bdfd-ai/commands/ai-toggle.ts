import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, MessageFlags } from 'discord.js';

@ApplyOptions<Command.Options>({
    name: 'ai-toggle',
    description: 'Enable or disable the BDFD AI assistant for this server.',
    preconditions: ['OwnerOnly'],
})
export class AiToggleCommand extends Command {
    public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const guildId = interaction.guildId!;
        const rows = await this.container.settings.get(guildId);
        const current = rows.at(0)?.aiEnabled ?? false;
        const next = !current;

        await this.container.settings.update(guildId, 'aiEnabled', next);

        const embed = new EmbedBuilder()
            .setTitle('BDFD AI')
            .setDescription(
                next
                    ? 'AI assistant is now **enabled**. Users can use `/ai` or reply to the bot in support threads and tickets.'
                    : 'AI assistant is now **disabled**. Existing conversations are kept in the database.'
            );

        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    public registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder.setName(this.name).setDescription(this.description).setDMPermission(false)
        );
    }
}
