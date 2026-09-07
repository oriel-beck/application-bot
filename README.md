# Application Bot v4

Hopefully v5 will be stateless...

## Requirements

- Docker
- Docker compose
- Existing Docker network `infra` on the VPS with:
  - Postgres available as `postgres:5432`
  - Redis available as `redis:6379`

## Bot setup

1. Copy `.env.example` to `.env` and fill all required values.

```env
BOT_TOKEN=*****
DATABASE_URL=postgresql://appbot:*****@postgres:5432/appbot
POSTGRES_USER=appbot
POSTGRES_PASSWORD=*****
POSTGRES_DB=appbot
PGDATA=/var/lib/postgresql/data/pgdata
OWNER=YOUR_DISCORD_ID
REDIS_HOST=redis
OPENAI_API_KEY=*****
CHROMA_URL=http://chroma:8000
```

2. Create a config file named `config.json` in the main directory. Required IDs must be Discord snowflakes (digits only). Empty strings and placeholders fail startup validation.

Optional channel keys may be omitted: `variable_guides`, `limiter_guides`, `faq`, `bot_commands_1`, `bot_commands_2`. If present, they must also be snowflakes.

```json
{
  "channels": {
    "pending": "",
    "denied": "",
    "accepted": "",
    "report": "",
    "staff": "",
    "support": "",
    "international_support": "",
    "bug_reports": "",
    "tips": "",
    "variable_guides": "",
    "limiter_guides": "",
    "faq": "",
    "bot_commands_1": "",
    "bot_commands_2": "",
    "wiki": "",
    "share_your_bot": ""
  },
  "roles": {
    "mod": "",
    "trial_support": "",
    "required_role": "",
    "staff": ""
  },
  "support_tags": {
    "resolved": "",
    "complex": "",
    "question": "",
    "code_error": "",
    "wiki_error": ""
  },
  "international_support_tags": {
    "resolved": "",
    "turkish": "",
    "russian": "",
    "french": "",
    "spanish": "",
    "portuguese": "",
    "arabic": "",
    "german": "",
    "dutch": "",
    "hindi": "",
    "polish": "",
    "italian": "",
    "czech": "",
    "greek": "",
    "hungarian": "",
    "other": ""
  },
  "bug_report_tags": {
    "resolved": "",
    "website": "",
    "app": "",
    "bdl": "",
    "bdfd_wiki": "",
    "flowcharts": "",
    "not_a_bug": ""
  },
  "categories": {
    "tickets": ""
  },
  "guild": "THE_INITIAL_GUILD"
}
```

3. Keep `json/base-questions.json` on the host (Compose bind-mounts `./json` over the image copy). It must be a non-empty JSON array of question strings. `json/rand-questions.json` is optional (created at runtime); if you add it, it must be an array of `{ "id", "question" }` objects with unique ids.

`docker compose up` runs a **validate** service first. Missing or invalid `config.json`, `.env`, or question JSON aborts the stack.

## Image (GitHub Packages)

The bot image is published to GitHub Container Registry as [`ghcr.io/oriel-beck/application-bot`](https://github.com/oriel-beck/application-bot/pkgs/container/application-bot).

Pushes to `v4` / `main` and version tags (`v1.2.3`) build and push via [`.github/workflows/publish-image.yml`](.github/workflows/publish-image.yml). Tags include `latest`, the branch name, and the git SHA.

After the first publish, open the package on GitHub and set visibility to **Public** if it is still private (linked packages often inherit the repo’s visibility). Public images can be pulled without logging in.

Override the image with `APPBOT_IMAGE` if you fork the repo or pin a digest:

```env
APPBOT_IMAGE=ghcr.io/oriel-beck/application-bot:sha-abc1234
```

`config.json` is **not** baked into the image. Create it on the host before `docker compose up` (Compose bind-mounts it). A missing file can make Docker create a directory at that path.

## Startup

### Local (includes Postgres + Redis)

Pull the published image and start:

```bash
docker compose pull
docker compose up -d
```

Build from this tree instead of pulling:

```bash
docker compose up --build
```

### VPS / shared infra (uses existing Postgres + Redis)

1. Ensure the shared infra stack is running on the VPS (`postgres` and `redis` reachable on network `infra`).
2. Start with:

```bash
docker compose -f docker-compose.infra.yml pull
docker compose -f docker-compose.infra.yml up -d
```

## Lint and format

- `yarn lint` — run ESLint
- `yarn lint:fix` — run ESLint with auto-fix
- `yarn format` — format files with Prettier
- `yarn format:check` — check formatting without writing

## Legal

- [Privacy Policy](docs/legal/privacy-policy.html) ([markdown](docs/legal/privacy-policy.md))
- [Terms of Service](docs/legal/terms-of-service.html) ([markdown](docs/legal/terms-of-service.md))

Discord rejects `github.com/.../blob/...` links (“URL is not allowed”). Host the HTML pages with **GitHub Pages**:

1. Push these files to the default branch.
2. Repo **Settings → Pages → Build and deployment**: Source **Deploy from a branch**, Branch **`main`** (or your default), Folder **`/docs`**.
3. Wait a minute, then use:
   - Home: `https://oriel-beck.github.io/application-bot/`
   - Privacy: `https://oriel-beck.github.io/application-bot/legal/privacy-policy.html`
   - Terms: `https://oriel-beck.github.io/application-bot/legal/terms-of-service.html`
   - Legal index: `https://oriel-beck.github.io/application-bot/legal/`

Also paste those same URLs into the app’s **General Information** Privacy Policy / Terms of Service fields if present.
