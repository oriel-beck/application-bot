import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener, UserError, type ChatInputCommandDeniedPayload } from "@sapphire/framework";

@ApplyOptions<Listener.Options>({
    event: Events.ChatInputCommandDenied,
})
export class CommandDeniedListener extends Listener<typeof Events.ChatInputCommandDenied> {
    run(error: UserError, payload: ChatInputCommandDeniedPayload) {
        payload.interaction.reply({
            content: error.message,
            ephemeral: true
        });
    }
}