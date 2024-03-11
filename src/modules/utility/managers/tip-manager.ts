import { container } from "@sapphire/framework";
import { Collection, Message } from "discord.js";

export default class TipManager {
    tips: Collection<number, Message> = new Collection();
    name = "tips";
    constructor() {
        console.log(TipManager.name, 'manager is ready');
    }

    public async init() {}

    private async getAllTips() {
        const tips = new Collection<number, Message>();
        const tipsChannel = container.client.channels.cache.get(container.config.channels.tips);
        if (!tipsChannel?.isTextBased()) throw new Error("Tips channel has to be a text channel!");
        const messages = await tipsChannel.messages.fetch({ limit: 100, cache: false }).catch(() => []);
        for (const message of messages.values()) {
            const firstLine = message.content.split("\n").at(0)?.toLowerCase();
            const numbers = firstLine!.match(/tip #(\d+)/);
            if (!numbers) continue;
            tips.set(Number(numbers[1]), message);
        }
        return tips;
    }

    public async refreshTips() {
        this.tips = new Collection();
        this.tips = await this.getAllTips();
    }
}