import { UserOption } from 'necord';
import { User } from 'discord.js';

export class ApplicationBlacklistRemoveOptionsDto {
  @UserOption({
    name: 'user',
    description: 'The user to unblacklist',
    required: true,
  })
  user: User;
}
