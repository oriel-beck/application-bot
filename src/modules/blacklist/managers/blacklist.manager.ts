import { BaseManager } from "@lib/managers/base.manager.js";
import { Blacklist } from "@lib/types.js";

export default class BlacklistManager extends BaseManager {
    constructor() {
        super('blacklists')
    }
    
    public create(userid: string, reason: string, mod: string | bigint) {
        return this.driver.execute(this.genInsert('user', 'reason', 'mod'), [userid, reason, mod], { prepare: true });
    }

    public delete(userid: string) {
        return this.driver.execute(this.genDelete('user'), [userid], { prepare: true });
    }

    public update(userid: string, field: keyof Blacklist, value: any) {
        return this.driver.execute(this.genUpdate(field, 'user'), [value, userid], { prepare: true });
    }

    public get(userid: string) {
        return this.driver.execute(this.genSelect('*', 'user'), [userid], { prepare: true });
    }
}