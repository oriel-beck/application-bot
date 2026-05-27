import type OpenAI from 'openai';

export const MAX_TOOL_ROUNDS = 4;
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
                        description:
                            'Specific search query, e.g. "$textSplit and $splitText" or "slash command autocomplete"',
                    },
                },
                required: ['query'],
                additionalProperties: false,
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'check_bdscript_functions',
            description:
                'Verify BDScript $function names exist in the wiki before using them in your answer. Always check functions you plan to mention.',
            parameters: {
                type: 'object',
                properties: {
                    names: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Function names with or without $, e.g. ["message", "$addField"]',
                    },
                },
                required: ['names'],
                additionalProperties: false,
            },
        },
    },
];
