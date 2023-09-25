import { canAccessFile } from "@lib/util.js";
import { container } from "@sapphire/framework";
import { readFile } from "fs/promises";
import { join } from "path";

const configPath = join(process.cwd(), 'config.json');

async function registerConfig() {
    if (!await canAccessFile(configPath)) throw new Error(`[registerConfig]: Could not find configuration file at ${configPath}`);
    const jsonString = await readFile(configPath, { encoding: 'utf-8' });
    container.config = JSON.parse(jsonString);
}

registerConfig();