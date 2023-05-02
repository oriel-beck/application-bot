CREATE KEYSPACE IF NOT EXISTS appbot WITH REPLICATION = { 'class' : 'SimpleStrategy', 'replication_factor' : 1 };

CREATE TABLE IF NOT EXISTS appbot.applications (
    user BIGINT PRIMARY KEY,
    questions LIST<TEXT>,
    answers LIST<TEXT>,
    message BIGINT
) WITH default_time_to_live = 2400;

CREATE TABLE IF NOT EXISTS appbot.blacklists (
    user BIGINT PRIMARY KEY,
    reason TEXT,
    mod BIGINT
);

CREATE TABLE IF NOT EXISTS appbot.settings (
    guild BIGINT PRIMARY KEY,
    enabled BOOLEAN
);

CREATE TABLE IF NOT EXISTS appbot.questions (
    question TEXT,
    id UUID PRIMARY KEY
);
