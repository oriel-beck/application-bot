# Application Bot v4
Hopefully v5 will be stateless....

## Requirements
- Docker
- Docker compose

## Setup
1) Create a .env file
```
BOT_TOKEN=TOKEN_HERE

DB_USER=cassandra
DB_PASS=cassandra
```

## Startup
To start, run in the main directory `docker compose up --build` and wait for the bot to connect