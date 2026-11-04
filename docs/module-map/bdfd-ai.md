# bdfd-ai

RAG-powered AI assistant for support forum threads, international support threads, and ticket channels.

**Off by default** until an owner runs `/ai-toggle`.

## Trigger

1. **`/ai`** — slash command with a `message` option; restricted to configured bot command channels (`channels.bot_commands_1` / `channels.bot_commands_2`) for regular users. In support/intl forum posts and ticket channels, only the post/ticket author may use it (staff + support-in-training bypass both restrictions). Uses `ignoreAiEnabled` + `skipChannelTracking`: no `ai_enabled` gate, **no** per-channel usage limit, **no** conversation memory (each invoke is standalone).
2. **Mention the bot, or reply to a bot message** — support/intl threads and tickets only; requires `ai_enabled` (`listeners/message-create.ts`). Counts toward channel limit and persists turns. Discord only includes that text without the Message Content intent when the bot is mentioned, or when the user replies to a normal bot message with ping left on (not a reply to a slash-command response). If the text is missing, the bot tells the author to mention it, reply with ping on, or use `/ai`.

Both paths share `processAiRequest` in `src/lib/bdfd-ai/process-request.ts`.

## Wiki search

**`/search wiki query: [type:]`** — finds a wiki **guide** or **function** reference by title or section heading; `type` (Guides / Functions) narrows it, unset searches both. Fuzzy: partial names (`textspl`), typos (`textSplti`, `varaibles`), `$` optional, camelCase typed as words (`text split`). The option autocompletes (top 25, labelled Guide/Function; picking one encodes `page:<file>[#<section index>]` as the value). The reply is public: the best match's section text, an **On this page** list of section links, and **Other results**. Functions the official API lists but the wiki has no page for (e.g. `$addActionRow`) are searchable too: they show their API definition, marked "no wiki page yet", **with no link**. A URL is never guessed from a function name.

All links go to the **nightly** wiki (`WIKI_BASE_URL` in `wiki-ingest.ts`, `https://wiki.botdesignerdiscord.com/nightly/`). Ingest reads the repo's `dev` branch, which deploys there; the production root is built from `prod` and lags behind. Page URLs are rebuilt from the source path at runtime (`wikiPageUrl`), so they're correct even for chunks ingested with an older base. Links inside excerpts are kept only when they point at an indexed page; typo'd links in the wiki source are shown as plain text.

The page index (`WikiPageIndex`, `wiki-page-index.ts`) is built in memory at startup from every `source: wiki` and `source: bdfd-api` Chroma chunk (`loadWikiChunkRecords`). It needs Chroma, but **not** `OPENAI_API_KEY`. If the index is empty (no ingest yet), it retries at most once a minute. When the title search finds nothing, or a 3+ word query only matched weakly (a question, not a page name), an embedding search over wiki and API chunks (`RagService.semanticWikiSearch`, needs OpenAI) fills in.

**`/search ai question:`** — the same RAG pipeline as `/ai` (same channel/role gating via `ai-command-access.ts`, ignores `ai_enabled`, no channel limit or memory), plus a wiki-focused system prompt. Up to 3 **Related wiki pages** (the pages behind the retrieved wiki chunks) are appended to the answer as links.

## BDScript simulator (no AI)

**`/simulate`** (optional single-line `code` and `message` options, otherwise a modal with code + "message after the trigger") and the **Simulate BDScript** message context menu (opens the modal pre-filled) run the code through a real interpreter (`src/lib/bdscript-sim/`) and reply ephemerally with what the command would send: the text, real embeds, and disabled buttons/select menus, followed by a report embed. No OpenAI call, so it ignores `ai_enabled` and works without `OPENAI_API_KEY` (only the function index is needed). Mentions never ping (`allowedMentions: { parse: [] }`).

