ALTER TABLE "transcripts" RENAME TO "transcript";--> statement-breakpoint
ALTER TABLE "transcript" DROP CONSTRAINT "transcripts_channel_messages_channel_fk";
--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "message" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "message" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "transcript" ADD PRIMARY KEY ("channel");--> statement-breakpoint
ALTER TABLE "transcript" DROP COLUMN IF EXISTS "id";