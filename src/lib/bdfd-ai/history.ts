import { container } from '@sapphire/framework';

/** Persisted turn-based history for a support thread or ticket channel */
export async function loadConversationHistory(channelId: string) {
    return container.aiConversation.getHistory(channelId);
}