- **Context:** the invoking user is the author, in the current channel/server. Users mentioned in the message, or whose IDs appear in the code, are fetched (up to 10) so `$username[ID]` & co. resolve.
- **Semantics from the wiki:** `$if/$elseif/$else/$endif`, `$try/$catch/$endtry` + `$error[]`, `$stop`, `$onlyIf`, `$argsCheck` (`>3` = 3 or more), `$suppressErrors`, `$c`, text/split/math functions (decimals off unless `$enableDecimals[yes]`; `$random[min;max]` excludes max), temp and persistent variables, embeds by index, buttons/menus. Blank lines are dropped from the response, as BDFD does (so lines holding only `$var[...]`, `$if[...]` etc. leave no gap). BDFD escapes (`\;`, `\]`, `%{-SEMICOL-}%`, `%{DOL}%`, `%ESCAPED%`) are resolved.
- **Errors look like BDFD's:** ``❌ Function `$sum` at `2:9` returned an error: expected integer in position 2, got 'a'`` — located at the call's closing `]`. Argument count/empty/type checks are driven by the API schema (`arguments.ts`), including mid-list repeatable arguments (`$onlyForIDs[ID;...;Error]`). Bare calls aren't arity-checked (the API omits some bare forms).
- **Report:** side effects that weren't performed (moderation, reactions, variable writes, `$sendMessage`, `$useChannel`, …), calls not simulated, and notes (random values picked, the author mention BDFD adds without `$nomention`).
- **Never guesses:** a function with no handler, or one it can't resolve (another user, a persistent variable this run didn't set — its value lives in the bot), is _unknown_. Anything computed from an unknown value is unknown too and is left as written — or outputs nothing if it's an assignment/side effect (`STATEMENT_FUNCTIONS`); variables and `$textSplit` assigned from one stay unknown. If `$if`/`$elseif`/`$onlyIf` depends on an unknown value, the run stops with `stoppedBy: 'unsupported'` and shows the output up to there.
- Verified against every example on the wiki's function pages (276): none error falsely, and fully-simulated ones match the documented output.

## Code checker (no AI)

**`/check-code`** (optional single-line `code` option, otherwise a multi-line modal) and the **Check BDScript** message context menu run the BDScript parser over the user's code and list unknown functions (with suggestions), wrong argument counts, calls closed early by an unescaped `]` (e.g. `[@user]` inside `$argsCheck`), and unclosed calls — each with line/column. Ephemeral reply; no OpenAI call, so it ignores `ai_enabled` and works without `OPENAI_API_KEY` (only the function index is needed).

## Conversation memory

Mention and reply-to-bot only. Turns are stored in PostgreSQL (`ai_conversation_turns`): alternating **user** / **assistant** rows per channel. Each new question loads prior turns (up to 20) so follow-ups stay in context. Staff `/ai-limit` action **Clear AI conversation** or `/ai-conversations` **Delete** wipes a channel's history — the escape hatch for a wrong-but-validation-passing answer that already got saved and is anchoring later turns. **`/ai` does not read or write this table.**

**Auto-cleanup** (`cleanup-channel.ts`): AI conversation + Redis usage/intro keys are cleared when:

- a support/intl post is resolved (Resolve button, `/forum solve`, or the resolved tag applied in Discord) — also deletes transcript rows
- a support/intl thread is archived, locked, or deleted — also deletes transcript rows
- a ticket channel is deleted (`transcripts` `channelDelete` — transcript rows only if the closing DM was sent)
- a channel has had **no AI activity** for 7 days (`listeners/ready-sweep.ts` daily, or owner `/ai-sweep`) — **AI only; transcripts are kept**

## Pieces

| Path                                       | Role                                                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `commands/ai.ts`                           | User-facing `/ai` command (channel/author/role gated, public reply, ignores toggle)              |
| `commands/ai-toggle.ts`                    | Owner `/ai-toggle` — enable/disable guild AI                                                     |
| `commands/ai-limit.ts`                     | Staff `/ai-limit` — limits, usage, clear conversation                                            |
| `commands/ai-sweep.ts`                     | Owner `/ai-sweep` — clear AI state for channels inactive 7+ days (transcripts kept)              |
| `commands/ai-conversations.ts`             | Staff `/ai-conversations` — Components V2 browser (each row: usage/limit + Reset usage / Delete) |
| `commands/check-code.ts`                   | `/check-code` + **Check BDScript** context menu — parser-only lint of user code                  |
| `commands/simulate.ts`                     | `/simulate` + **Simulate BDScript** context menu — run BDScript and show its output              |
| `interaction-handlers/simulate-modal.ts`   | `/simulate` modal submit (`sim:mdl:code`)                                                        |
| `commands/search.ts`                       | `/search wiki` (fuzzy page search + autocomplete) and `/search ai` (AI answer about the wiki)    |
| `interaction-handlers/check-code-modal.ts` | `/check-code` modal submit (`chk:mdl:code`)                                                      |
| `interaction-handlers/list/*.ts`           | List pagination + reset/delete (`ai:list:*`)                                                     |
| `listeners/message-create.ts`              | Mention or reply-to-bot flow                                                                     |
| `listeners/ticket-intro.ts`                | One-time ticket intro (only when AI enabled)                                                     |
| `listeners/thread-update.ts`               | Cleanup when support/intl thread is archived or locked                                           |
| `listeners/thread-delete.ts`               | Cleanup when support/intl thread is deleted                                                      |
| `listeners/ready-sweep.ts`                 | Daily sweep of channels inactive for 7 days                                                      |
| `managers/ai-rate.manager.ts`              | Per-channel usage limit, thinking lock                                                           |
| `managers/ai-conversation.manager.ts`      | Persisted turn history (`container.aiConversation`); **`listChannels()`** for the browser        |
| `preconditions/BdfdAiEnabled.ts`           | Unused by `/ai`; reserved for future gated commands                                              |

