import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { SlashCommandContext } from 'necord';
import { ApplicationManagerNotFoundException } from '../../exceptions';
import { ApplicationInterceptorsResponses } from '../../constants';
import { returnErrorEmbed } from '../../utils';

@Catch(ApplicationManagerNotFoundException)
export class ApplicationManagerNotFoundExceptionFilter
  implements ExceptionFilter
{
  async catch(exception: Error, host: ArgumentsHost) {
    const [interaction] = host.getArgByIndex<SlashCommandContext>(0) ?? [
      undefined,
    ];
    return returnErrorEmbed(
      ApplicationInterceptorsResponses.ApplicationManagerNotFound,
      interaction,
    );
  }
}
