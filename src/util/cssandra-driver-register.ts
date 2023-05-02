import { container } from '@sapphire/framework';
import { Client } from 'cassandra-driver';

export class CustomCassandraClient extends Client {
    private attempt = 0;
    attemptConnection() {

        this.connect()
            .then(() => {
                console.log('Connected tp cylla, took', this.attempt, 'attempts');
                container.questions.initQuestions();
            })
            .catch((_) => {
                this.attempt++
                console.log('Failed to connect to scylla, attempt', this.attempt);
                setTimeout(() => {
                    this.attemptConnection();
                }, 5000);
            });
    }
}

container.driver = new CustomCassandraClient({
    contactPoints: ['scylla:9042'],
    localDataCenter: 'datacenter1',
    keyspace: 'appbot',
    credentials: {
        username: process.env.DB_USER!,
        password: process.env.DB_PASS!
    },
});

console.log('Assigning CassandraDriver to container.driver')
container.driver.attemptConnection();