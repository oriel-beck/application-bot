import { BaseManager } from "./base-manager";

export class BlacklistManager extends BaseManager {
    constructor() {
        super('blacklists')
    }
    
    create(userid: string | bigint, reason: string, mod: string | bigint) {
        return this.driver.execute('INSERT INTO appbot.blacklists (user, reason, mod) VALUES (?, ?, ?) IF NOT EXISTS', [BigInt(userid), reason, BigInt(mod)]);
    }

    delete(userid: string | bigint) {
        return this.driver.execute('DELETE FROM appbot.blacklists WHERE user = ?', [BigInt(userid)]);
    }

    update(userid: string | bigint, field: string, value: any) {
        return this.driver.execute('UPDATE appbot.blacklists SET ? = ? WHERE user = ?', [field, value, BigInt(userid)]);
    }
}