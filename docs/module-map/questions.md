# Module: `questions`

**Path:** `src/modules/questions/`  
**Manager:** `managers/question.manager.ts` → `container.questions`

## Commands

| File | Purpose |
|------|---------|
| `commands/question.ts` | `/question` add, remove, list, edit, show. |

## Interaction handlers

| Path | Type | Purpose |
|------|------|---------|
| `interaction-handlers/delete.ts` | Button | Delete confirm path for show UI. |
| `interaction-handlers/edit.ts` | Button | Opens edit flow. |
| `interaction-handlers/edit-modal.ts` | Modal | Persists question text edit. |
| `interaction-handlers/list/list-select.ts` | Select | Staff picks a question from `/question list` string selects (`q:list:sel:{index}`). |
| `interaction-handlers/list/list-dir-page-btn.ts` | Button | **Directory** pagination when there are **>125** questions: Prev / page label / Next (`q:list:dir:{page}`; center noop `q:list:dir:noop`). |

## Custom IDs (`QuestionCustomIDs`)

- **Edit / delete buttons:** `q:btn:edit`, `q:btn:del` — runtime IDs append `:{questionId}`; handlers use the constant prefix then `slice` the remainder so UUIDs are not parsed by splitting on `:`.
- **List select menus:** `q:list:sel:{index}` — handler parse regex `^q:list:sel:\d+$`.
- **List directory buttons:** `q:list:dir:{page}` (plus `noop` token for the disabled page indicator).
- **Edit modal:** `q:mdl:edit:{id}`.

## Shared command-utils

- `src/lib/command-utils/question/list/` — list embed + string-select rows; ≤125 questions uses up to five rows; **>125** uses four rows (100 options) + one button row per page.
- `src/lib/command-utils/question/show/` — show embed + components.

## Assets

- `json/base-questions.json` — reference/seed data (see `AGENTS.md`).
