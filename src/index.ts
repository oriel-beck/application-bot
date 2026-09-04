import { GatewayIntentBits, Options, Partials } from 'discord.js';
import { ApplicationClient } from '@lib/app-client.js';

// register config
import '@lib/config/register.js';

// register international support translations
import '@lib/international-support-register.js';

// register subcommand plugin
import '@sapphire/plugin-subcommands/register';

// register drizzle
import '@lib/db-register.js';

// register redis
import '@lib/redis-register.js';

// register bdfd-ai RAG
import '@lib/bdfd-ai/bdfd-ai-register.js';

const client = new ApplicationClient(
  {
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMessages
    ],
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
  },
  {
    enabledModules: [
      'applications',
      'blacklist',
      'errors',
      'misc',
      'owner',
      'questions',
      'report',
      'forums',
      'utility',
      'share-your-bot',
      'transcripts',
      'bdfd-ai'
    ]
  }
);

client.login(process.env.BOT_TOKEN).catch((err) => console.error('Failed to start the bot', err));
