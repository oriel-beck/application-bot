import { ApplyOptions } from "@sapphire/decorators";
import { Listener, type ListenerOptions } from "@sapphire/framework";
import type { Client } from "discord.js";

@ApplyOptions<ListenerOptions>({
    event: 'ready'
})
export class DebugListener extends Listener<'ready'> {
    run(client: Client): void {
        console.log(`${client.user?.tag} is ready`);
    }
}