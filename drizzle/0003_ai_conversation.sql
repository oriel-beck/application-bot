CREATE TYPE "public"."ai_turn_role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TABLE "ai_conversation_turns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel" bigint NOT NULL,
	"role" "ai_turn_role" NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "ai_enabled" boolean DEFAULT false NOT NULL;