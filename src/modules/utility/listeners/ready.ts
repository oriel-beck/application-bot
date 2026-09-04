import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';

@ApplyOptions<Listener.Options>({
  event: Events.ClientReady,
  once: true,
  name: 'tipsClientReadyOnce'
})
export class TipsClientReadyListener extends Listener<typeof Events.ClientReady> {
  async run() {
    await this.container.tips.refreshTips();
  }
}
