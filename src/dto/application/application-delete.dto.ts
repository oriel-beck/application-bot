import { UserOption } from 'necord';
import { User } from 'discord.js';

export class ApplicationDeleteOptionsDto {
  @UserOption({
    name: 'user',
    description: 'The user to delete the application for',
    required: true,
  })
  user: User;
}
