# Application Bot — agent guide

This document orients AI coding agents to the **application-bot** (Discord “staff application” style bot). It complements `README.md` (human setup) with **repo layout, runtime model, and change patterns**.

## What this project is

- A **Discord bot** built on **[Sapphire Framework](https://www.sapphirejs.dev/)** (`@sapphire/framework`, decorators, `@sapphire/plugin-subcommands`).
- **discord.js v14** for the Discord API.
- **PostgreSQL** via **Drizzle ORM** (`drizzle-orm`, `pg`); migrations live under `drizzle/`.
- **Redis** (`ioredis`) for auxiliary caching/state where managers use it.
- **TypeScript** source; **SWC** compiles `src/` → `dist/` (see `package.json` `build` and `Dockerfile`).

The bot is oriented around **guild applications** (questions/answers, staff decisions), plus modules for blacklist, questions CRUD, reports, forums, transcripts, utilities, etc.

## How it starts

1. `src/index.ts` constructs `ApplicationClient` from `src/lib/app-client.ts`, sets Discord intents/partials, and passes **`enabledModules`** (whitelist of folder names under `src/modules/`).
2. Side-effect imports run **before** `login`:
   - `@lib/config/register.js` — loads `config.json` from **process cwd** into `container.config`.
   - `@sapphire/plugin-subcommands/register`
   - `@lib/db-register.js` — Postgres pool, Drizzle, **`migrate()`** from `/app/drizzle` (Docker path), seeds default guild row in `settings`, sets `container.drizzle`.
   - `@lib/redis-register.js` — `container.redis`.
3. `ApplicationClient.login()` **before** `super.login()`:
   - For each enabled module: dynamically imports every `managers/*.js` file, instantiates default export (must extend `BaseManager`), calls `init()`, registers on **`container[manager.name]`** (name must be unique and not collide with existing `container` keys).
   - Registers the module path with **`this.stores.registerPath(rootDir)`** so Sapphire loads `commands/`, `listeners/`, `interaction-handlers/`, `preconditions/` from that module tree.
4. `client.login(process.env.BOT_TOKEN)`.

**Implication for agents:** adding a new top-level feature area usually means a new folder under `src/modules/<name>/` **and** adding `<name>` to `enabledModules` in `src/index.ts`, plus any new `container` types in `src/augments.d.ts`.

## Configuration and secrets

| Source                                        | Purpose                                                                                                                                                                                                                                                     |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`.env`**                                    | `BOT_TOKEN`, `DATABASE_URL` (app + drizzle-kit), `POSTGRES_*` (Postgres container init in compose), `OWNER`, `REDIS_HOST`, etc. (see `README.md`).                                                                                                          |
| **`config.json`** (repo root, cwd at runtime) | Guild IDs for channels/roles/tags/categories and initial `guild` string. Typed in `src/lib/config/config.d.ts`. **README** example may lag the TypeScript type (e.g. `wiki`, `categories`) — trust **`config.d.ts`** as source of truth for required shape. |

Config is read asynchronously in `register.ts` and assigned to `container.config`.

## Database

- **Schema:** `src/schema.ts` — Drizzle tables/enums (applications, blacklist, settings, questions, transcript/messages, etc.).
- **Migrations:** `drizzle/*.sql` + `drizzle/meta/`; config in `drizzle.config.ts` uses `DATABASE_URL` (host `postgres` in Docker).
- **Runtime DB handle:** `container.drizzle` (declared in `db-register.ts` module augmentation).

`db-register.ts` connects via **`DATABASE_URL`** (typically `postgresql://…@postgres:5432/…` in Docker). For local Postgres, point `DATABASE_URL` at `localhost` and adjust compose or run the DB separately.

## Redis

- `container.redis` — `ioredis` client; host from `REDIS_HOST` or `localhost`.

## Path aliases and imports

- **TypeScript / SWC:** `@lib/*` resolves to `src/lib/*`. **`tsconfig.json`** uses `paths` only (no `baseUrl` — TypeScript 6); **`.swcrc`** still uses `baseUrl` + short `paths` entries — both must keep the same logical alias.
- ESM **NodeNext** resolution: source files generally import with **`.js` extensions** in import paths (e.g. `@lib/app-client.js`) even when authoring `.ts` files.

## `src/lib/` — shared infrastructure

| Area                                   | Role                                                                                                                                                                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app-client.ts`                        | Custom `SapphireClient`: loads per-module managers + `registerPath` for each enabled module.                                                                                                                                         |
| `config/`                              | Config load + `Config` types.                                                                                                                                                                                                        |
| `db-register.ts` / `redis-register.ts` | Wire ORM and Redis into `container`.                                                                                                                                                                                                 |
| `db.utils.ts`                          | SQL string helpers exposed as `genSelect` / `genInsert` / etc. on `BaseManager`; managers in this repo **use Drizzle directly** — these helpers may be unused legacy hooks.                                                          |
| `managers/base.manager.ts`             | Abstract manager: holds `drizzle`, enforces `create`/`delete`/`get`/`update`, exposes `genSelect` / `genInsert` / `genUpdate` / `genDelete`.                                                                                         |
| `command-utils/`                       | Reusable embeds/components/helpers for commands and interactions (grouped by domain: `apply/`, `application/`, `question/`, etc.).                                                                                                   |
| `constants/`                           | e.g. `custom-ids.ts` — Discord `customId` strings as **colon-separated** segments (`apply:…`, `app:…`, `q:…`, `rpt:…`); also **`ForumCustomIDs`** and **`ShareCustomIDs`** for forums / share-your-bot pieces that import this file. |
| `precondition-util.ts`, `util.ts`      | Shared helpers.                                                                                                                                                                                                                      |

## `src/modules/` — feature modules

Each module is a **Sapphire root**: expected subfolders vary by feature but commonly include:

- `commands/` — slash (or other) commands; use `@ApplyOptions`, `Command` from Sapphire.
- `listeners/` — Discord client events.
- `interaction-handlers/` — buttons, modals, selects (Sapphire interaction handlers).
- `preconditions/` — named preconditions referenced from commands (e.g. `ApplicationsEnabled`, `Blacklisted`).
- `managers/` — optional; if present, each `*.ts` compiles to `*.js` and default export is loaded by `ApplicationClient` as described above.

**Current `enabledModules` list** (from `src/index.ts`): `applications`, `blacklist`, `errors`, `misc`, `owner`, `questions`, `report`, `forums`, `utility`, `share-your-bot`, `transcripts`, `bdfd-ai`.

**Cross-cutting:** `src/modules/errors/` — central error/denied listeners.

## `src/preconditions/`

Global preconditions (e.g. `StaffOnly`, `OwnerOnly`, `ModOnly`, `RequiredRole`, `TrialSupportOnly`) live here; module-specific ones live under `src/modules/<module>/preconditions/`.

## Typings / `container`

- **`src/augments.d.ts`** — augments `@sapphire/pieces` `Container` with managers and `config`. **When adding a manager** loaded by `ApplicationClient`, **update this file** so `this.container.*` is typed.
- Some local imports in augments use `modules/...` without `@lib` — follow existing file style when editing that file.

## Build, run, and tooling

- **Install:** Yarn (see `package.json`, `.yarnrc.yml`).
- **Compile:** `yarn build` — SWC `src` → `dist` per `.swcrc`.
- **Lint / format:** `yarn lint` / `yarn lint:fix` (ESLint flat config in `eslint.config.js`); `yarn format` / `yarn format:check` (Prettier).
- **Docker:** `docker compose up --build` is the documented way to run Postgres + Redis + bot (`docker-compose.yml`, `Dockerfile`).
- **Drizzle CLI:** `drizzle-kit` in devDependencies; `drizzle.config.ts` points at `./src/schema.ts`.

## JSON assets

- `json/base-questions.json` — seed/reference question data used by the questions flow (see question manager/command usage when changing).
- `json/international-support.json` — locale strings for the international support forum (`@lib/international-support-register.js`).

## Conventions for edits (agent checklist)

1. **New module:** create `src/modules/<module>/` with Sapphire pieces + optional `managers/` default export extending `BaseManager` with a **unique** `name`; add module string to **`src/index.ts`** `enabledModules`; extend **`src/augments.d.ts`** if a manager is added.
2. **DB change:** edit **`src/schema.ts`**, generate/author migrations under **`drizzle/`**, keep **`drizzle/meta/_journal.json`** consistent with project practice.
3. **New slash command:** place under the right module’s `commands/`, use existing commands as templates (`ApplyOptions`, preconditions, `registerApplicationCommands`).
4. **Buttons/modals/selects:** prefer **constants** in `src/lib/constants/custom-ids.ts` — colon-delimited ids; reuse **`ForumCustomIDs`** / **`ShareCustomIDs`** when touching those modules (or module-local constants if a pattern truly diverges).
5. **Staff/guild assumptions:** respect **`container.config`** shape from `config.d.ts` — IDs are strings in config; code often uses `BigInt()` where Discord snowflakes are required.

## Documentation sync (do this whenever you change code)

**Treat doc updates as part of the same change**, not a follow-up. Before you finish a task that touched `src/`:

1. **`docs/module-map/<module>.md`** — If you added/removed/renamed commands, listeners, interaction handlers, managers, or materially changed flows, update that module’s map (paths, table rows, custom id prefixes). If you changed **`src/lib/`** pieces used by several modules (e.g. `command-utils/`, `constants/custom-ids.ts`), update every affected module map.
2. **`README.md`** — If setup steps, env/config shape, or other user-facing overview text should change, update it in the same PR/session.
3. **`AGENTS.md`** — Only if you changed global conventions (startup, `enabledModules`, config contract, agent checklist itself).

There is **no** separate `docs/module-plans/` tree; long “roadmap” docs were removed. Prefer short, accurate **module map** updates over duplicate planning files.

## Known gaps / TODOs

- None tracked centrally in `README.md`; use issues or your own tracker for future work.

---

_Cursor loads `.cursor/rules/*.mdc` for extra guidance; this file remains the detailed repo map._
