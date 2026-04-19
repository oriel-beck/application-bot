# Module: `errors`

**Path:** `src/modules/errors/`  
**Manager:** none

## Shared utilities

| File | Purpose |
|------|---------|
| `safe-error-string.ts` | `safeErrorString()` for logging (imported by error listeners; not a Sapphire piece). |

## Listeners

| File | Purpose |
|------|---------|
| `listeners/command-error.ts` | Log/handle command errors. |
| `listeners/command-denied.ts` | Command denied (preconditions). |
| `listeners/interaction-handler-error.ts` | Interaction handler failures. |
| `listeners/ready.ts` | Startup hook for error module. |

Cross-cutting diagnostics; keeps user-facing behavior consistent when pieces fail.
