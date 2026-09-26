import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
  doublePrecision,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { workspaces } from './core';
import { agents } from './agents';
import { pullRequests } from './pulls';

// ============================================================ Observability

export const agentRuns = pgTable(
  'agent_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'set null' }),
    prId: uuid('pr_id').references(() => pullRequests.id, { onDelete: 'set null' }),
    ranAt: timestamp('ran_at', { withTimezone: true }).defaultNow().notNull(),
    provider: text('provider'),
    model: text('model'),
    durationMs: integer('duration_ms'),
    tokensIn: integer('tokens_in'),
    tokensOut: integer('tokens_out'),
    /**
     * Lifecycle status. Nullable for historical rows; every status the code
     * writes is one of the four in the CHECK below, and three separate code
     * paths compare it to an exact string literal (`cancelRunIfRunning`,
     * `reapStaleRunningRuns`, the PR-list cost SUM's `status = 'done'`), so a
     * typo'd value would fail silently rather than loudly.
     */
    status: text('status'),
    /** Failure reason when status='failed' (LLM/API error, timeout, quota, …). */
    error: text('error'),
    source: text('source', { enum: ['local', 'ci'] }).notNull().default('local'),
    findingsCount: integer('findings_count'),
    grounding: text('grounding'),
    /** Review score (0-100) for this run; null on failed/cancelled runs. */
    score: integer('score'),
    /** Findings that tripped the agent's gate (severity ≥ ciFailOn). */
    blockers: integer('blockers'),
    /** USD cost of this run (reviewer-core's ReviewOutcome.costUsd: real
     *  OpenRouter-reported $ when available, else a PriceBook estimate). Null
     *  for pre-feature rows and any run where cost couldn't be determined. */
    costUsd: doublePrecision('cost_usd'),
  },
  (t) => ({
    // listRunsForPull(): WHERE workspace_id = $1 AND pr_id = $2
    //                    ORDER BY ran_at DESC — filter and sort in one index.
    wsPrRanAtIdx: index('agent_runs_ws_pr_ran_at_idx').on(t.workspaceId, t.prId, t.ranAt.desc()),
    // activeRunsForPull() (polled every 4s while a run is live) and the PR
    // list's SUM(cost_usd) WHERE status = 'done'.
    prStatusIdx: index('agent_runs_pr_status_idx').on(t.prId, t.status),
    statusChk: check(
      'agent_runs_status_chk',
      sql`${t.status} is null or ${t.status} in ('running', 'done', 'failed', 'cancelled')`,
    ),
  }),
);

/** Whole trace of one run as a SINGLE jsonb document. */
export const runTraces = pgTable('run_traces', {
  runId: uuid('run_id')
    .primaryKey()
    .references(() => agentRuns.id, { onDelete: 'cascade' }),
  trace: jsonb('trace').notNull(),
});

export const multiAgentRuns = pgTable('multi_agent_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  prId: uuid('pr_id')
    .notNull()
    .references(() => pullRequests.id, { onDelete: 'cascade' }),
  ranAt: timestamp('ran_at', { withTimezone: true }).defaultNow().notNull(),
});
