import { SapphireClient } from '@sapphire/framework';
import { GatewayIntentBits } from 'discord.js';

// register config
import './config/register.js';

// register subcommand plugin
import '@sapphire/plugin-subcommands/register';

// assign cassandra driver to container.driver
import './util/cssandra-driver-register.js';

// assign managers to container
import './structures/managers/register.js';

const client = new SapphireClient({
  intents: [GatewayIntentBits.Guilds],
});

client.login(process.env.BOT_TOKEN).catch((err) => console.error('Failed to start tht bot', err));

