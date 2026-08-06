import { sweepInactiveSupportChannels } from '@lib/bdfd-ai/cleanup-channel.js';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { InteractionContextType, MessageFlags } from 'discord.js';

@ApplyOptions<Command.Options>({
    name: 'ai-sweep',
    description: 'Run the inactive AI/transcript channel cleanup sweep (owner only).',
    preconditions: ['OwnerOnly'],
})
export class AiSweepCommand extends Command {
    public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const cleaned = await sweepInactiveSupportChannels();
        return interaction.editReply({
            content: `Inactive channel sweep finished. Cleaned **${cleaned}** channel${cleaned === 1 ? '' : 's'}.`,
        });
    }

    public registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setContexts(InteractionContextType.Guild)
        );
    }
}
