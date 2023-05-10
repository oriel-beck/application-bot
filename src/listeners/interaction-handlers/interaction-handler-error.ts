import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener, type InteractionHandlerError } from "@sapphire/framework";

@ApplyOptions<Listener.Options>({
    event: Events.InteractionHandlerError
})
export class CommandErrorsListener extends Listener<typeof Events.InteractionHandlerError> {
    run(error: unknown, payload: InteractionHandlerError) {
        console.error(`[InteractionHandlerError(${payload.handler.name})]`, error)
    }

}