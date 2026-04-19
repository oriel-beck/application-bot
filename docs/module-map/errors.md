# Module: `errors`

**Path:** `src/modules/errors/`  
**Manager:** none

## Listeners

| File | Purpose |
|------|---------|
| `listeners/command-error.ts` | Log/handle command errors. |
| `listeners/command-denied.ts` | Command denied (preconditions). |
| `listeners/interaction-handler-error.ts` | Interaction handler failures. |
| `listeners/ready.ts` | Startup hook for error module. |

Cross-cutting diagnostics; keeps user-facing behavior consistent when pieces fail.
