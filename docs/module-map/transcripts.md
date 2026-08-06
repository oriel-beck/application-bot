# Module: `transcripts`

**Path:** `src/modules/transcripts/`  
**Manager:** `managers/transcriptManager.ts` → transcript persistence (see `augments.d.ts`)

## Commands

| File | Purpose |
|------|---------|
| `commands/transcript.ts` | Subcommands: `delete`, `clear-deleted`, `get` (`.txt` export; loads messages via `get(..., true)`), **`list`** (Components V2 browser). Preconditions: `ModOnly` + `OwnerOnly`. |

## Interaction handlers

| File | Purpose |
|------|---------|
| `interaction-handlers/list/list-dir.ts` | Pagination: First / Prev / page / Next / Last (`tr:list:dir`) |
| `interaction-handlers/list/list-manage.ts` | Open actions view for a channel (`tr:list:mng`) |
| `interaction-handlers/list/list-export.ts` | Ephemeral `.txt` follow-up (`tr:list:exp`) |
| `interaction-handlers/list/list-delete.ts` | Delete transcript and refresh list (`tr:list:del`) |
| `interaction-handlers/list/list-back.ts` | Return to list (`tr:list:back`) |

Custom IDs: `TranscriptCustomIDs` in `src/lib/constants/custom-ids.ts` (`tr:list:*`).  
List UI utils: `src/lib/command-utils/transcript/list/transcript-list.utils.ts` (`PAGE_SIZE = 10`).

Manager helpers: `getAll()`, **`listWithCounts()`** (channel + author + message count).

## Listeners

| File | Purpose |
|------|---------|
| `listeners/messageCreate.ts` | Record new messages. |
| `listeners/messageUpdate.ts` | Record edits. |
| `listeners/messageDelete.ts` | Handle deletions. |
| `listeners/channelDelete.ts` | DM transcript on ticket delete; always clears AI state via `cleanupClosedSupportChannel`; deletes transcript rows only if the DM succeeded. |

## Schema

Transcript/message tables in `src/schema.ts` (aligned with manager). `messages` includes `"createdAt"` (migration `0002_aspiring_kabuki.sql`).
