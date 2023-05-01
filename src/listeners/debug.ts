import { ApplyOptions } from "@sapphire/decorators";
import { Listener, type ListenerOptions } from "@sapphire/framework";

@ApplyOptions<ListenerOptions>({
    event: 'debug'
})
export class DebugListener extends Listener<'debug'> {
    run(msg: string): void {
        console.log(msg);
    }
}