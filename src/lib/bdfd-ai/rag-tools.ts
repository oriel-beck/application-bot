import type OpenAI from 'openai';

export const MAX_TOOL_ROUNDS = 6;
export const TOOL_SEARCH_TOP_K = 6;

export const WIKI_AGENT_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_wiki',
      description:
        'Search the BDFD wiki for more BDScript documentation. Use when initial context is missing functions, syntax, or guides you need to answer accurately.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Specific search query, e.g. "$textSplit and $splitText" or "slash command autocomplete"'
          }
        },
        required: ['query'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'check_bdscript_functions',
      description:
        'Verify BDScript $function or callback names exist. Returns whether each name is a function (reply code) or a callback (command trigger only, not reply code). Always check names you plan to mention.',
      parameters: {
        type: 'object',
        properties: {
          names: {
            type: 'array',
            items: { type: 'string' },
            description: 'Names with or without $, e.g. ["message", "$addField", "$onJoined"]'
          }
        },
        required: ['names'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'check_bdscript_code',
      description:
        'Check BDScript code before showing it to the user. Reports unknown functions (with suggestions), wrong argument counts, arguments of the wrong type (e.g. a comparison or placeholder text where an ID belongs), literal `]` that close a function early, unclosed brackets, and callbacks used in reply code — each with its line and column. It does not run the code. Call it with every code block you plan to include, fix what it reports, and check again until it finds no problems.',
      parameters: {
        type: 'object',
        properties: {
          codes: {
            type: 'array',
            items: { type: 'string' },
            description: 'Each code block exactly as you will show it, without the ``` fences. One entry per block.'
          }
        },
        required: ['codes'],
        additionalProperties: false
      }
    }
  }
];
