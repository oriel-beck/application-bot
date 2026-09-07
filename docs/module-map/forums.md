# Module: `forums`

**Path:** `src/modules/forums/`  
**Manager:** none

## Config

- `channels.support`, `channels.international_support`, `channels.bug_reports`
- `support_tags`, `international_support_tags`, `bug_report_tags`

## Commands

| File                | Purpose                                                                                                                                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `commands/forum.ts` | `/forum remove` in any forum post. `/forum solve` closes the post using the parent forum’s resolved tag: support, international support (i18n copy + AI cleanup), or bug reports (no AI cleanup). Other forums are rejected. |

## Listeners

| File                       | Purpose                                                                                                                                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `listeners/post-create.ts` | Welcome embed on new posts in `channels.support` (tag buttons + AI invoke hint), `channels.international_support` (Resolve only, locale from language tags + AI hint), and `channels.bug_reports` (topic-tag instructions + close buttons). |

## Interaction handlers

| File                                 | Purpose                                                                                                                                                                                   |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `interaction-handlers/resolve.ts`    | Resolve forum thread/tag flow; clears AI conversation + transcript for the thread, with guardrails for missing `Manage Threads` / Discord missing-access errors in international support. |
| `interaction-handlers/bug-close.ts`  | Bug-report Resolved / Not a bug buttons (`forum:bug:{tagId}`); lock, archive, and DM the author. Staff, trial support, or post author. No AI cleanup.                                     |
| `interaction-handlers/toggle-tag.ts` | Toggle configured support tags.                                                                                                                                                           |

## Preconditions

- `ForumOnly.ts`, `ForumOwnerOnly.ts`

## Utilities

- `util.ts` — support forum embed + topic tag buttons (`forum:tag:{tagId}`, `forum:support:{resolvedTagId}`).
- `international-util.ts` / `international-support.i18n.ts` — international forum: translated generic embed, Resolve button only; locale from `international_support_tags` language flags (default English). Copy lives in `json/international-support.json` (loaded at startup via `@lib/international-support-register.js`).
- `bug-report-util.ts` — bug-report embed from applied topic tags (`Website`, `App`, `BDL`, `BDFD Wiki`, `Flowcharts`; warn if none or more than one). Always asks to describe the problem and send videos/photos. App also asks for phone model, OS version, and app version, with how-tos (iOS Settings → General → About; Android Settings → About phone; app version via Settings → info icon). Buttons: Resolved (green) and Not a bug (red) via `forum:bug:{tagId}`.
