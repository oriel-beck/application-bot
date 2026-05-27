# Module: `transcripts`

**Path:** `src/modules/transcripts/`  
**Manager:** `managers/transcriptManager.ts` → transcript persistence (see `augments.d.ts`)

## Commands

| File | Purpose |
|------|---------|
| `commands/transcript.ts` | Generate/fetch transcripts. |

## Listeners

| File | Purpose |
|------|---------|
| `listeners/messageCreate.ts` | Record new messages. |
| `listeners/messageUpdate.ts` | Record edits. |
| `listeners/messageDelete.ts` | Handle deletions. |
| `listeners/channelDelete.ts` | DM transcript on ticket delete; removes DB transcript + AI state via `cleanupClosedSupportChannel` when DM succeeds (AI state always cleared). |

## Schema

Transcript/message tables in `src/schema.ts` (aligned with manager). `messages` includes `"createdAt"` (see migration `0003_messages_created_at.sql`).
