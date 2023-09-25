import { types, type ArrayOrObject, type QueryOptions, Client } from "cassandra-driver";

export default class CassandraManager {
    private attempts = 0;
    private driver: Client;

    constructor() {
        throwOnEmpty("DB_USER");
        throwOnEmpty("DB_PASS");

        this.driver = new Client({
            contactPoints: ['scylla:9042'],
            // TODO: look into datacenters for clustering
            localDataCenter: "datacenter1",
            keyspace: "appbot",
            credentials: {
                username: process.env.DB_USER!,
                password: process.env.DB_PASS!
            },
            pooling: {
                coreConnectionsPerHost: {
                    [types.distance.local]: 5
                }
            }
        });
    }

    execute(query: string, params?: ArrayOrObject, options?: QueryOptions): Promise<types.ResultSet> {
        return this.driver.execute(query, params, options);
    }

    async* stream(query: string, params?: ArrayOrObject, options: QueryOptions = {}) {
        do {
            const resultSet = await this.driver.execute(query, params, options);

            options.pageState = resultSet.pageState;
            yield* resultSet;
        } while (options.pageState != null);
    }

    async init() {
        while (true) {
            try {
                await this.driver.connect();
                console.log(`Connected to scylla, took ${this.attempts} attempts`);
                this.attempts = 0;

                break;
            } catch (err) {
                console.error(`Failed to connect to cassandra: `, err);
                ++this.attempts;

                await new Promise(res => setTimeout(res, 5000));
            }
        }
    }
}

function throwOnEmpty(variable: string) {
    if (!process.env[variable]) {
        throw new Error(`$${variable} is not set. Any database related features will not work`);
    }
}


declare module "@sapphire/pieces" {
    interface Container {
        db: CassandraManager;
    }
}
