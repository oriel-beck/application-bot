import { container } from "@sapphire/framework";
import type { Setting } from "../../../lib/types.js";
import { BaseManager } from "@lib/managers/base.manager.js";
import { settingsTable } from "../../../schema.js";
import { eq } from "drizzle-orm";

export default class SettingManager extends BaseManager {
    constructor() {
        super('settings')
    }

    public async init() {
        this.drizzle.insert(settingsTable).values({
            guild: BigInt(container.config.guild),
            enabled: false
        });
    }

    public create(guildid: string) {
        return this.drizzle.insert(settingsTable).values({
            guild: BigInt(guildid),
            enabled: false
        }).returning();
    }

    public get(guildid: string) {
        return this.drizzle.select().from(settingsTable).where(eq(settingsTable.guild, BigInt(guildid)));
    }

    public delete(guildid: string) {
        return this.drizzle.delete(settingsTable).where(eq(settingsTable.guild, BigInt(guildid)));
    }

    public update(guildid: string, field: keyof Setting, value: any) {
        return this.drizzle.update(settingsTable).set({
            [field]: value
        }).where(eq(settingsTable.guild, BigInt(guildid))).returning();
    }
}