Custom IDs: `AiConversationCustomIDs`, `CheckCodeCustomIDs`, `SimulateCustomIDs` (rendered simulated components use `sim:out:*`, always disabled) in `src/lib/constants/custom-ids.ts`.
Simulate utils: `src/lib/command-utils/bdfd-ai/simulate.utils.ts` (modal, context building, `SimResult` → embeds/components within Discord limits, fallback if Discord rejects the payload). Interpreter: `src/lib/bdscript-sim/` (`interpreter.ts` blocks/evaluation, `functions.ts` handler table, `arguments.ts` schema checks, `conditions.ts`, `calculate.ts` — a parser, never `eval`).  
Check-code utils: `src/lib/command-utils/bdfd-ai/check-code.utils.ts` (modal, code-fence extraction, result embed).
Search utils: `src/lib/command-utils/bdfd-ai/search.utils.ts` (autocomplete choices/pick round-trip, result embed).
List UI utils: `src/lib/command-utils/bdfd-ai/list/ai-conversation-list.utils.ts` (`PAGE_SIZE = 8`, First/Prev/page/Next/Last; per-row Reset usage / Delete).

## Shared lib (`src/lib/bdfd-ai/`)

| File                         | Role                                                                                                                                                                                                                                |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ai-command-access.ts`       | Shared channel/role gate for `/ai` and `/search ai`                                                                                                                                                                                 |
| `wiki-page-index.ts`         | `/search wiki` fuzzy title/heading index over wiki chunks (exact > prefix > substring > typo, camelCase-aware); `locate(document)` maps a RAG chunk back to its page; display helpers (link resolution, mdBook anchors, truncation) |
| `process-request.ts`         | Gates, thinking UI, RAG call, save turns                                                                                                                                                                                            |
| `response-utils.ts`          | Embeds (footer disclaimer on successful replies); over 4096 chars attach `bdfd-ai-response.txt`                                                                                                                                     |
| `rag.service.ts`             | Chroma + OpenAI (`container.rag`); parallel wiki + API retrieval (functions vs callbacks split), post-validation, auto-repair                                                                                                       |
| `api-function-search.ts`     | Chroma query filtered to `source: bdfd-api`; returns hits with `kind` (`function` / `callback`)                                                                                                                                     |
| `bdscript-validation.ts`     | BDScript parser (`parseBdscript`: unescaped `]` closes the innermost call, `\;` / `\]` are literal); name, arity and early-`]` checks; `lintBdscript` for `/check-code`; placeholder `]` escaping; edit-distance name suggestions   |
| `bdscript-function-index.ts` | Name index with `kind: function \| callback`; `ensureFunctionIndex()` API fallback when JSON is empty or has no `variants` (cached back to the JSON)                                                                                |
| `bdfd-basics.ts`             | Always-on BDFD primer (callbacks = trigger only, not reply code)                                                                                                                                                                    |
| `bdfd-api.ts`                | Public API `function_list` / `callback_list` → Chroma chunks + index registration                                                                                                                                                   |
| `discord-ingest.ts`          | Optional Discord channel history ingest (guides/FAQ channels)                                                                                                                                                                       |
| `channel-utils.ts`           | Channel kind + author resolution. Ticket author falls back to a user mention on the opener when that embed text is hidden.                                                                                                          |
| `cleanup-channel.ts`         | `cleanupClosedSupportChannel` + inactive sweep                                                                                                                                                                                      |

## Settings

`settings.ai_enabled` (boolean, default `false`) — toggled via `/ai-toggle`.

## Ingestion / env

- Script: `src/scripts/ingest-wiki.ts` → `node dist/src/scripts/ingest-wiki.js` (also in compose).
- Before chunking, `wiki-markdown.ts` strips `discord yaml` preview fences.
- Wiki chunk IDs are `path#heading-slug`; repeated headings in one file (e.g. CHANGELOG months) get `-1`, `-2`, … so Chroma upsert stays unique.
- Ingest reads the wiki repo's **`dev`** branch (deployed to the nightly wiki, see `WIKI_BASE_URL`) and only the pages linked from its `src/SUMMARY.md` (`parseSummaryPaths`): mdBook builds nothing else, so unlisted files would link to a 404.
- Ingest skips **`src/javascript/`** (deprecated BDJS) via `wiki-ingest.ts`; each run **recreates** the Chroma collection so old BDJS chunks are removed.
- API chunks carry a `**Wiki:**` line (and `url` metadata) only when a published wiki page exists for that name — wherever it lives (`bdscript/`, `premium/`, `callbacks/`). API-only names get `url: ''` in chunks and in `bdscript-functions.json` rather than a guessed URL.
- Ingest also pulls **[BDFD public API](https://wiki.botdesignerdiscord.com/resources/api.html)** `function_list` and `callback_list` (`bdfd-api.ts`) — one Chroma chunk per function/callback (`kind` metadata); merges names into `bdscript-functions.json` with `kind: function | callback`. Callback chunks state they belong in the **command trigger** field, not reply code. **Re-run ingest** after changing API chunk format so Chroma picks up the stronger callback wording.
- Optional Discord ingest source (`discord-ingest.ts`): set `BDFD_INGEST_CHANNEL_IDS` (comma-separated channel IDs) and token via `BDFD_INGEST_BOT_TOKEN` (falls back to `BOT_TOKEN`) to index message history from guide/FAQ channels. The bot does **not** use the Message Content intent, so Discord returns those channel histories without text, embeds, or attachments. Ingest logs a warning and skips the channel. Messages the bot itself sent can still be indexed.
- If `BDFD_INGEST_CHANNEL_IDS` is not set, ingest auto-falls back to `config.json` channel keys from `BDFD_INGEST_CHANNEL_KEYS` (default: `tips,variable_guides,limiter_guides,faq`) and uses `config.guild` as guild fallback for jump-link URLs.
- Optional: `BDFD_INGEST_GUILD_ID` (overrides `config.guild`), `BDFD_INGEST_MAX_MESSAGES_PER_CHANNEL` (default `500`).
- Env: `OPENAI_API_KEY`, `CHROMA_URL` (+ optional Discord ingest env above). **Re-run ingest** after ingest/rule changes.
- RAG (`rag.service.ts`): parallel **wiki search** (top 6) + **API search** (top 8, `source: bdfd-api`, split into `<relevant_functions>` / `<relevant_callbacks>`) before generation; **tool loop** (`search_wiki`, `check_bdscript_functions` reports function vs callback, max 4 rounds); **server-side validation** of `$function` names and callbacks misused inside reply-code fences, with up to **2 silent auto-repair** model passes (3 validation checks total). If the draft still fails validation on the 3rd check, `validateAndRepair` throws `BdscriptValidationError` (`bdscript-validation.ts`) instead of returning the flawed draft — `process-request.ts` catches it and shows a distinct "try asking again with more detail" embed (`buildValidationFailedEmbed`, `response-utils.ts`); usage count and conversation history are **not** updated for that turn (they're only written after a successful response). Before each validation check, **deterministic** escaping of placeholder `]` inside `$function` args (e.g. `[@user]` → `[@user\]` in `$argsCheck` messages) runs with no extra model call; anything still closed early by an unescaped `]` goes to the repair pass. `json/bdscript-functions.json` is built at ingest; if empty at startup — or stale, i.e. written before argument schemas (`variants`) were tracked — `ensureFunctionIndex()` fetches BDFD public API lists, merges them in, and writes the result back to that file.
