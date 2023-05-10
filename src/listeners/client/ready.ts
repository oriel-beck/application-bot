import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener, type ListenerOptions } from "@sapphire/framework";
import type { Client } from "discord.js";

@ApplyOptions<ListenerOptions>({
    event: Events.ClientReady
})
export class DebugListener extends Listener<typeof Events.ClientReady> {
    run(client: Client): void {
        console.log(`${client.user?.tag} is ready`);
    }
}