# bdfd-ai

RAG-powered AI assistant for support forum threads, international support threads, and ticket channels.

**Off by default** until an owner runs `/ai-toggle`.

## Trigger

1. **`/ai`** — slash command with a `message` option; restricted to configured bot command channels (`channels.bot_commands_1` / `channels.bot_commands_2`) for regular users. In support/intl forum posts and ticket channels, only the post/ticket author may use it (staff + support-in-training bypass both restrictions). Uses `ignoreAiEnabled` + `skipChannelTracking`: no `ai_enabled` gate, **no** per-channel usage limit, **no** conversation memory (each invoke is standalone).
2. **Reply to a bot message** — support/intl threads and tickets only; requires `ai_enabled` (`listeners/message-create.ts`). Counts toward channel limit and persists turns.

Both paths share `processAiRequest` in `src/lib/bdfd-ai/process-request.ts`.

## Conversation memory

Reply-to-bot only. Turns are stored in PostgreSQL (`ai_conversation_turns`): alternating **user** / **assistant** rows per channel. Each new question loads prior turns (up to 20) so follow-ups stay in context. Owner `/ai-limit` action **Clear AI conversation** wipes a channel’s history. **`/ai` does not read or write this table.**

**Auto-cleanup** (`cleanup-channel.ts`): AI conversation + Redis usage/intro keys (and transcript rows when applicable) are cleared when:
- a support/intl post is resolved (Resolve button or `/forum solve`)
- a support/intl thread is archived, locked, or deleted (`listeners/thread-update.ts`, `listeners/thread-delete.ts`)
- a ticket channel is deleted (`transcripts` `channelDelete` — transcript rows only if the closing DM was sent)
- a channel has had no AI/transcript activity for 7 days (`listeners/ready-sweep.ts` daily, or owner `/ai-sweep`)

## Pieces

| Path | Role |
|------|------|
| `commands/ai.ts` | User-facing `/ai` command (channel/author/role gated, public reply, ignores toggle) |
| `commands/ai-toggle.ts` | Owner `/ai-toggle` — enable/disable guild AI |
| `commands/ai-limit.ts` | Owner `/ai-limit` — limits, usage, clear conversation |
| `commands/ai-sweep.ts` | Owner `/ai-sweep` — manually run the 7-day inactive channel cleanup |
| `listeners/message-create.ts` | Reply-to-bot flow |
| `listeners/ticket-intro.ts` | One-time ticket intro (only when AI enabled) |
| `listeners/thread-update.ts` | Cleanup when support/intl thread is archived or locked |
| `listeners/thread-delete.ts` | Cleanup when support/intl thread is deleted |
| `listeners/ready-sweep.ts` | Daily sweep of channels inactive for 7 days |
| `managers/ai-rate.manager.ts` | Per-channel usage limit, thinking lock |
| `managers/ai-conversation.manager.ts` | Persisted turn history (`container.aiConversation`) |
| `preconditions/BdfdAiEnabled.ts` | Unused by `/ai`; reserved for future gated commands |

## Shared lib (`src/lib/bdfd-ai/`)

| File | Role |
|------|------|
| `process-request.ts` | Gates, thinking UI, RAG call, save turns |
| `response-utils.ts` | Embeds (footer disclaimer on successful replies); over 4096 chars attach `bdfd-ai-response.txt` |
| `rag.service.ts` | Chroma + OpenAI (`container.rag`); parallel wiki + API retrieval (functions vs callbacks split), post-validation, auto-repair |
| `api-function-search.ts` | Chroma query filtered to `source: bdfd-api`; returns hits with `kind` (`function` / `callback`) |
| `bdscript-validation.ts` | Extract/validate `$function` names; flag callbacks mixed into reply-code fences; deterministically escape placeholder `]` in `$function` args; alias hints for name/callback repair pass |
| `bdscript-function-index.ts` | Name index with `kind: function \| callback`; `ensureFunctionIndex()` API fallback when JSON empty |
| `bdfd-basics.ts` | Always-on BDFD primer (callbacks = trigger only, not reply code) |
| `bdfd-api.ts` | Public API `function_list` / `callback_list` → Chroma chunks + index registration |
| `discord-ingest.ts` | Optional Discord channel history ingest (guides/FAQ channels) |
| `channel-utils.ts` | Channel kind + author resolution |
| `cleanup-channel.ts` | `cleanupClosedSupportChannel` + inactive sweep |

## Settings

`settings.ai_enabled` (boolean, default `false`) — toggled via `/ai-toggle`.

## Ingestion / env

- Script: `src/scripts/ingest-wiki.ts` → `node dist/src/scripts/ingest-wiki.js` (also in compose).
- Before chunking, `wiki-markdown.ts` strips `discord yaml` preview fences.
- Ingest skips **`src/javascript/`** (deprecated BDJS) via `wiki-ingest.ts`; each run **recreates** the Chroma collection so old BDJS chunks are removed.
- Ingest also pulls **[BDFD public API](https://wiki.botdesignerdiscord.com/resources/api.html)** `function_list` and `callback_list` (`bdfd-api.ts`) — one Chroma chunk per function/callback (`kind` metadata); merges names into `bdscript-functions.json` with `kind: function | callback`. Callback chunks state they belong in the **command trigger** field, not reply code. **Re-run ingest** after changing API chunk format so Chroma picks up the stronger callback wording.
- Optional Discord ingest source (`discord-ingest.ts`): set `BDFD_INGEST_CHANNEL_IDS` (comma-separated channel IDs) and token via `BDFD_INGEST_BOT_TOKEN` (falls back to `BOT_TOKEN`) to index message history from guide/FAQ channels.
- If `BDFD_INGEST_CHANNEL_IDS` is not set, ingest auto-falls back to `config.json` channel keys from `BDFD_INGEST_CHANNEL_KEYS` (default: `tips,variable_guides,limiter_guides,faq`) and uses `config.guild` as guild fallback for jump-link URLs.
- Optional: `BDFD_INGEST_GUILD_ID` (overrides `config.guild`), `BDFD_INGEST_MAX_MESSAGES_PER_CHANNEL` (default `500`).
- Env: `OPENAI_API_KEY`, `CHROMA_URL` (+ optional Discord ingest env above). **Re-run ingest** after ingest/rule changes.
- RAG (`rag.service.ts`): parallel **wiki search** (top 6) + **API search** (top 8, `source: bdfd-api`, split into `<relevant_functions>` / `<relevant_callbacks>`) before generation; **tool loop** (`search_wiki`, `check_bdscript_functions` reports function vs callback, max 4 rounds); **server-side validation** of `$function` names and callbacks misused inside reply-code fences (one silent **auto-repair** model pass), then **deterministic** escaping of placeholder `]` inside `$function` args (e.g. `[@user]` → `[@user\]` in `$argsCheck` messages) with no extra model call (`bdscript-validation.ts`). `json/bdscript-functions.json` is built at ingest; if empty at startup, `ensureFunctionIndex()` fetches BDFD public API lists.
