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
| `listeners/post-create.ts` | React to new forum posts (tags/workflows). |

## Interaction handlers

| File | Purpose |
|------|---------|
| `interaction-handlers/resolve.ts` | Resolve forum thread/tag flow. |
| `interaction-handlers/toggle-tag.ts` | Toggle configured support tags. |

## Preconditions

- `ForumOnly.ts`, `ForumOwnerOnly.ts`

## Utilities

- `util.ts` — forum-specific helpers; buttons use `ForumCustomIDs` from `src/lib/constants/custom-ids.ts`: `forum:tag:{tagId}` (toggle topic tags) and `forum:support:{resolvedTagId}` (resolve).
