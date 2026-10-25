import { container } from '@sapphire/framework';
import { Collection } from 'discord.js';

export interface StoredTip {
  content: string;
  url: string;
}

const TIP_KEY_PREFIX = 'tips:entry:';

export function parseTipNumber(content: string): number | null {
  const firstLine = content.split('\n')[0]?.toLowerCase();
  const match = firstLine?.match(/tip #(\d+)/);
  if (!match?.[1]) return null;
  const tip = Number(match[1]);
  return Number.isInteger(tip) ? tip : null;
}

function tipKey(tip: number) {
  return `${TIP_KEY_PREFIX}${tip}`;
}

function parseStoredTip(raw: string): StoredTip | null {
  try {
    const parsed = JSON.parse(raw) as Partial<StoredTip>;
    if (typeof parsed.content !== 'string' || typeof parsed.url !== 'string') return null;
    if (!parsed.content.trim()) return null;
    return { content: parsed.content, url: parsed.url };
  } catch {
    return null;
  }
}

export default class TipManager {
  tips: Collection<number, StoredTip> = new Collection();
  name = 'tips';
  constructor() {
    console.log(TipManager.name, 'manager is ready');
  }

  public async init() {}

  public async save(tip: number, value: StoredTip) {
    this.tips.set(tip, value);
    await container.redis.set(tipKey(tip), JSON.stringify(value));
  }

  private async loadStoredTips() {
    const tips = new Collection<number, StoredTip>();
    let cursor = '0';
    do {
      const [next, keys] = await container.redis.scan(cursor, 'MATCH', `${TIP_KEY_PREFIX}*`, 'COUNT', 100);
      cursor = next;
      if (!keys.length) continue;

      const values = await container.redis.mget(...keys);
      keys.forEach((key, index) => {
        const raw = values[index];
        if (!raw) return;
        const tip = Number(key.slice(TIP_KEY_PREFIX.length));
        const stored = parseStoredTip(raw);
        if (!Number.isInteger(tip) || !stored) return;
        tips.set(tip, stored);
      });
    } while (cursor !== '0');
    return tips;
  }

  public async refreshTips() {
    const tips = await this.loadStoredTips();
    const tipsChannel = container.client.channels.cache.get(container.config.channels.tips);
    if (tipsChannel && !tipsChannel.isTextBased()) throw new Error('Tips channel has to be a text channel!');

    if (tipsChannel?.isTextBased()) {
      const messages = await tipsChannel.messages.fetch({ limit: 100, cache: false }).catch(() => null);
      if (messages) {
        for (const message of messages.values()) {
          const tip = parseTipNumber(message.content);
          if (tip == null) continue;
          const value = { content: message.content, url: message.url };
          tips.set(tip, value);
          await container.redis.set(tipKey(tip), JSON.stringify(value));
        }
      }
    }

    this.tips = tips;
  }
}
