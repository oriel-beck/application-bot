import { StringOption, UserOption } from 'necord';
import { User } from 'discord.js';

export class ApplicationAcceptOptionsDto {
  @UserOption({
    name: 'user',
    description: 'The user to accept the application for',
    required: true,
  })
  user: User;

  @StringOption({
    name: 'reason',
    description: 'The reason to accept the application',
    required: false,
  })
  reason?: string = '';
}
