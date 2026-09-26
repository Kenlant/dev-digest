/**
 * Domain — the innermost ring. Nothing here may import Drizzle, Fastify, Zod,
 * `@devdigest/shared` DTOs, `db/*`, `adapters/*` or `platform/*`; the
 * `domain-is-pure` rule in `.dependency-cruiser.cjs` enforces that. This is the
 * first `domain/` folder in the codebase, so it is also the first time that rule
 * matches any file at all.
 *
 * It owns ONE business rule: may another review run start on this pull request?
 * That rule used to have no home — the server simply created a second
 * `agent_runs` row and billed a second LLM call, and the only thing standing
 * between a double-click and double spend was the disabled state of a button in
 * the browser.
 */

/**
 * A run that is in flight right now, in the domain's own vocabulary — not the
 * repository's row shape and not the wire DTO (`{ run_id, agent_name, ran_at }`).
 * `agentId` is nullable because `agent_runs.agent_id` is `ON DELETE set null`:
 * a run whose agent was deleted mid-flight is still in flight.
 */
export interface InFlightRun {
  readonly runId: string;
  readonly agentId: string | null;
}

/**
 * Which agents a caller wants to run. `{ kind: 'all' }` is the "run every
 * enabled agent" request; `{ kind: 'agents', ids }` is an explicit set. Modelled
 * as a value object rather than passing `string[] | undefined` around, so the
 * rule below can't be called with a meaningless combination.
 *
 * Deliberately NOT called `RunRequest`: that name is already taken by the HTTP
 * body schema in `@devdigest/shared`, and keeping the two distinguishable is the
 * whole point of having a domain vocabulary.
 */
export type RunScope =
  | { readonly kind: 'all' }
  | { readonly kind: 'agents'; readonly ids: readonly string[] };

/** One agent already running, and the run that blocks it. */
export interface RunConflict {
  readonly agentId: string | null;
  readonly runId: string;
}

/**
 * The set of runs in flight for ONE pull request.
 *
 * Several in-flight runs on one PR are NORMAL: `all: true` deliberately starts
 * one run per enabled agent, in parallel, each with its own runId. So the rule
 * is not "one run per PR" — it is "one run per agent per PR".
 */
export class InFlightRuns {
  private constructor(private readonly runs: readonly InFlightRun[]) {}

  static of(runs: readonly InFlightRun[]): InFlightRuns {
    return new InFlightRuns([...runs]);
  }

  static none(): InFlightRuns {
    return new InFlightRuns([]);
  }

  get isEmpty(): boolean {
    return this.runs.length === 0;
  }

  get runIds(): readonly string[] {
    return this.runs.map((r) => r.runId);
  }

  /**
   * The runs that would be duplicated by `scope`.
   *
   * `all` conflicts with ANY in-flight run: it re-runs every enabled agent, so
   * whatever is running now is necessarily one of them. An explicit agent list
   * conflicts only on the agents actually named — asking for agent B while
   * agent A runs is a legitimate parallel review, not a double-click.
   */
  conflictsWith(scope: RunScope): readonly RunConflict[] {
    const relevant =
      scope.kind === 'all'
        ? this.runs
        : this.runs.filter((r) => r.agentId !== null && scope.ids.includes(r.agentId));
    return relevant.map((r) => ({ agentId: r.agentId, runId: r.runId }));
  }

  /** Whether starting `scope` now would duplicate work already in flight. */
  blocks(scope: RunScope): boolean {
    return this.conflictsWith(scope).length > 0;
  }
}
