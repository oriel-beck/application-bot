DELETE FROM "questions" WHERE "question" IS NULL;
--> statement-breakpoint
DELETE FROM "questions" AS a
    USING "questions" AS b
WHERE a."question" = b."question"
  AND a."ctid" > b."ctid";
--> statement-breakpoint
DELETE FROM "questions" AS a
    USING "questions" AS b
WHERE a."id" IS NOT NULL
  AND b."id" IS NOT NULL
  AND a."id" = b."id"
  AND a."ctid" > b."ctid";
--> statement-breakpoint
UPDATE "questions" SET "id" = gen_random_uuid() WHERE "id" IS NULL;
--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "question" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "questions" ADD PRIMARY KEY ("id");
--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_question_unique" UNIQUE ("question");
