import { sweepInactiveSupportChannels } from '@lib/bdfd-ai/cleanup-channel.js';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';

const SWEEP_INTERVAL_MS = 24 * 60 * 60 * 1000;

@ApplyOptions<Listener.Options>({
  event: Events.ClientReady,
  once: true,
  name: 'bdfdAiInactiveSweepReady'
})
export class BdfdAiInactiveSweepReadyListener extends Listener<typeof Events.ClientReady> {
  async run() {
    const sweep = () =>
      sweepInactiveSupportChannels().catch((err) => console.error('[bdfd-ai] inactive sweep failed:', err));

    await sweep();
    setInterval(sweep, SWEEP_INTERVAL_MS);
  }
}
