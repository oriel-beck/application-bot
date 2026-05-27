# bdfd-ai

RAG-powered AI assistant for support forum threads, international support threads, and ticket channels.

**Off by default** until an owner runs `/ai-toggle`.

## Trigger

1. **`/ai`** — slash command with a `message` option; works in any guild channel, replies **ephemerally**, ignores `ai_enabled` (`processAiRequest` with `ignoreAiEnabled: true`).
2. **Reply to a bot message** — support/intl threads and tickets only; requires `ai_enabled` (`listeners/message-create.ts`).

Both paths share `processAiRequest` in `src/lib/bdfd-ai/process-request.ts`.

## Conversation memory

Turns are stored in PostgreSQL (`ai_conversation_turns`): alternating **user** / **assistant** rows per channel. Each new question loads prior turns (up to 20) so follow-ups stay in context. Owner `/ai-limit` action **Clear AI conversation** wipes a channel’s history.

**Auto-cleanup** (`cleanup-channel.ts`): when a support post is resolved (Resolve button or `/forum solve`) or a ticket channel is deleted, AI conversation + Redis usage/intro keys are cleared; transcript rows are deleted too (tickets: transcript only if the closing DM was sent successfully).

## Pieces

| Path | Role |
|------|------|
| `commands/ai.ts` | User-facing `/ai` command (any channel, ephemeral, ignores toggle) |
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
| `rag.service.ts` | Chroma + OpenAI (`container.rag`) |
| `channel-utils.ts` | Channel kind + author resolution |
| `cleanup-channel.ts` | `cleanupClosedSupportChannel` on resolve / ticket close |

## Settings

`settings.ai_enabled` (boolean, default `false`) — toggled via `/ai-toggle`.

## Ingestion / env

- Script: `src/scripts/ingest-wiki.ts` → `node dist/src/scripts/ingest-wiki.js` (also in compose).
- Before chunking, `src/lib/bdfd-ai/wiki-markdown.ts` strips wiki `discord yaml` preview fences (mdbook UI mocks); only plain ``` BDFD blocks are kept for RAG.
- Env: `OPENAI_API_KEY`, `CHROMA_URL`. **Re-run ingest after changing normalization** so Chroma chunks refresh.
- RAG prompt (`rag.service.ts`) includes static primer `src/lib/bdfd-ai/bdfd-basics.ts` (command fields, `$message`, no `{args}`-style placeholders) plus wiki chunks; instructs not to guess off-framework syntax.
