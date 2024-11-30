CREATE TYPE "public"."state" AS ENUM('pending', 'denied', 'accepted', 'deleted', 'active');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "applications" (
	"user" bigint PRIMARY KEY NOT NULL,
	"questions" text[] DEFAULT '{}' NOT NULL,
	"answers" text[] DEFAULT '{}' NOT NULL,
	"message" bigint,
	"state" "state" NOT NULL,
	"expiry" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "blacklist" (
	"user" bigint PRIMARY KEY NOT NULL,
	"reason" varchar(500),
	"mod" bigint
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "messages" (
	"id" bigint PRIMARY KEY NOT NULL,
	"user" bigint NOT NULL,
	"message" text NOT NULL,
	"channel" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "questions" (
	"id" uuid,
	"question" varchar(500)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "settings" (
	"guild" bigint PRIMARY KEY NOT NULL,
	"enabled" boolean
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transcript" (
	"author" bigint NOT NULL,
	"channel" bigint PRIMARY KEY NOT NULL
);
