import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { SlashCommandContext } from 'necord';
import { ApplicationInterceptorsResponses } from '../../constants';
import { ApplicationNotFoundException } from '../../exceptions';
import { returnErrorEmbed } from '../../utils';

@Catch(ApplicationNotFoundException)
export class ApplicationNotFoundExceptionFilter implements ExceptionFilter {
  async catch(exception: Error, host: ArgumentsHost) {
    const [interaction] = host.getArgByIndex<SlashCommandContext>(0) ?? [
      undefined,
    ];
    return returnErrorEmbed(
      ApplicationInterceptorsResponses.ApplicationNotFound,
      interaction,
    );
  }
}
