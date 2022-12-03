import { StringOption, UserOption } from 'necord';
import { User } from 'discord.js';

export class ApplicationBlacklistReasonOptionDto {
  @UserOption({
    name: 'user',
    description: 'The user to re-reason',
    required: true,
  })
  user: User;

  @StringOption({
    name: 'reason',
    description: 'The reason to re-reason the user',
    required: true,
  })
  reason: string;
}
