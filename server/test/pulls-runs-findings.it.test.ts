/**
 * GET /pulls/:id/runs — the Timeline tile's severity badges + hover preview
 * need each run's OWN findings, not another run's. agent_runs has no FK to
 * reviews/findings, so listRunsForPull joins reviews.run_id -> findings on
 * read. Worth its own test: findings must attribute to the RIGHT run when a
 * PR has multiple runs, and a run with no review must not break.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startPg, dockerAvailable, type PgFixture } from './helpers/pg.js';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/platform/config.js';
import { seed } from '../src/db/seed.js';
import { MockGitHubClient } from '../src/adapters/mocks.js';
import * as t from '../src/db/schema.js';
import type { RunSummary } from '@devdigest/shared';

const hasDocker = await dockerAvailable();
const d = hasDocker ? describe : describe.skip;

const config = () => loadConfig({ ...process.env, NODE_ENV: 'test' } as NodeJS.ProcessEnv);

async function insertPr(db: PgFixture['handle']['db'], workspaceId: string, repoId: string, number: number) {
  const [pr] = await db
    .insert(t.pullRequests)
    .values({
      workspaceId,
      repoId,
      number,
      title: `PR #${number}`,
      author: 'marisa.koch',
      branch: `feat/pr-${number}`,
      base: 'main',
      headSha: 'deadbeef',
      additions: 1,
      deletions: 0,
      filesCount: 1,
      status: 'open',
    })
    .returning();
  return pr!;
}

async function insertRun(db: PgFixture['handle']['db'], workspaceId: string, prId: string) {
  const [run] = await db
    .insert(t.agentRuns)
    .values({ workspaceId, agentId: null, prId, provider: 'openai', model: 'gpt-4.1', status: 'done' })
    .returning();
  return run!;
}

async function insertReview(db: PgFixture['handle']['db'], workspaceId: string, prId: string, runId: string) {
  const [review] = await db
    .insert(t.reviews)
    .values({ workspaceId, prId, runId, kind: 'review', verdict: 'comment', score: 80 })
    .returning();
  return review!;
}

async function insertFinding(db: PgFixture['handle']['db'], reviewId: string, severity: string, title: string) {
  await db.insert(t.findings).values({
    reviewId,
    file: 'src/config.ts',
    startLine: 1,
    endLine: 1,
    severity,
    category: 'security',
    title,
    rationale: 'r',
    confidence: 0.9,
  });
}

d('GET /pulls/:id/runs — per-run findings (Testcontainers pg)', () => {
  let pg: PgFixture;
  let workspaceId: string;

  beforeAll(async () => {
    pg = await startPg();
    await seed(pg.handle.db);
    const [ws] = await pg.handle.db.select().from(t.workspaces);
    workspaceId = ws!.id;
  });
  afterAll(async () => {
    await pg?.stop();
  });

  it("attributes each run's findings to that run only, and doesn't break for a run with no review", async () => {
    const gh = new MockGitHubClient({ pulls: [] });
    const app = await buildApp({ config: config(), db: pg.handle.db, overrides: { github: gh } });

    const [repo] = await pg.handle.db
      .insert(t.repos)
      .values({ workspaceId, owner: 'acme', name: 'timeline-findings-test', fullName: 'acme/timeline-findings-test' })
      .returning();
    const pr = await insertPr(pg.handle.db, workspaceId, repo!.id, 701);

    const runA = await insertRun(pg.handle.db, workspaceId, pr.id);
    const reviewA = await insertReview(pg.handle.db, workspaceId, pr.id, runA.id);
    await insertFinding(pg.handle.db, reviewA.id, 'CRITICAL', 'Hardcoded secret');
    await insertFinding(pg.handle.db, reviewA.id, 'WARNING', 'N+1 query');

    const runB = await insertRun(pg.handle.db, workspaceId, pr.id);
    const reviewB = await insertReview(pg.handle.db, workspaceId, pr.id, runB.id);
    await insertFinding(pg.handle.db, reviewB.id, 'SUGGESTION', 'Extract magic number');

    // A still-running/no-review run must not crash the aggregation.
    const runC = await insertRun(pg.handle.db, workspaceId, pr.id);

    const res = await app.inject({ method: 'GET', url: `/pulls/${pr.id}/runs` });
    expect(res.statusCode).toBe(200);
    const body = res.json() as RunSummary[];
    const byRunId = new Map(body.map((r) => [r.run_id, r]));

    expect(byRunId.get(runA.id)!.findings!.map((f) => f.title).sort()).toEqual([
      'Hardcoded secret',
      'N+1 query',
    ]);
    expect(byRunId.get(runB.id)!.findings!.map((f) => f.title)).toEqual(['Extract magic number']);
    expect(byRunId.get(runC.id)!.findings).toBeUndefined();

    await app.close();
  });
});
