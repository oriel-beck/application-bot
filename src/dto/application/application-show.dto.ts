import { UserOption } from 'necord';
import { User } from 'discord.js';

export class ApplicationShowOptionsDto {
  @UserOption({
    name: 'user',
    description: 'The user to view the application for',
    required: true,
  })
  user: User;
}
