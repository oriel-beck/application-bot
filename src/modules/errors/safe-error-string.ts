/**
 * Best-effort string for logs; never throws.
 * For `Error` instances: name, message, and stack (truncated to `maxLen` total).
 */
export function safeErrorString(err: unknown, maxLen = 800): string {
    try {
        if (err instanceof Error) {
            let name = "Error";
            try {
                name = String(err.name ?? "Error");
            } catch {
                /* keep default */
            }
            let message = "";
            try {
                message = String(err.message ?? "");
            } catch {
                /* keep empty */
            }
            let stack = "";
            try {
                stack = String(err.stack ?? "");
            } catch {
                /* keep empty */
            }

            const withStack =
                stack.length > 0 && stack !== `${name}: ${message}`
                    ? `${name}: ${message}\n${stack}`
                    : `${name}: ${message}`;
            return withStack.length > maxLen ? withStack.slice(0, maxLen) : withStack;
        }

        if (typeof err === "string") {
            return err.length > maxLen ? err.slice(0, maxLen) : err;
        }

        try {
            const s = String(err);
            return s.length > maxLen ? s.slice(0, maxLen) : s;
        } catch {
            return "[unserializable error]";
        }
    } catch {
        return "[unserializable error]";
    }
}
