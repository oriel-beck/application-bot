# Application Bot v4
Hopefully v5 will be stateless....

## Requirements
- Docker
- Docker compose

## Bot setup
1) Create a .env file.
```
BOT_TOKEN=TOKEN_HERE

DB_USER=cassandra
DB_PASS=cassandra
```

## DB setup
1) Run `docker compose up --build`.
2) Connect to the database's shell with `docker exec -it <container_id> sh`.
3) Run `cqlsh`.
4) Copy the configuration from `scylla-init/scylla-init.sql` and paste into the shell, hit enter.
5) Either restart the bot's container stop the compose and restart it.

## Startup
To start, run in the main directory `docker compose up --build` and wait for the bot to connect.