CREATE TYPE "public"."ai_failure_reason" AS ENUM('validation', 'error');--> statement-breakpoint
CREATE TABLE "ai_failed_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel" bigint NOT NULL,
	"user" bigint NOT NULL,
	"question" text NOT NULL,
	"reason" "ai_failure_reason" NOT NULL,
	"error" text NOT NULL,
	"attempts" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
