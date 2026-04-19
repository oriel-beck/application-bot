import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener, type ChatInputCommandErrorPayload } from "@sapphire/framework";
import { safeErrorString } from "../safe-error-string.js";

@ApplyOptions<Listener.Options>({
    event: Events.ChatInputCommandError,
    name: 'globalCommandError'
})
export class CommandErrorsListener extends Listener<typeof Events.ChatInputCommandError> {
    run(error: unknown, payload: ChatInputCommandErrorPayload) {
        console.error(
            `[${new Date().toISOString()}] [ChatInputCommandError(${payload.command.name})]: ${safeErrorString(error)}`,
        );
    }
}