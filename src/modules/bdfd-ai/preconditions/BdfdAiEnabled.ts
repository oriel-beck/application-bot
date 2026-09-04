import { Precondition } from '@sapphire/framework';
import type { CommandInteraction } from 'discord.js';

export class BdfdAiEnabledPrecondition extends Precondition {
  #message = 'The AI assistant is currently turned off.';

  public chatInputRun(interaction: CommandInteraction) {
    return this.checkEnabled(interaction.guildId);
  }

  private async checkEnabled(guildId: string | null) {
    if (!guildId) {
      return this.error({ message: this.#message });
    }

    const result = await this.container.settings.get(guildId).catch(() => null);
    return result?.at(0)?.aiEnabled ? this.ok() : this.error({ message: this.#message });
  }
}

declare module '@sapphire/framework' {
  interface Preconditions {
    BdfdAiEnabled: never;
  }
}
