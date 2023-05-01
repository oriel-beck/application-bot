import { SapphireClient } from '@sapphire/framework';
import { GatewayIntentBits } from 'discord.js';
import '@sapphire/plugin-subcommands/register';
import './util/cssandra-driver.js';

const client = new SapphireClient({
  intents: [GatewayIntentBits.Guilds],
});

client.login(process.env.BOT_TOKEN).then(() => console.log('Bot is logged in')).catch((err) => console.error('Failed to start tht bot', err));

