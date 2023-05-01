import type { ApplicationManager } from "./structures/application-manager";
import type { BlacklistManager } from "./structures/blacklist-manager";
import type { QuestionManager } from "./structures/question-manager";
import type { SettingManager } from "./structures/setting-manager";
import type { CustomCassandraClient } from "./util/cssandra-driver";

declare module '@sapphire/pieces' {
    interface Container {
        driver: CustomCassandraClient;
        applications: ApplicationManager;
        questions: QuestionManager;
        settings: SettingManager;
        blacklists: BlacklistManager;
    }
}