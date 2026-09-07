import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import type { AnyThreadChannel } from 'discord.js';
import {
  applyForumCloseFlow,
  getCloseAction,
  getForumPostKind,
  getStoredForumTags,
  hasCloseTag,
  sameTags,
  storeForumTags,
  syncForumHelpEmbed
} from '../post-util.js';

@ApplyOptions<Listener.Options>({
  event: Events.ThreadUpdate,
  name: 'supportPostUpdate'
})
export class PostUpdateListener extends Listener<typeof Events.ThreadUpdate> {
  async run(oldThread: AnyThreadChannel, newThread: AnyThreadChannel) {
    const kind = getForumPostKind(newThread.parentId ?? newThread.parent?.id);
    if (!kind) return;

    const newTags = newThread.appliedTags ?? [];
    const oldTags = (await getStoredForumTags(newThread.id)) ?? oldThread.appliedTags ?? [];
    if (sameTags(oldTags, newTags)) return;

    const closeAction = getCloseAction(kind, oldTags, newTags);
    if (closeAction) {
      await applyForumCloseFlow(newThread, kind, closeAction, oldTags);
      await storeForumTags(newThread.id, newTags);
      return;
    }

    await storeForumTags(newThread.id, newTags);
    if (hasCloseTag(kind, newTags)) return;

    await syncForumHelpEmbed(newThread, kind, newTags);
  }
}
