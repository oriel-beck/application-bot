# Module: `report`

**Path:** `src/modules/report/`  
**Manager:** none (uses DB/utilities directly from handlers/commands)

## Commands

| File                 | Purpose                               |
| -------------------- | ------------------------------------- |
| `commands/report.ts` | Report slash + context menu variants. |

## Interaction handlers

| File                                     | Purpose                |
| ---------------------------------------- | ---------------------- |
| `interaction-handlers/report-modal.ts`   | Submit report content. |
| `interaction-handlers/resolve-button.ts` | Staff resolve.         |
| `interaction-handlers/delete-button.ts`  | Remove report message. |

## Shared command-utils

- `src/lib/command-utils/report/report.util.ts`

## Custom IDs (`ReportCustomIDs` in `src/lib/constants/custom-ids.ts`)

- Buttons: `rpt:btn:resolve`, `rpt:btn:delete`.
- Modal: `rpt:mdl:{reportedUserId}:{messageSnowflakeOrNone}` (built in `generateReportModal`; `none` when no message context).
