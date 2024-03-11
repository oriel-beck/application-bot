import { GatewayIntentBits, Options, Partials } from 'discord.js';
import { ApplicationClient } from '@lib/app-client.js';

// register config
import '@lib/config/register.js';

// register subcommand plugin
import '@sapphire/plugin-subcommands/register';

// assign cassandra driver to container.driver
import "@lib/cssandra-driver-register.js";

const client = new ApplicationClient({
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
}, {
  enabledModules: [
    "applications",
    "blacklist",
    "errors",
    "misc",
    "owner",
    "questions",
    "report",
    "forums"
  ]
});


client.login(process.env.BOT_TOKEN).catch((err) => console.error('Failed to start the bot', err));

/*
{
    "channels": {
        "pending": "778626940474753070",
        "denied": "789180848674832384",
        "accepted": "778899305607593994",
        "report": "778227221286223873",
        "staff": "609162354483265567"
    },
    "roles": {
        "mod": "566364651986747392",
        "trial_support": "601184059514945554"
    }
}
*/