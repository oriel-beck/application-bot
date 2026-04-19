# Application Bot v4
Hopefully v5 will be stateless....

## Requirements
- Docker
- Docker compose

## Bot setup
1) Create a .env file, all values are required.
```env
BOT_TOKEN=*****
POSTGRES_USER=appbot
POSTGRES_PASSWORD=*****
POSTGRES_DB=appbot
PGDATA=/var/lib/postgresql/data/pgdata
OWNER=YOUR_DISCORD_ID
REDIS_HOST=redis
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
    "guild": "THE_INITIAL_GUILD"
}
```

## Startup
To start, run in the main directory `docker compose up --build` and wait for the bot to connect.