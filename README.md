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
        "international_support": "1021393945613303868",
        "wiki": "",
        "tips": "",
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
        "resolved": "1021435466093965334",
        "turkish": "1021394645541978112",
        "russian": "1021394681671721010",
        "french": "1021396389055451146",
        "spanish": "1021396603732496506",
        "portuguese": "1021396952006541434",
        "arabic": "1021423497743958117",
        "german": "1021423600068218880",
        "dutch": "1021423686399561818",
        "hindi": "1021425375093477487",
        "polish": "1021435402600583228",
        "italian": "1021556632632692826",
        "czech": "1026857149688729600",
        "greek": "1035934918984880279",
        "hungarian": "1038808977942790265",
        "other": "1079791338695954563"
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