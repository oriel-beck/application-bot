# bdfd-ai

RAG-powered AI assistant for support forum threads, international support threads, and ticket channels.

**Off by default** until an owner runs `/ai-toggle`.

## Trigger

1. **`/ai`** — slash command with a `message` option; any guild channel (public reply). Uses `ignoreAiEnabled` + `skipChannelTracking`: no `ai_enabled` gate, **no** per-channel usage limit, **no** conversation memory (each invoke is standalone).
2. **Reply to a bot message** — support/intl threads and tickets only; requires `ai_enabled` (`listeners/message-create.ts`). Counts toward channel limit and persists turns.

Both paths share `processAiRequest` in `src/lib/bdfd-ai/process-request.ts`.

## Conversation memory

Reply-to-bot only. Turns are stored in PostgreSQL (`ai_conversation_turns`): alternating **user** / **assistant** rows per channel. Each new question loads prior turns (up to 20) so follow-ups stay in context. Owner `/ai-limit` action **Clear AI conversation** wipes a channel’s history. **`/ai` does not read or write this table.**

**Auto-cleanup** (`cleanup-channel.ts`): when a support post is resolved (Resolve button or `/forum solve`) or a ticket channel is deleted, AI conversation + Redis usage/intro keys are cleared; transcript rows are deleted too (tickets: transcript only if the closing DM was sent successfully).

## Pieces

| Path | Role |
|------|------|
| `commands/ai.ts` | User-facing `/ai` command (any channel, public reply, ignores toggle) |
| `commands/ai-toggle.ts` | Owner `/ai-toggle` — enable/disable guild AI |
| `commands/ai-limit.ts` | Owner `/ai-limit` — limits, usage, clear conversation |
| `listeners/message-create.ts` | Reply-to-bot flow |
| `listeners/ticket-intro.ts` | One-time ticket intro (only when AI enabled) |
| `managers/ai-rate.manager.ts` | Per-channel usage limit, thinking lock |
| `managers/ai-conversation.manager.ts` | Persisted turn history (`container.aiConversation`) |
| `preconditions/BdfdAiEnabled.ts` | Unused by `/ai`; reserved for future gated commands |

## Shared lib (`src/lib/bdfd-ai/`)

| File | Role |
|------|------|
| `process-request.ts` | Gates, thinking UI, RAG call, save turns |
| `response-utils.ts` | Embeds; replies over 4096 chars attach `bdfd-ai-response.txt` |
| `rag.service.ts` | Chroma + OpenAI (`container.rag`) |
| `channel-utils.ts` | Channel kind + author resolution |
| `cleanup-channel.ts` | `cleanupClosedSupportChannel` on resolve / ticket close |

## Settings

`settings.ai_enabled` (boolean, default `false`) — toggled via `/ai-toggle`.

## Ingestion / env

- Script: `src/scripts/ingest-wiki.ts` → `node dist/src/scripts/ingest-wiki.js` (also in compose).
- Before chunking, `wiki-markdown.ts` strips `discord yaml` preview fences.
- Ingest skips **`src/javascript/`** (deprecated BDJS) via `wiki-ingest.ts`; each run **recreates** the Chroma collection so old BDJS chunks are removed.
- Ingest also pulls **[BDFD public API](https://wiki.botdesignerdiscord.com/resources/api.html)** `function_list` and `callback_list` (`bdfd-api.ts`) — one Chroma chunk per function/callback; merges names into `bdscript-functions.json`.
- Env: `OPENAI_API_KEY`, `CHROMA_URL`. **Re-run ingest** after ingest/rule changes.
- RAG (`rag.service.ts`): initial wiki search + **tool loop** (`search_wiki`, `check_bdscript_functions`, max 4 rounds). `json/bdscript-functions.json` is built at ingest (`bdscript-function-index.ts`) for fast function existence checks.
