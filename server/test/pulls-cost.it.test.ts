/**
 * GET /repos/:id/pulls — the list's "Cost" column is a SUM of cost_usd across
 * successful (status='done') agent_runs for a PR (cumulative spend), unlike
 * the latest-only "score". This is a Drizzle sum()-over-Postgres integration
 * concern worth its own test: a stringified numeric coming back from the
 * driver must not silently become NaN, "no cost-tracked runs" must render as
 * null (never 0), and a failed/cancelled run's cost must not be counted.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startPg, dockerAvailable, type PgFixture } from './helpers/pg.js';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/platform/config.js';
import { seed } from '../src/db/seed.js';
import { MockGitHubClient } from '../src/adapters/mocks.js';
import * as t from '../src/db/schema.js';
import type { PrMeta } from '@devdigest/shared';

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

async function insertRun(
  db: PgFixture['handle']['db'],
  workspaceId: string,
  prId: string,
  costUsd: number | null,
  status: 'done' | 'failed' | 'cancelled' = 'done',
) {
  await db.insert(t.agentRuns).values({
    workspaceId,
    agentId: null,
    prId,
    provider: 'openai',
    model: 'gpt-4.1',
    status,
    costUsd,
  });
}

d('GET /repos/:id/pulls — cumulative cost column (Testcontainers pg)', () => {
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

  it('sums cost_usd across successful runs only, and never fakes 0 for a PR with none', async () => {
    const gh = new MockGitHubClient({ pulls: [] }); // no GitHub sync — DB rows are the source of truth here
    const app = await buildApp({ config: config(), db: pg.handle.db, overrides: { github: gh } });

    const [repo] = await pg.handle.db
      .insert(t.repos)
      .values({ workspaceId, owner: 'acme', name: 'cost-test', fullName: 'acme/cost-test' })
      .returning();

    const withRuns = await insertPr(pg.handle.db, workspaceId, repo!.id, 501);
    await insertPr(pg.handle.db, workspaceId, repo!.id, 502);
    const withNullCostRun = await insertPr(pg.handle.db, workspaceId, repo!.id, 503);
    const withOnlyFailedRun = await insertPr(pg.handle.db, workspaceId, repo!.id, 504);

    await insertRun(pg.handle.db, workspaceId, withRuns.id, 0.001);
    await insertRun(pg.handle.db, workspaceId, withRuns.id, 0.0005);
    // A failed run may still carry a partial cost — it must not count toward
    // the PR's cumulative spend, which tracks successful runs only.
    await insertRun(pg.handle.db, workspaceId, withRuns.id, 5, 'failed');
    // A run with unknown cost shouldn't poison the "no data" case for a PR
    // that otherwise has none at all — it's a distinct scenario, tested here.
    await insertRun(pg.handle.db, workspaceId, withNullCostRun.id, null);
    // A PR whose only run failed must render as no cost, not that run's cost.
    await insertRun(pg.handle.db, workspaceId, withOnlyFailedRun.id, 3, 'failed');

    const res = await app.inject({ method: 'GET', url: `/repos/${repo!.id}/pulls` });
    expect(res.statusCode).toBe(200);
    const body = res.json() as PrMeta[];

    const byNumber = new Map(body.map((pr) => [pr.number, pr]));
    expect(byNumber.get(501)!.total_cost_usd).toBeCloseTo(0.0015, 6);
    expect(byNumber.get(502)!.total_cost_usd).toBeNull();
    expect(byNumber.get(503)!.total_cost_usd).toBeNull();
    expect(byNumber.get(504)!.total_cost_usd).toBeNull();

    await app.close();
  });
});
