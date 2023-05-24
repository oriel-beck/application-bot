import { ApplyOptions } from '@sapphire/decorators';
import { Subcommand } from '@sapphire/plugin-subcommands';
import { SlashCommandSubcommandBuilder } from 'discord.js';
import { generateQuestionListEmbed } from '../../util/command-utils/question/list/question-list.utils';
import { generateQuestionShowEmbed, generateQuestionShowComponents } from '../../util/command-utils/question/show/question-show.utils';
import type { Question } from '../../types';

@ApplyOptions<Subcommand.Options>({
  name: 'question',
  description: 'Manages the questions system.',
  preconditions: ['ModOnly'],
  subcommands: [
    {
      name: 'add',
      chatInputRun: 'add'
    },
    {
      name: 'remove',
      chatInputRun: 'remove'
    },
    {
      name: 'list',
      chatInputRun: 'list'
    },
    {
      name: 'edit',
      chatInputRun: 'edit'
    },
    {
      name: 'show',
      chatInputRun: 'show'
    }
  ]
})
export class SlashCommand extends Subcommand {
  public async add(interaction: Subcommand.ChatInputCommandInteraction) {
    await interaction.deferReply();
    const question = interaction.options.getString('question', true);

    const uuid = await this.container.questions.create(question).catch(() => null);

    if (!uuid) {
      return interaction.editReply('Failed to add the question.');
    }

    return interaction.editReply(`Created question \`${uuid}\`.`)
  }

  public async remove(interaction: Subcommand.ChatInputCommandInteraction) {
    await interaction.deferReply();
    const id = interaction.options.getString('id', true);

    const remove = await this.container.questions.delete(id).catch(() => null);

    if (!remove || !remove.rowLength) {
      return interaction.editReply(`Failed to delete question \`${id}\`.`)
    }

    return interaction.editReply(`Deleted question \`${id}\`.`)
  }

  public async list(interaction: Subcommand.ChatInputCommandInteraction) {
    await interaction.deferReply();

    const questions = await this.container.questions.getAll().catch(() => null);

    if (!questions || !questions.rowLength) {
      return interaction.editReply('Failed to get questions.');
    }

    return interaction.editReply({
      embeds: generateQuestionListEmbed(questions.rows as unknown as Question[])
    })
  }

  public async edit(interaction: Subcommand.ChatInputCommandInteraction) {
    await interaction.deferReply();

    const id = interaction.options.getString('id', true);
    const question = interaction.options.getString('question', true);

    const edit = await this.container.questions.update(id, 'question', question).catch(() => null);

    if (!edit || !edit.rowLength) {
      return interaction.editReply(`Failed to edit question \`${id}\`.`);
    }

    return interaction.editReply(`Edited question \`${id}\`.`)
  }

  public async show(interaction: Subcommand.ChatInputCommandInteraction) {
    await interaction.deferReply();

    const id = interaction.options.getString('id', true);
    
    const question = await this.container.questions.get(id).catch(() => null);

    if (!question || !question.rowLength) {
      return interaction.editReply(`Could not fine question \`${id}\`.`)
    }

    return interaction.editReply({
      embeds: generateQuestionShowEmbed(question.first() as unknown as Question),
      components: generateQuestionShowComponents(question.first() as unknown as Question)
    })
  }

  public registerApplicationCommands(registry: Subcommand.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDMPermission(false)
        .setDescription(this.description)
        .addSubcommand(this.addSubCommandBuilder())
        .addSubcommand(this.removeSubCommandBuilder())
        .addSubcommand(this.editSubCommandBuilder())
        .addSubcommand(this.listSubCommandBuilder())
        .addSubcommand(this.showSubCommandBuilder()));
  }

  private addSubCommandBuilder() {
    return new SlashCommandSubcommandBuilder()
      .setName('add')
      .setDescription('Add a new question.')
      .addStringOption((option) =>
        option
          .setName('question')
          .setDescription('The question to add.')
          .setRequired(true))
  }

  private removeSubCommandBuilder() {
    return new SlashCommandSubcommandBuilder()
      .setName('remove')
      .setDescription('Remove a question.')
      .addStringOption((option) =>
        option
          .setName('id')
          .setDescription('The id question to remove.')
          .setRequired(true))
  }

  private listSubCommandBuilder() {
    return new SlashCommandSubcommandBuilder()
      .setName('list')
      .setDescription('List all questions.')
  }
  private editSubCommandBuilder() {
    return new SlashCommandSubcommandBuilder()
      .setName('edit')
      .setDescription('Edit a question.')
      .addStringOption((option) =>
        option
          .setName('id')
          .setDescription('The id of the question to edit.')
          .setRequired(true))
      .addStringOption((option) =>
        option
          .setName('question')
          .setDescription('The question to add.')
          .setRequired(true))
  }

  private showSubCommandBuilder() {
    return new SlashCommandSubcommandBuilder()
      .setName('show')
      .setDescription('Show a question.')
      .addStringOption((option) =>
        option
          .setName('id')
          .setDescription('The id of the question to show.')
          .setRequired(true))
  }
}