import { ApplyOptions } from "@sapphire/decorators";
import { Listener, type ListenerOptions } from "@sapphire/framework";

@ApplyOptions<ListenerOptions>({
    event: 'ready'
})
export class DebugListener extends Listener<'ready'> {
    run(): void {
        console.log('Bot is ready');
    }
}