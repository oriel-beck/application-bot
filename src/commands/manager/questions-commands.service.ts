import {
  Context,
  createCommandGroupDecorator,
  Options,
  SlashCommandContext,
  Subcommand,
} from 'necord';
import { Injectable, UseFilters, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { APIMessageComponentEmoji } from 'discord.js';

// options dto
import {
  QuestionRemoveOptionsDto,
  QuestionAddOptionsDto,
  QuestionEditOptionsDto,
} from '../../dto/question';

// db services
import { DBApplicationQuestionsService } from '../../services/postgres';

// guards
import {
  ApplicationManagerGuard,
  ApplicationManagerNotFoundExceptionFilter,
} from '../../guards';

// utils
import {
  generateQuestionListComponents,
  generateQuestionListEmbed,
} from '../../utils';

// constants
import {
  QuestionCommandFunctionResponses,
  QuestionCommandResponses,
} from '../../constants';

// group command decorator
export const QuestionsCommandGroupDecorator = createCommandGroupDecorator({
  name: 'question',
  description: 'Manage the questions',
  dmPermission: false,
});

@UseGuards(ApplicationManagerGuard)
@UseFilters(ApplicationManagerNotFoundExceptionFilter)
@Injectable()
@QuestionsCommandGroupDecorator()
export class QuestionsCommandsService {
  constructor(
    private questionService: DBApplicationQuestionsService,
    private configService: ConfigService,
  ) {}

  @Subcommand({
    name: 'add',
    description: 'Adds a question',
  })
  async addQuestion(
    @Context() [interaction]: SlashCommandContext,
    @Options() { question }: QuestionAddOptionsDto,
  ) {
    await this.questionService.addQuestion(
      question,
      BigInt(interaction.guildId),
    );
    return interaction
      .reply({
        content: QuestionCommandResponses.Added,
        ephemeral: true,
      })
      .catch(() => null);
  }

  @Subcommand({
    name: 'remove',
    description: 'Removes a question',
  })
  async removeQuestion(
    @Context() [interaction]: SlashCommandContext,
    @Options() { id }: QuestionRemoveOptionsDto,
  ) {
    const removed = await this.questionService.deleteQuestion(
      id,
      BigInt(interaction.guildId),
    );

    if (!removed.affected)
      return interaction
        .reply({
          content: QuestionCommandResponses.NotFound,
          ephemeral: true,
        })
        .catch(() => null);

    return interaction
      .reply({
        content: QuestionCommandFunctionResponses.deleted(id),
        ephemeral: true,
      })
      .catch(() => null);
  }

  @Subcommand({
    name: 'list',
    description: 'List all questions',
  })
  async listQuestions(@Context() [interaction]: SlashCommandContext) {
    const questions = await this.questionService.getAllQuestions(
      BigInt(interaction.guildId),
    );
    if (!questions.length)
      return interaction
        .reply({
          content: QuestionCommandResponses.NoQuestions,
          ephemeral: true,
        })
        .catch(() => null);

    return interaction
      .reply({
        embeds: generateQuestionListEmbed(questions),
        components: generateQuestionListComponents(
          questions,
          this.configService.get<APIMessageComponentEmoji>('emojis.next'),
          this.configService.get<APIMessageComponentEmoji>('emojis.prev'),
        ),
      })
      .catch(() => null);
  }

  @Subcommand({
    name: 'edit',
    description: 'Edit a question',
  })
  async editQuestion(
    @Context() [interaction]: SlashCommandContext,
    @Options() { id, question }: QuestionEditOptionsDto,
  ) {
    const edited = await this.questionService.editQuestions(
      id,
      question,
      BigInt(interaction.guildId),
    );

    if (!edited.affected)
      return interaction
        .reply({
          content: QuestionCommandResponses.NotFound,
          ephemeral: true,
        })
        .catch(() => null);

    return interaction
      .reply({
        content: QuestionCommandFunctionResponses.edited(id),
        ephemeral: true,
      })
      .catch(() => null);
  }
}
