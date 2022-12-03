import { StringOption } from 'necord';

export class QuestionAddOptionsDto {
  @StringOption({
    name: 'question',
    description: 'The question to add',
    required: true,
  })
  question: string;
}
