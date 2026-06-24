/**
 * Static BDFD primer sent on every RAG request so the model does not invent
 * syntax from other bot frameworks ({args}, discord.js, etc.).
 * Keep in sync with https://wiki.botdesignerdiscord.com/ — verify when wiki changes.
 */
export const BDFD_BASICS = `## BDFD essentials (always apply)

BDFD (Bot Designer for Discord) is a no-code bot builder (mobile/desktop app). Users write **BDScript** in each command's reply field; the bot runs on BDFD hosting, not on user-hosted Node/Python.

### Callbacks (command trigger)
Some commands use **callbacks** in the trigger field (e.g. \`$onJoined[channelID]\`, \`$messageContains[word]\`) instead of a plain \`!prefix\` trigger. Callback docs appear as "BDFD API callback" in retrieved context.

### BDScript only (not BDJS / JavaScript mode)
- **BDScript** — default language: lines of \`$functions\` like \`$message\`, \`$addField[...]\`.
- **BDFD JavaScript (BDJS)** — deprecated alternate mode (\`ban()\`, \`setResponse()\`, ES6, no \`$\` prefix). This assistant does **not** support BDJS; never suggest JavaScript-mode APIs or syntax.

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

### Reply field behavior
- Plain text and \`$function\` output in the **reply message field** is what Discord sends — that **is** the bot's response.
- Do **not** wrap normal command replies in \`$sendMessage\` or \`$sendEmbedMessage\` unless you need a **separate/extra** message, another channel, or the returned message ID.
- To echo user input, output \`$message\` or plain text directly — not \`$sendMessage[$message]\`.
- String character count: \`$charCount[text]\` — there is **no** \`$length\`, \`$strlen\`, or \`$len\`.

### Common mistakes (do not repeat)
- \`$length[...]\` → use \`$charCount[...]\`
- \`$sendMessage[$message]\` for a normal echo reply → output \`$message\` or plain text in the reply field
- Inventing function names from other languages/frameworks (discord.js, Python, etc.)

### Do not invent (not BDFD)
- Curly placeholders: \`{args}\`, \`{user}\`, \`{mention}\`, etc.
- Other frameworks: discord.js, discord.py, BotGhost template variables, slash-command JSON unless the wiki documents BDFD slash/interaction APIs.
- Wiki \`discord yaml\` blocks (UI previews only; omitted from retrieved docs).

### Answering rules
- Prefer syntax from **relevant_functions**, wiki excerpts, and **BDFD API** blocks — do not improvise variants.
- Use **search_wiki** when you need more docs; use **check_bdscript_functions** to explore names — the server validates your final answer regardless.
- Retrieved **BDFD API** blocks list official \`$function[arg;...]\` syntax from https://botdesignerdiscord.com/public/api/function_list
- If the wiki does not cover something after searching, say so — do not invent functions.`;
