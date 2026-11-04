import { describe, expect, it } from 'vitest';
import type OpenAI from 'openai';
import type { BdfdApiArgument } from './bdfd-api.js';
import type { BdscriptFunctionIndex } from './bdscript-function-index.js';
import { BdscriptValidationError } from './bdscript-validation.js';
import { RagService } from './rag.service.js';

type Message = OpenAI.Chat.Completions.ChatCompletionMessageParam;
type Reply = { content?: string; toolCalls?: { name: string; args: unknown }[] };

const arg = (name: string): BdfdApiArgument => ({ name, type: 'String', required: true });
const index: BdscriptFunctionIndex = new Map([
  ['nomention', { url: '', file: '', kind: 'function', variants: [null] }],
  ['charCount', { url: '', file: '', kind: 'function', variants: [[arg('Text')]] }],
  ['argsCheck', { url: '', file: '', kind: 'function', variants: [[arg('Argument count'), arg('Error message')]] }]
]);

/** A RagService whose OpenAI client replays `replies` in order, recording every request. */
function serviceWith(replies: Reply[]) {
  const requests: { messages: Message[]; tools: boolean }[] = [];
  let n = 0;
  const openai = {
    chat: {
      completions: {
        create: async (params: { messages: Message[]; tools?: unknown }) => {
          requests.push({ messages: structuredClone(params.messages), tools: !!params.tools });
          const reply = replies[n++];
          if (!reply) throw new Error('unexpected extra model call');
          return {
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: reply.content ?? null,
                  tool_calls: reply.toolCalls?.map((call, i) => ({
                    id: `call_${n}_${i}`,
                    type: 'function',
                    function: { name: call.name, arguments: JSON.stringify(call.args) }
                  }))
                }
              }
            ]
          };
        }
      }
    }
  };

  const service = new RagService() as unknown as Record<string, unknown>;
  service.openai = openai;
  service.collection = {};
  service.functionIndex = index;
  const complete = (service.completeWithTools as (...a: unknown[]) => Promise<string>).bind(service);
  const run = () =>
    complete(
      [
        { role: 'system', content: 'sys' },
        { role: 'user', content: 'q' }
      ],
      new Set(),
      new Set(),
      new Set()
    );
  return { run, requests };
}

const fence = (code: string) => `Here you go:\n\`\`\`\n${code}\n\`\`\``;

/** `;` inside an argument: unescaped it's two arguments, escaped (`\;`) it's one. */
const BROKEN = '$charCount[a;b]';
const FIXED = String.raw`$charCount[a\;b]`;

describe('RagService answer loop', () => {
  it('runs check_bdscript_code for the model and returns its markdown answer', async () => {
    const { run, requests } = serviceWith([
      { toolCalls: [{ name: 'check_bdscript_code', args: { codes: [`$nomention\n${BROKEN}`] } }] },
      { toolCalls: [{ name: 'check_bdscript_code', args: { codes: [`$nomention\n${FIXED}`] } }] },
      { content: fence(`$nomention\n${FIXED}`) }
    ]);

    expect(await run()).toBe(fence(`$nomention\n${FIXED}`));
    const toolResults = requests[2]!.messages.filter((m) => m.role === 'tool').map((m) => m.content);
    expect(toolResults[0]).toContain('`$charCount` got 2 argument(s)');
    expect(toolResults[1]).toBe('Code 1: no problems found.');
  });

  it('sends problems the model skipped checking back to it, and accepts the fix', async () => {
    const { run, requests } = serviceWith([{ content: fence(BROKEN) }, { content: fence(FIXED) }]);

    expect(await run()).toBe(fence(FIXED));
    const repair = requests[1]!.messages.at(-1)!;
    expect(repair.role).toBe('user');
    expect(repair.content).toContain('wrong number of arguments');
    expect(repair.content).toContain('check_bdscript_code');
    expect(requests[1]!.tools).toBe(true);
  });

  it('escapes placeholder brackets itself, without a repair round trip', async () => {
    const { run, requests } = serviceWith([{ content: fence('$argsCheck[2;Use [@user] [amount]]') }]);
    expect(await run()).toBe(fence('$argsCheck[2;Use [@user\\] [amount\\]]'));
    expect(requests).toHaveLength(1);
  });

  it('accepts prose answers with no code', async () => {
    const { run } = serviceWith([{ content: 'Use `$charCount` to count characters.' }]);
    expect(await run()).toBe('Use `$charCount` to count characters.');
  });

  it('refuses to send code that still fails after the retries', async () => {
    const broken = { content: fence('$lenght[hi]') };
    const { run, requests } = serviceWith([broken, broken, broken]);
    await expect(run()).rejects.toBeInstanceOf(BdscriptValidationError);
    expect(requests).toHaveLength(3);
  });
});
