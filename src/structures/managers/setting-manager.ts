import { container } from "@sapphire/framework";
import { BaseManager } from "./base-manager";

export class SettingManager extends BaseManager {
    constructor() {
        super('settings')
    }

    public create(guildid: string | bigint) {
        return this.driver.execute(this.genInsert('guild', 'enabled'), [BigInt(guildid), false]);
    }

    public get(guildid: string | bigint) {
        return this.driver.execute(this.genSelect('*', 'guild'), [BigInt(guildid)]);
    }

    public delete(guildid: string | bigint) {
        return this.driver.execute(this.genDelete('guild'), [BigInt(guildid)]);
    }

    public update(guildid: string | bigint, field: string, value: any) {
        return this.driver.execute(this.genUpdate(field, 'guild'), [value, BigInt(guildid)]);
    }
}

container.settings = new SettingManager();
