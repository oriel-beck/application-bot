# Module: `forums`

**Path:** `src/modules/forums/`  
**Manager:** none

## Commands

| File | Purpose |
|------|---------|
| `commands/forum.ts` | Forum-related staff commands. |

## Listeners

| File | Purpose |
|------|---------|
| `listeners/post-create.ts` | Welcome embed on new posts in `channels.support` (tag buttons + AI invoke hint) and `channels.international_support` (Resolve only, locale from language tags + AI hint). |

## Interaction handlers

| File | Purpose |
|------|---------|
| `interaction-handlers/resolve.ts` | Resolve forum thread/tag flow; clears AI conversation + transcript for the thread, with guardrails for missing `Manage Threads` / Discord missing-access errors in international support. |
| `interaction-handlers/toggle-tag.ts` | Toggle configured support tags. |

## Preconditions

- `ForumOnly.ts`, `ForumOwnerOnly.ts`

## Utilities

- `util.ts` — support forum embed + topic tag buttons (`forum:tag:{tagId}`, `forum:support:{resolvedTagId}`).
- `international-util.ts` / `international-support.i18n.ts` — international forum: translated generic embed, Resolve button only; locale from `international_support_tags` language flags (default English). Copy lives in `json/international-support.json` (loaded at startup via `@lib/international-support-register.js`).
