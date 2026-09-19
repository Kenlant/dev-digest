/**
 * GET /repos/:id/pulls — the list's Findings column previews the LATEST
 * review's findings (grouped by severity client-side). A Drizzle
 * IN-query + JS grouping concern worth its own test: only the newest
 * review's findings must surface, and a PR with no review at all gets `[]`.
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

async function insertReview(
  db: PgFixture['handle']['db'],
  workspaceId: string,
  prId: string,
  createdAt: Date,
) {
  const [review] = await db
    .insert(t.reviews)
    .values({ workspaceId, prId, kind: 'review', verdict: 'comment', score: 80, createdAt })
    .returning();
  return review!;
}

async function insertFinding(
  db: PgFixture['handle']['db'],
  reviewId: string,
  overrides: Partial<{ severity: string; title: string }> = {},
) {
  await db.insert(t.findings).values({
    reviewId,
    file: 'src/config.ts',
    startLine: 11,
    endLine: 11,
    severity: overrides.severity ?? 'CRITICAL',
    category: 'security',
    title: overrides.title ?? 'Hardcoded secret',
    rationale: 'A secret is committed.',
    confidence: 0.9,
  });
}

d('GET /repos/:id/pulls — Findings column previews (Testcontainers pg)', () => {
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

  it('previews only the latest review\'s findings, and [] for a never-reviewed PR', async () => {
    const gh = new MockGitHubClient({ pulls: [] });
    const app = await buildApp({ config: config(), db: pg.handle.db, overrides: { github: gh } });

    const [repo] = await pg.handle.db
      .insert(t.repos)
      .values({ workspaceId, owner: 'acme', name: 'findings-test', fullName: 'acme/findings-test' })
      .returning();

    const reviewed = await insertPr(pg.handle.db, workspaceId, repo!.id, 601);
    await insertPr(pg.handle.db, workspaceId, repo!.id, 602);

    const oldReview = await insertReview(pg.handle.db, workspaceId, reviewed.id, new Date('2026-01-01'));
    await insertFinding(pg.handle.db, oldReview.id, { severity: 'SUGGESTION', title: 'Stale-review finding' });

    const latestReview = await insertReview(pg.handle.db, workspaceId, reviewed.id, new Date('2026-02-01'));
    await insertFinding(pg.handle.db, latestReview.id, { severity: 'CRITICAL', title: 'Hardcoded secret' });
    await insertFinding(pg.handle.db, latestReview.id, { severity: 'WARNING', title: 'N+1 query' });

    const res = await app.inject({ method: 'GET', url: `/repos/${repo!.id}/pulls` });
    expect(res.statusCode).toBe(200);
    const body = res.json() as PrMeta[];
    const byNumber = new Map(body.map((pr) => [pr.number, pr]));

    const reviewedFindings = byNumber.get(601)!.findings!;
    expect(reviewedFindings).toHaveLength(2);
    expect(reviewedFindings.map((f) => f.title).sort()).toEqual(['Hardcoded secret', 'N+1 query']);
    expect(reviewedFindings.some((f) => f.title === 'Stale-review finding')).toBe(false);

    expect(byNumber.get(602)!.findings).toEqual([]);

    await app.close();
  });
});
