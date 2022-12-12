import { User } from 'discord.js';
import { StringOption, UserOption } from 'necord';

export class ReportDto {
  @UserOption({
    name: 'user',
    description: 'The user to report',
    required: true,
  })
  user: User;

  @StringOption({
    name: 'proof',
    description: 'The message link to the proof',
    required: false,
  })
  proof: string;
}
