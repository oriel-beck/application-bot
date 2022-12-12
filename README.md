# 🚧 Application bot (WIP) 🚧

This is an application bot made via the [Necord](https://necord.org/) framework for [BDFD](https://botdesignerdiscord.com/)

## Prerequisites
- [docker](https://www.docker.com/) set up on your computer

## Before you start
1) Prepare a config file named `config.yml` at `/config`.
2) Prepare the env file named `.env` in the main directory.
3) Prepare a postgres env file named `.postgres.env` in the main directory.
4) Prepare a base-questions.json file for the base questions [^1] (Optional)
5) Prepare a init-questions.json file for random questions [^2] (Options)

Examples for all files can be found in their directories.

[^1] Structure is string[]

[^2] Structure is { question: string, id: UUID, guildid: string }[]
