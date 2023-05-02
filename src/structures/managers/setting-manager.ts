import { container } from "@sapphire/framework";
import { BaseManager } from "./base-manager";
import type { Setting } from "../../types";

export class SettingManager extends BaseManager {
    constructor() {
        super('settings')
    }

    public create(guildid: string) {
        return this.driver.execute(this.genInsert('guild', 'enabled'), [guildid, false], { prepare: true });
    }

    public get(guildid: string) {
        return this.driver.execute(this.genSelect('*', 'guild'), [guildid], { prepare: true });
    }

    public delete(guildid: string) {
        return this.driver.execute(this.genDelete('guild'), [guildid], { prepare: true });
    }

    public update(guildid: string, field: keyof Setting, value: any) {
        return this.driver.execute(this.genUpdate(field, 'guild'), [value, guildid], { prepare: true });
    }
}

container.settings = new SettingManager();
