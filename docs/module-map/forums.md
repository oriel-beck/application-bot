# Module: `forums`

**Path:** `src/modules/forums/`  
**Manager:** none

## Config

- `channels.support`, `channels.international_support`, `channels.bug_reports`
- `support_tags`, `international_support_tags`, `bug_report_tags`

## Commands

| File                | Purpose                                                                                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `commands/forum.ts` | `/forum remove` in any forum post. `/forum solve` applies the parent forum’s resolved tag (support, international support, or bug reports). Close/embed/DM run from the thread-update close flow. Other forums are rejected. |

## Listeners

| File                       | Purpose                                                                                                                                                                                                                                                                                                                                 |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `listeners/post-create.ts` | Welcome embed on new posts in `channels.support` (tag buttons + AI invoke hint), `channels.international_support` (Resolve only, locale from language tags + AI hint), and `channels.bug_reports` (topic-tag instructions + close buttons). Stores help-message id + applied tags in Redis. |
| `listeners/post-update.ts` | `ThreadUpdate`: when tags change, rewrite the help embed from current tags (support, international support, bug reports). If **resolved** or **not a bug** is newly applied, run the close flow (strip help buttons, send close embed, lock, archive, **DM the post author**). Support/intl also clear AI conversation + transcript. |

## Interaction handlers

| File                                 | Purpose                                                                                                                                                          |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `interaction-handlers/resolve.ts`    | Resolve button (`forum:support:{tagId}`) applies the resolved tag only (support + international). Close/DM via `applyForumCloseFlow`. Staff, trial support, or post author. |
| `interaction-handlers/bug-close.ts`  | Bug-report Resolved / Not a bug buttons (`forum:bug:{tagId}`) apply that tag only. Close embed in the thread, lock/archive, and DM via `applyForumCloseFlow`. Staff, trial support, or post author. |
| `interaction-handlers/toggle-tag.ts` | Toggle configured support tags only; help embed is updated by `post-update.ts`.                                                                                  |

## Preconditions

- `ForumOnly.ts`, `ForumOwnerOnly.ts`

## Utilities

- `post-util.ts` — forum kind, Redis help-message/tag snapshot, help-embed sync, close flow (lock/archive/edit/DM). Author DMs use `users.fetch(ownerId)` so they still send when `ThreadMember.user` is uncached.
- `util.ts` — support forum embed + topic tag buttons (`forum:tag:{tagId}`, `forum:support:{resolvedTagId}`). Resolved embed/DM copy.
- `international-util.ts` / `international-support.i18n.ts` — international forum: translated generic embed, Resolve button only; locale from `international_support_tags` language flags (default English). Copy lives in `json/international-support.json` (loaded at startup via `@lib/international-support-register.js`).
- `bug-report-util.ts` — bug-report embed from applied topic tags (`Website`, `App`, `BDL`, `BDFD Wiki`, `Flowcharts`; warn if none or more than one). Always asks to describe the problem and send videos/photos. App also asks for phone model, OS version, and app version, with how-tos (iOS Settings → General → About; Android Settings → About phone; app version via Settings → info icon). Buttons: Resolved (green) and Not a bug (red) via `forum:bug:{tagId}`. Resolved / not-a-bug embed + DM copy.
