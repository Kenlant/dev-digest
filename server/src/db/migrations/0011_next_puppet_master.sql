-- Hot-path indexes + integrity constraints for the review read paths.
--
-- Before this migration, db/schema/reviews.ts and db/schema/runs.ts declared
-- ZERO indexes between them, while every read of a PR's reviews joins
-- reviews.run_id -> agent_runs.id and findings.review_id -> reviews.id. Postgres
-- does not index a foreign key automatically, and reviews.run_id was not even a
-- foreign key.
--
-- NOTE on the first statement: reviews.run_id is about to gain a real FK, so any
-- row pointing at an agent_run that no longer exists would abort the ALTER.
-- deleteAgentRun() has always deleted the review before the run, so orphans
-- should not exist — but a run deleted straight from psql (a documented
-- debugging move, see server/INSIGHTS.md) would leave one. Null them out first:
-- run_id is nullable by design, and a review whose run is gone is exactly the
-- NULL case.
UPDATE "reviews" SET "run_id" = NULL
WHERE "run_id" IS NOT NULL
  AND "run_id" NOT IN (SELECT "id" FROM "agent_runs");--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_run_id_agent_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."agent_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "findings_review_idx" ON "findings" USING btree ("review_id");--> statement-breakpoint
CREATE INDEX "reviews_pr_created_idx" ON "reviews" USING btree ("pr_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "reviews_run_idx" ON "reviews" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "agent_runs_ws_pr_ran_at_idx" ON "agent_runs" USING btree ("workspace_id","pr_id","ran_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "agent_runs_pr_status_idx" ON "agent_runs" USING btree ("pr_id","status");--> statement-breakpoint
-- The two CHECKs are deliberately VALIDATING (not NOT VALID): they assert what
-- the application code already guarantees, so a row that violates one means real
-- corruption and is worth failing loudly on.
ALTER TABLE "findings" ADD CONSTRAINT "findings_severity_chk" CHECK ("findings"."severity" in ('CRITICAL', 'WARNING', 'SUGGESTION'));--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_status_chk" CHECK ("agent_runs"."status" is null or "agent_runs"."status" in ('running', 'done', 'failed', 'cancelled'));
