import { container } from "@sapphire/framework";
import { BaseManager } from "./base-manager";

export class SettingManager extends BaseManager {
    constructor() {
        super('settings')
    }

    create(guildid: string | bigint) {
        return this.driver.execute('INSERT INTO appbot.settings (guild, enabled) VALUES (?, ?) IF NOT EXISTS', [BigInt(guildid), false]);
    }

    get(guildid: string | bigint) {
        return this.driver.execute('SELECT * FROM appbot.settings WHERE guild = ?', [BigInt(guildid)]);
    }
}

container.settings = new SettingManager();
