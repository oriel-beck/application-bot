# Application Bot v4
Hopefully v5 will be stateless....

## Requirements
- Docker
- Docker compose

## Bot setup
1) Create a .env file, all values are required.
```env
BOT_TOKEN=TOKEN_HERE
OWNER=USER_ID

DB_USER=cassandra
DB_PASS=cassandra
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
        "tips": ""
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
    }
}
```

## Startup
To start, run in the main directory `docker compose up --build` and wait for the bot to connect.

## Todo
- [x] Apply command
    - [x] DM Embed
    - [x] DM Buttons
    - [x] DM Select

- [ ] Application command
    - [x] Reset
    - [x] Togggle
    - [x] Delete
    - [x] Deny
    - [x] Accept
    - [x] Show
    - [ ] List
        - [x] List embed
        - [x] List select
        - [ ] List buttons (over 125 apps)
    
- [x] Blacklist command
    - [x] Add
    - [x] Remove
    - [x] Reason
    - [x] Show

- [ ] Question command
    - [ ] Add
    - [ ] Remove
    - [ ] Edit
    - [ ] List
        - [ ] List embed
        - [ ] List select
        - [ ] List buttons (over 125 questions)

- [x] Report command
    - [x] User command
    - [x] Message command
    - [x] Slash command

- [x] About command
- [x] Eval command
- [x] Application embed (pending, accept, deny)