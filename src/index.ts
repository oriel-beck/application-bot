import { SapphireClient } from '@sapphire/framework';
import { GatewayIntentBits, Options, Partials } from 'discord.js';

// register config
import './config/register.js';

// register subcommand plugin
import '@sapphire/plugin-subcommands/register';

// assign cassandra driver to container.driver
import './util/cssandra-driver-register.js';

// assign managers to container
import './structures/managers/register.js';

const client = new SapphireClient({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages],
  partials: [Partials.Channel, Partials.Message, Partials.User],
  makeCache: Options.cacheWithLimits({
    MessageManager: 0,
    GuildInviteManager: 0,
    GuildEmojiManager: 0,
    GuildStickerManager: 0,
    GuildBanManager: 0,
    GuildScheduledEventManager: 0,
    ReactionUserManager: 0,
    AutoModerationRuleManager: 0,
    VoiceStateManager: 0,
    StageInstanceManager: 0
  })
});

client.login(process.env.BOT_TOKEN).catch((err) => console.error('Failed to start tht bot', err));

