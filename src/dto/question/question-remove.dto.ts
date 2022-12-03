import { StringOption } from 'necord';

export class QuestionRemoveOptionsDto {
  @StringOption({
    name: 'id',
    description: 'The id question to remove',
    required: true,
  })
  id: string;
}
