DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_channel_transcript_channel_fk" FOREIGN KEY ("channel") REFERENCES "public"."transcript"("channel") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
