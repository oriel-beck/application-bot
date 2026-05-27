/**
 * Static BDFD primer sent on every RAG request so the model does not invent
 * syntax from other bot frameworks ({args}, discord.js, etc.).
 * Keep in sync with https://wiki.botdesignerdiscord.com/ — verify when wiki changes.
 */
export const BDFD_BASICS = `## BDFD essentials (always apply)

BDFD (Bot Designer for Discord) is a no-code bot builder (mobile/desktop app). Users write **BDScript** in each command's reply field; the bot runs on BDFD hosting, not on user-hosted Node/Python.

### Command structure (BDFD app)
Each command has three parts:
1. **Command name** — optional label for organizing commands in the app; does not affect behavior.
2. **Command trigger** — what the user types, e.g. \`!say\` or \`!help\` (usually prefix + name, no trailing spaces). Case-sensitive unless \`$ignoreTriggerCase\` is used (premium).
3. **Command code / reply message** — BDScript executed when the trigger matches.

There is no separate "YAML command definition". Do not output structures like \`command:\`, \`trigger:\`, \`code: |\`.

### BDScript syntax
- One **function per line** (typical style): \`$functionName[arg1;arg2]\`
- Arguments go inside **square brackets**, separated by **semicolons**.
- Function names start with \`$\` (e.g. \`$nomention\`, \`$message\`, \`$addField[...]\`).
- Use \`$nomention\` to stop the bot from pinging the command author.

### User input after the trigger
- \`$message\` — full message text **after** the trigger (e.g. \`!say hello\` → \`hello\`).
- For splitting into words/args, use wiki functions such as \`$textSplit\` / \`$splitText\` — do not invent placeholders.

### Do not invent (not BDFD)
- Curly placeholders: \`{args}\`, \`{user}\`, \`{mention}\`, etc.
- Other frameworks: discord.js, discord.py, BotGhost template variables, slash-command JSON unless the wiki documents BDFD slash/interaction APIs.
- Wiki \`discord yaml\` blocks (UI previews only; omitted from retrieved docs).

Prefer retrieved wiki excerpts for function-specific syntax. If the wiki does not cover something, say so instead of guessing.`;
