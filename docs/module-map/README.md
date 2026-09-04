# Module map (index)

This folder contains one Markdown file per **enabled** Sapphire module under `src/modules/`, as registered in `src/index.ts` (`enabledModules`).

| Module         | Map file                                 |
| -------------- | ---------------------------------------- |
| applications   | [applications.md](./applications.md)     |
| blacklist      | [blacklist.md](./blacklist.md)           |
| errors         | [errors.md](./errors.md)                 |
| misc           | [misc.md](./misc.md)                     |
| owner          | [owner.md](./owner.md)                   |
| questions      | [questions.md](./questions.md)           |
| report         | [report.md](./report.md)                 |
| forums         | [forums.md](./forums.md)                 |
| utility        | [utility.md](./utility.md)               |
| share-your-bot | [share-your-bot.md](./share-your-bot.md) |
| transcripts    | [transcripts.md](./transcripts.md)       |

Shared infrastructure lives under `src/lib/` (client, DB, Redis, command-utils, constants, base managers). See `AGENTS.md` for the runtime loading model.

When you change behavior in `src/`, update the matching module file here (and `README.md` if setup or high-level docs should change). See `AGENTS.md` — **Documentation sync**.
