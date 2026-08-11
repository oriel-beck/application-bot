# Application Bot v4
Hopefully v5 will be stateless...

## Requirements
- Docker
- Docker compose
- Existing Docker network `infra` on the VPS with:
  - Postgres available as `postgres:5432`
  - Redis available as `redis:6379`

## Bot setup
1) Copy `.env.example` to `.env` and fill all required values.
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
2) Create a config file named `config.json` in the main directory, all values are required.
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
    "categories": {
        "tickets": ""
    },
    "guild": "THE_INITIAL_GUILD"
}
```

## Startup
### Local (includes Postgres + Redis)
`docker compose -f docker-compose.yml up --build`

### VPS / shared infra (uses existing Postgres + Redis)
1) Ensure the shared infra stack is running on the VPS (`postgres` and `redis` reachable on network `infra`).
2) Start with:
`docker compose -f docker-compose.infra.yml up --build`

## Legal
- [Privacy Policy](docs/legal/privacy-policy.html) ([markdown](docs/legal/privacy-policy.md))
- [Terms of Service](docs/legal/terms-of-service.html) ([markdown](docs/legal/terms-of-service.md))

Discord rejects `github.com/.../blob/...` links (“URL is not allowed”). Host the HTML pages with **GitHub Pages**:

1. Push these files to the default branch.
2. Repo **Settings → Pages → Build and deployment**: Source **Deploy from a branch**, Branch **`main`** (or your default), Folder **`/docs`**.
3. Wait a minute, then use:
   - Privacy: `https://oriel-beck.github.io/application-bot/legal/privacy-policy.html`
   - Terms: `https://oriel-beck.github.io/application-bot/legal/terms-of-service.html`
   - Index: `https://oriel-beck.github.io/application-bot/legal/`

Also paste those same URLs into the app’s **General Information** Privacy Policy / Terms of Service fields if present.