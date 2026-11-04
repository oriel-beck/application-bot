import { describe, expect, it } from 'vitest';
import { ButtonStyle, ComponentType, type APIActionRowComponent, type APIEmbed } from 'discord.js';
import type { SimResult } from '@lib/bdscript-sim/types.js';
import { buildSimulationFallback, buildSimulationReply } from './simulate.utils.js';

function result(overrides: Partial<SimResult> = {}): SimResult {
  return { content: '', embeds: [], components: [], sideEffects: [], notSimulated: [], notes: [], ...overrides };
}

const embedsOf = (reply: ReturnType<typeof buildSimulationReply>) =>
  (reply.embeds ?? []).map((e) => ('toJSON' in e ? e.toJSON() : e) as APIEmbed);

describe('buildSimulationReply', () => {
  it('sends the simulated text as-is, never pinging anyone, with the report last', () => {
    const reply = buildSimulationReply(result({ content: 'Hi <@1> @everyone' }), 'general');
    expect(reply.content).toBe('Hi <@1> @everyone');
    expect(reply.allowedMentions).toEqual({ parse: [] });
    const [report] = embedsOf(reply);
    expect(report?.title).toBe('BDScript simulation');
    expect(report?.footer?.text).toContain('#general');
  });

  it('renders simulated embeds before the report, dropping non-URL images with a note', () => {
    const reply = buildSimulationReply(
      result({
        embeds: [
          { title: 'Hello', color: 0xff0000, image: 'not a url', fields: [{ name: 'A', value: 'B', inline: true }] }
        ]
      }),
      'general'
    );
    const [embed, report] = embedsOf(reply);
    expect(embed).toMatchObject({ title: 'Hello', color: 0xff0000, fields: [{ name: 'A', value: 'B', inline: true }] });
    expect(embed?.image).toBeUndefined();
    expect(report?.fields?.find((f) => f.name === 'Notes')?.value).toContain("isn't a URL");
  });

  it('renders buttons and menus disabled, with unique IDs; link buttons keep their URL', () => {
    const reply = buildSimulationReply(
      result({
        components: [
          {
            type: 'buttons',
            buttons: [
              { id: 'same', label: 'A', style: 'primary', disabled: false },
              { id: 'same', label: 'B', style: 'danger', disabled: false },
              { id: 'https://example.com', label: 'Site', style: 'link', disabled: false }
            ]
          },
          {
            type: 'select',
            menu: { id: 'm', min: 1, max: 5, options: [{ label: 'One', value: 'x', description: '', default: false }] }
          }
        ]
      }),
      'general'
    );
    const rows = (reply.components ?? []).map((r) =>
      'toJSON' in r ? r.toJSON() : r
    ) as APIActionRowComponent<never>[];
    const buttons = rows[0]!.components as unknown as {
      custom_id?: string;
      url?: string;
      disabled: boolean;
      style: number;
    }[];
    expect(buttons.every((b) => b.disabled)).toBe(true);
    expect(buttons[0]!.custom_id).not.toBe(buttons[1]!.custom_id);
    expect(buttons[2]).toMatchObject({ style: ButtonStyle.Link, url: 'https://example.com' });

    const select = rows[1]!.components[0] as unknown as { type: number; disabled: boolean; max_values: number };
    expect(select).toMatchObject({ type: ComponentType.StringSelect, disabled: true, max_values: 1 });
  });

  it('notes a select menu with no options instead of sending one Discord would reject', () => {
    const reply = buildSimulationReply(
      result({ components: [{ type: 'select', menu: { id: 'empty', min: 1, max: 1, options: [] } }] }),
      'general'
    );
    expect(reply.components).toEqual([]);
    expect(embedsOf(reply)[0]?.fields?.find((f) => f.name === 'Notes')?.value).toContain('`empty` has no options');
  });

  it('lists side effects and unsimulated calls, and explains an early stop', () => {
    const reply = buildSimulationReply(
      result({
        stoppedBy: 'unsupported',
        unsupportedReason: "`$if` depends on `$ping`, which the simulator can't evaluate",
        sideEffects: ['`$ban[spam]`'],
        notSimulated: ['$ping']
      }),
      'general'
    );
    const [report] = embedsOf(reply);
    expect(report?.description).toContain('`$if` depends on `$ping`');
    expect(report?.fields?.map((f) => f.name)).toEqual(['Would also do (not performed)', 'Not simulated']);
  });

  it('truncates long lists to fit an embed field', () => {
    const many = Array.from({ length: 100 }, (_, i) => `\`$ban[user ${i} for a fairly long reason]\``);
    const [report] = embedsOf(buildSimulationReply(result({ sideEffects: many }), 'general'));
    const value = report!.fields![0]!.value;
    expect(value.length).toBeLessThanOrEqual(1024);
    expect(value).toMatch(/…and \d+ more$/);
  });
});

describe('buildSimulationFallback', () => {
  it("keeps the text and says why the rest couldn't be shown", () => {
    const reply = buildSimulationFallback(result({ content: 'hi' }), 'general', new Error('Invalid emoji'));
    expect(reply.content).toBe('hi');
    expect(embedsOf(reply)[0]?.fields?.[0]?.value).toContain('Invalid emoji');
  });
});
