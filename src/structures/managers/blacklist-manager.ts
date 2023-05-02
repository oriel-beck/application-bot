import { container } from "@sapphire/framework";
import { BaseManager } from "./base-manager";

export class BlacklistManager extends BaseManager {
    constructor() {
        super('blacklists')
    }
    
    public create(userid: string | bigint, reason: string, mod: string | bigint) {
        return this.driver.execute(this.genInsert('user', 'reason', 'mod'), [BigInt(userid), reason, BigInt(mod)]);
    }

    public delete(userid: string | bigint) {
        return this.driver.execute(this.genDelete('user'), [BigInt(userid)]);
    }

    public update(userid: string | bigint, field: string, value: any) {
        return this.driver.execute(this.genUpdate(field, 'user'), [value, BigInt(userid)]);
    }

    public get(userid: string | bigint) {
        return this.driver.execute(this.genSelect('*', 'user'), [BigInt(userid)]);
    }
}

container.blacklists = new BlacklistManager();
