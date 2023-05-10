import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener, type ChatInputCommandErrorPayload } from "@sapphire/framework";

@ApplyOptions<Listener.Options>({
    event: Events.ChatInputCommandError
})
export class CommandErrorsListener extends Listener<typeof Events.ChatInputCommandError> {
    run(error: unknown, payload: ChatInputCommandErrorPayload) {
        console.error(`[ChatInputCommandError(${payload.command.name})]:`, error);
    }
}