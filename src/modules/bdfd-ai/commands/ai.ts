import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { processAiRequest } from '@lib/bdfd-ai/process-request.js';

@ApplyOptions<Command.Options>({
    name: 'ai',
    description: 'Ask the BDFD AI assistant a question (only you can see the reply).',
})
export class AiCommand extends Command {
    public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const userText = interaction.options.getString('message', true).trim();
        if (!userText) {
            return interaction.reply({
                content: 'Please provide a message.',
                ephemeral: true,
            });
        }

        await processAiRequest({
            container: this.container,
            channelId: interaction.channelId,
            userText,
            source: { type: 'interaction', interaction },
            ignoreAiEnabled: true,
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
