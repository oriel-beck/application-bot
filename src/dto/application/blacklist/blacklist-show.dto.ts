import { UserOption } from 'necord';
import { User } from 'discord.js';

export class ApplicationBlacklistShowOptionsDto {
  @UserOption({
    name: 'user',
    description: 'The user to show the blacklist details of',
    required: true,
  })
  user: User;
}
