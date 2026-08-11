# Module: `misc`

**Path:** `src/modules/misc/`  
**Manager:** `managers/setting.manager.ts` → `container.settings` (guild toggles, etc.)

## Commands

| File | Purpose |
|------|---------|
| `commands/about.ts` | `/about` bot info. |

## Shared command-utils

- `src/lib/command-utils/about/about.utils.ts` — `/about` embed; exports `PRIVACY_POLICY_URL` / `TERMS_OF_SERVICE_URL` (GitHub Pages legal HTML).

Settings are used by applications (e.g. `ApplicationsEnabled` / toggle in `application.ts`).
