# Module: `applications`

**Path:** `src/modules/applications/`  
**Manager:** `managers/application.manager.ts` → `container.applications`  
**Preconditions:** `ApplicationsEnabled`, `ApplicationInProgress` (under `preconditions/`)

## Commands

| File | Purpose |
|------|---------|
| `commands/apply.ts` | Public `/apply` — starts DM application flow. |
| `commands/application.ts` | Staff `/application` subcommands: deny, accept, delete, show, list, toggle, reset. |

## Interaction handlers

| Path | Type | Purpose |
|------|------|---------|
| `interaction-handlers/apply/answer-button.ts` | Button | Answer flow in DM. |
| `interaction-handlers/apply/answer-modal.ts` | Modal | Text answers. |
| `interaction-handlers/apply/show-select.ts` | Select | Show/pick question context. |
| `interaction-handlers/apply/cancel.ts` | Button | Cancel application. |
| `interaction-handlers/apply/done.ts` | Button | Submit application. |
| `interaction-handlers/list/list-select.ts` | Select | Staff picks user from list reply (`app:list:sel:{index}` only; `parse` uses `^app:list:sel:\d+$`, so directory button IDs are not matched). |
| `interaction-handlers/list/list-dir-page-btn.ts` | Button | **Directory** pagination when a state has **>125** applications: Prev / page label / Next (`app:list:dir:{state}:{page}`; `noop` page label). |
| `interaction-handlers/decide/decide-btn.ts` | Button | Staff decision buttons on pending embed. |
| `interaction-handlers/decide/decide-modal.ts` | Modal | Accept/deny/delete reasons/details. |
| `interaction-handlers/pagination/pagination-btn.ts` | Button | **Per-application** Q/A embed paging (`app:view:page:…`; `run` parses with `customId.split(':')`, parts 3–4 = page and `userId`). |

## Custom IDs (`src/lib/constants/custom-ids.ts`)

| Flow | IDs (placeholders in `{…}`) |
|------|------------------------------|
| **Apply (DM)** | `apply:btn:cancel`, `apply:btn:done`, `apply:btn:answer:{n}`, `apply:sel:edit`, `apply:mdl:answer:{n}` |
| **Staff application embed** | Decide: `app:dec:btn:denied:{userId}`, `app:dec:btn:accepted:{userId}`, `app:dec:mdl:{type}:{userId}`; Q/A pages: `app:view:page:{page}:{userId}`, disabled indicator `app:view:indicator` |
| **Staff `/application list`** | Select rows: `app:list:sel:{index}`; directory Prev/Next: `app:list:dir:{state}:{page}` |

## Shared command-utils

- `src/lib/command-utils/application/embeds/` — application channel/DM embeds and components.
- `src/lib/command-utils/application/list/` — list embed + up to five string-select rows for ≤125 apps; for **>125**, four select rows (100 options) + one button row for directory pages. Constants in `application-list.utils.ts`.
- `src/lib/command-utils/application/modals/` — staff decision modals.
- `src/lib/command-utils/apply/` — DM apply wizard UI.

## Related schema

Applications and answers: `src/schema.ts` (see Drizzle tables used by `application.manager.ts`).
