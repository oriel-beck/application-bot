import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import type { ActionRowBuilder, AnyThreadChannel, ButtonBuilder, EmbedBuilder } from 'discord.js';
import { generateBugReportHelpEmbed } from '../bug-report-util.js';
import { generateInternationalPostHelpEmbed } from '../international-util.js';
import { generatePostHelpEmbed } from '../util.js';

@ApplyOptions<Listener.Options>({
  event: Events.ThreadCreate,
  name: 'supportPostCreate'
})
export class PostCreateListener extends Listener<typeof Events.ThreadCreate> {
  async run(thread: AnyThreadChannel, newlyCreated: boolean) {
    if (!newlyCreated) return;

    if (thread.parent?.id === this.container.config.channels.support) {
      const { row, embed } = generatePostHelpEmbed(thread.appliedTags);
      // If the author sends an attachment the bot cannot reply until it is fully sent but still gets the event, so retry in 5 seconds (5 attempts)
      await retryMessage(thread, embed, row);
      return;
    }

    if (thread.parent?.id === this.container.config.channels.international_support) {
      const { row, embed } = generateInternationalPostHelpEmbed(thread.appliedTags);
      await retryMessage(thread, embed, row);
      return;
    }

    if (thread.parent?.id === this.container.config.channels.bug_reports) {
      const { row, embed } = generateBugReportHelpEmbed(thread.appliedTags);
      await retryMessage(thread, embed, row);
    }
  }
}

async function retryMessage(channel: AnyThreadChannel, embed: EmbedBuilder, row: ActionRowBuilder<ButtonBuilder>) {
  let attempts = 0;
  return await retry();
  async function retry() {
    return await channel
      .send({
        embeds: [embed],
        components: [row]
      })
      .catch(() => {
        if (attempts === 5) return;
        attempts++;
        setTimeout(() => {
          retry();
        }, 5000);
      });
  }
}
