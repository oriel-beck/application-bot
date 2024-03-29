import type { Setting } from "../../../lib/types.js";
import { BaseManager } from "@lib/managers/base.manager.js";

export default class SettingManager extends BaseManager {
    constructor() {
        super('settings')
    }

    public init() {
        // TODO: change to bdfd guild and false
        this.driver.execute(this.genInsert('guild', 'enabled'), ['813707403056119808', true], {prepare: true});
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