import { User } from 'discord.js';
import { UserOption } from 'necord';

export class ReportDto {
  @UserOption({
    name: 'user',
    description: 'The user to report',
  })
  user: User;
}
