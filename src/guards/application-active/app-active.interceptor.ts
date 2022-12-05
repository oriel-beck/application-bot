import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { SlashCommandContext } from 'necord';
import { ApplicationInterceptorsResponses } from '../../constants';
import { ApplicationNotActiveException } from '../../exceptions';
import { returnErrorEmbed } from '../../utils';

@Catch(ApplicationNotActiveException)
export class AppNotActiveExceptionAppActiveFilter implements ExceptionFilter {
  async catch(exception: Error, host: ArgumentsHost) {
    const [interaction] = host.getArgByIndex<SlashCommandContext>(0) ?? [
      undefined,
    ];
    return returnErrorEmbed(
      ApplicationInterceptorsResponses.ApplicationNotActive,
      interaction,
    );
  }
}
