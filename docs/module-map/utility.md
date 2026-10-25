# Module: `utility`

**Path:** `src/modules/utility/`  
**Manager:** `managers/tip-manager.ts` → `container.tips`

## Commands

| File               | Purpose                                                                                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `commands/tip.ts`  | `/tip` shows an indexed tip. **Index tip** (message context menu, staff, tips channel) stores that message’s text in Redis.                                     |
| `commands/wiki.ts` | `/wiki` reads a wiki-channel message when Discord still returns its text. **Wiki as text** (message context menu) reads the targeted message, including embeds. |

## Listeners

| File                 | Purpose                                                                                                                            |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `listeners/ready.ts` | On `ClientReady`, calls `container.tips.refreshTips()` once (loads Redis, then any tip messages whose text Discord still returns). |

## Shared command-utils

- `src/lib/command-utils/sticky-message/resend.ts` if used by ready/tip flows.
