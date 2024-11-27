import { container } from "@sapphire/framework";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import pkg from 'pg';
const { Pool } = pkg;

import { migrate } from 'drizzle-orm/node-postgres/migrator';
import * as schema from '../schema.js';

const pool = new Pool({
    connectionString: `postgres://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@postgres:5432/${process.env.POSTGRES_DB}`,
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