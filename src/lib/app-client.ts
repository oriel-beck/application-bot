import { SapphireClient, container } from "@sapphire/framework";
import { getRootData } from "@sapphire/pieces";
import { ClientOptions } from "discord.js";
import { opendir } from "fs/promises";
import { join } from "path";
import { BaseManager } from "./managers/base.manager.js";

interface ApplicationBotClientOptions {
    enabledModules: string[];
}

export class ApplicationClient extends SapphireClient {
    private rootData = getRootData();

    constructor(options: ClientOptions, public appbotOptions: ApplicationBotClientOptions) {
        super(options);
    }

    async login(token?: string | undefined): Promise<string> {
        const loadedManagers = new Set<string>();

        for (const module of this.appbotOptions.enabledModules) {
            const rootDir = join(this.rootData.root, "modules", module);

            const managersRootDir = join(rootDir, "managers");
            const managersDirHandle = await opendir(managersRootDir).catch(() => null);

            if (managersDirHandle) {
                for await (const dirent of managersDirHandle) {
                    if (dirent.isFile() && dirent.name.endsWith(".js")) {

                        const manager: BaseManager = new ((await import(join(managersRootDir, dirent.name))).default);

                        if (loadedManagers.has(manager.name)) {
                            throw new Error(`A manager with name "${manager.name}" already exists`);
                        }

                        if (manager.name in container) {
                            throw new Error(`container.${manager.name} exists and is not undefined`);
                        }

                        await manager.init();
                        // @ts-ignore I know better
                        container[manager.name] = manager;
                        loadedManagers.add(manager.name);

                        console.log(`Initialized ${manager.name}`)
                    }
                }
            }

            this.stores.registerPath(rootDir);
        }

        return super.login(token);
    }
}