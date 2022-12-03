import { StringOption, UserOption } from 'necord';
import { User } from 'discord.js';

export class ApplicationDenyOptionsDto {
  @UserOption({
    name: 'user',
    description: 'The user to deny the application for',
    required: true,
  })
  user: User;

  @StringOption({
    name: 'reason',
    description: 'The reason to deny the mods',
    required: false,
  })
  reason?: string = '';
}
