ALTER TABLE "questions" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "question" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "createdAt" timestamp;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_question_unique" UNIQUE("question");