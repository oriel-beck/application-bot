import { container } from "@sapphire/framework";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import pkg from 'pg';
const { Pool } = pkg;

import { migrate } from 'drizzle-orm/node-postgres/migrator';
import * as schema from '../schema.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error("DATABASE_URL is required (e.g. postgresql://user:pass@postgres:5432/dbname)");
}

const pool = new Pool({
    connectionString: databaseUrl,
});

const db = drizzle(pool, { schema });

console.log("migrating database");
await migrate(db, { migrationsFolder: "/app/drizzle" })

// try to insert the config for the main guild, if it fails then simply ignore it
await db.insert(schema.settingsTable).values({ guild: BigInt(container.config.guild), enabled: false }).onConflictDoNothing();

container.drizzle = db;
console.log("registering database")

declare module "@sapphire/pieces" {
    interface Container {
        drizzle: NodePgDatabase<typeof schema>;
    }
}