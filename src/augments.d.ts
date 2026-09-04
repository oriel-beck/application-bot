import type { Config } from './lib/config/config.js';
import type ApplicationManager from './modules/applications/managers/application.manager.js';
import type BlacklistManager from './modules/blacklist/managers/blacklist.manager.js';
import type SettingManager from './modules/misc/managers/setting.manager.js';
import type QuestionManager from './modules/questions/managers/question.manager.js';
import type TipManager from 'modules/utility/managers/tip-manager.ts';
import type CooldownManager from 'modules/share-your-bot/managers/cooldown.manager.ts';
import type TranscriptManager from 'modules/transcripts/managers/transcriptManager.ts';
import type { RagService } from './lib/bdfd-ai/rag.service.js';
import type AiRateManager from './modules/bdfd-ai/managers/ai-rate.manager.js';
import type AiConversationManager from './modules/bdfd-ai/managers/ai-conversation.manager.js';

declare module '@sapphire/pieces' {
  interface Container {
    applications: ApplicationManager;
    questions: QuestionManager;
    settings: SettingManager;
    blacklists: BlacklistManager;
    config: Config;
    tips: TipManager;
    cooldown: CooldownManager;
    transcripts: TranscriptManager;
    rag: RagService;
    aiRate: AiRateManager;
    aiConversation: AiConversationManager;
  }
}
