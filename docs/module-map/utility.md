# Module: `utility`

**Path:** `src/modules/utility/`  
**Manager:** `managers/tip-manager.ts` → `container.tips`

## Commands

| File               | Purpose       |
| ------------------ | ------------- |
| `commands/tip.ts`  | Tips feature. |
| `commands/wiki.ts` | Wiki command. |

## Listeners

| File                 | Purpose                                                      |
| -------------------- | ------------------------------------------------------------ |
| `listeners/ready.ts` | On `ClientReady`, calls `container.tips.refreshTips()` once. |

## Shared command-utils

- `src/lib/command-utils/sticky-message/resend.ts` if used by ready/tip flows.
