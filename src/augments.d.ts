import type CassandraManager from "@lib/managers/cassandra-manager.ts";
import type { Config } from "./lib/config/config.js";
import type ApplicationManager from "./modules/applications/managers/application.manager.js";
import type BlacklistManager from "./modules/blacklist/managers/blacklist.manager.js";
import type SettingManager from "./modules/misc/managers/setting.manager.js";
import type QuestionManager from "./modules/questions/managers/question.manager.js";

declare module '@sapphire/pieces' {
    interface Container {
        driver: CassandraManager;
        applications: ApplicationManager;
        questions: QuestionManager;
        settings: SettingManager;
        blacklists: BlacklistManager;
        config: Config;
    }
}