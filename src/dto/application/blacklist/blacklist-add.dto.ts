import { StringOption, UserOption } from 'necord';
import { User } from 'discord.js';

export class ApplicationBlacklistAddOptionsDto {
  @UserOption({
    name: 'user',
    description: 'The user to blacklist',
    required: true,
  })
  user: User;

  @StringOption({
    name: 'reason',
    description: 'The reason to blacklist the user',
    required: true,
  })
  reason: string;
}
