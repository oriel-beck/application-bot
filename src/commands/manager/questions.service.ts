import { Injectable, UseFilters, UseGuards } from '@nestjs/common';
import {
  Context,
  createCommandGroupDecorator,
  Options,
  SlashCommandContext,
  Subcommand,
} from 'necord';

// options dto
import {
  QuestionRemoveOptionsDto,
  QuestionAddOptionsDto,
  QuestionEditOptionsDto,
} from '../../dto/question';

// db services
import { DBApplicationQuestionsService } from '../../services';

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
import {
  QuestionCommandFunctionResponses,
  QuestionCommandResponses,
} from '../../constants';

// group command decorator
export const QuestionsCommandGroupDecorator = createCommandGroupDecorator({
  name: 'question',
  description: 'Manage the questions',
});

@UseGuards(ApplicationManagerGuard)
@UseFilters(ApplicationManagerNotFoundExceptionFilter)
@Injectable()
@QuestionsCommandGroupDecorator()
export class QuestionsService {
  constructor(private questionService: DBApplicationQuestionsService) {}

  @Subcommand({
    name: 'add',
    description: 'Adds a question',
  })
  async addQuestion(
    @Context() [interaction]: SlashCommandContext,
    @Options() { question }: QuestionAddOptionsDto,
  ) {
    await this.questionService.addQuestion(question);
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
    const removed = await this.questionService.deleteQuestion(id);

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
    const questions = await this.questionService.getAllQuestions();
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
        components: generateQuestionListComponents(questions),
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
    const edited = await this.questionService.editQuestions(id, question);

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
