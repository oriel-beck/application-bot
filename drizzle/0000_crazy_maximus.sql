DO $$ BEGIN
 CREATE TYPE "public"."state" AS ENUM('pending', 'denied', 'accepted', 'deleted', 'active');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "applications" (
	"user" bigint PRIMARY KEY NOT NULL,
	"questions" json[],
	"answers" json[],
	"message" bigint,
	"expiry" timestamp,
	"state" "state"
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "blacklist" (
	"user" bigint PRIMARY KEY NOT NULL,
	"reason" varchar(500),
	"mod" bigint
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "questions" (
	"id" UUID NOT NULL,
	"question" varchar(500)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "settings" (
	"guild" bigint PRIMARY KEY NOT NULL,
	"enabled" boolean
);
