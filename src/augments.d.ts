import type { Config } from "./config/config";
import type { ApplicationManager, BlacklistManager, QuestionManager, SettingManager } from "./structures/managers";
import type { CustomCassandraClient } from "./util/cssandra-driver-register";

declare module '@sapphire/pieces' {
    interface Container {
        driver: CustomCassandraClient;
        applications: ApplicationManager;
        questions: QuestionManager;
        settings: SettingManager;
        blacklists: BlacklistManager;
        config: Config;
    }
}