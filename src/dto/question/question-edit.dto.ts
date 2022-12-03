import { StringOption } from 'necord';

export class QuestionEditOptionsDto {
  @StringOption({
    name: 'id',
    description: 'The id question to edit',
    required: true,
  })
  id: string;

  @StringOption({
    name: 'question',
    description: 'The new question to set',
    required: true,
  })
  question: string;
}
