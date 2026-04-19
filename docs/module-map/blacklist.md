# Module: `blacklist`

**Path:** `src/modules/blacklist/`  
**Manager:** `managers/blacklist.manager.ts` → `container.blacklists` (see `src/augments.d.ts`)  
**Precondition:** `preconditions/Blacklisted.ts` (used by apply and elsewhere)

## Commands

| File | Purpose |
|------|---------|
| `commands/blacklist.ts` | Staff blacklist add/remove/reason/show (subcommands). |

## Shared command-utils

- `src/lib/command-utils/blacklist/show/` — show embed/utilities.

## Related schema

Blacklist table(s) in `src/schema.ts`.
