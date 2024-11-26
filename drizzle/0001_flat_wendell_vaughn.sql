DO $$ BEGIN
 CREATE TYPE "public"."state" AS ENUM('pending', 'denied', 'accepted', 'deleted', 'active');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"user" bigint NOT NULL,
	"message" varchar(2000),
	"channel" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transcripts" (
	"id" serial PRIMARY KEY NOT NULL,
	"author" bigint NOT NULL,
	"channel" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "expiry" timestamp;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_channel_messages_channel_fk" FOREIGN KEY ("channel") REFERENCES "public"."messages"("channel") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
