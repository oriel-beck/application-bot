import { container } from "@sapphire/framework";
import CassandraManager from "./managers/cassandra-manager.js";

const driver = new CassandraManager();

console.log('Initiating CassandraDriver')
await driver.init();
console.log('Assigning CassandraDriver to container.driver');
container.driver = driver;