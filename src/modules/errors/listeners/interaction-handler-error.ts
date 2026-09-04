import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type InteractionHandlerError } from '@sapphire/framework';
import { safeErrorString } from '../safe-error-string.js';

@ApplyOptions<Listener.Options>({
  event: Events.InteractionHandlerError,
  name: 'globalHandlerError'
})
export class InteractionHandlerErrorsListener extends Listener<typeof Events.InteractionHandlerError> {
  run(error: unknown, payload: InteractionHandlerError) {
    console.error(
      `[${new Date().toISOString()}] [InteractionHandlerError(${payload.handler.name})] ${safeErrorString(error)}`
    );
  }
}
