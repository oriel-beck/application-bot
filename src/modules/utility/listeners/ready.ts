import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";

@ApplyOptions<Listener.Options>({
    event: Events.ClientReady,
    once: true
})
export class CommandDeniedListener extends Listener<typeof Events.ClientReady> {
    async run() {
        await this.container.tips.refreshTips();
    }
}