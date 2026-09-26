import { describe, it, expect } from 'vitest';
import {
  InFlightRuns,
  type InFlightRun,
  type RunScope,
} from '../src/modules/reviews/domain/in-flight-runs.js';
import { ReviewService } from '../src/modules/reviews/service.js';
import { AppError } from '../src/platform/errors.js';

/**
 * The duplicate-run rule. Hermetic: the value object is pure domain code (no DB,
 * no container), and the service-level guard is exercised through a stub port
 * rather than a real repository — which is the point of the domain declaring
 * `InFlightRunReader` in the first place.
 *
 * The invariant that matters: several in-flight runs on ONE pull request are
 * legitimate (`all: true` fans out one run per enabled agent, in parallel), so
 * the rule is "one run per agent per PR", never "one run per PR".
 */

const run = (runId: string, agentId: string | null): InFlightRun => ({ runId, agentId });
const agents = (...ids: string[]): RunScope => ({ kind: 'agents', ids });
const all: RunScope = { kind: 'all' };

describe('InFlightRuns — one run per agent per PR', () => {
  it('nothing in flight blocks nothing', () => {
    expect(InFlightRuns.none().blocks(all)).toBe(false);
    expect(InFlightRuns.none().blocks(agents('a'))).toBe(false);
    expect(InFlightRuns.none().isEmpty).toBe(true);
  });

  it('blocks the same agent', () => {
    const inFlight = InFlightRuns.of([run('r1', 'a')]);
    expect(inFlight.blocks(agents('a'))).toBe(true);
    expect(inFlight.conflictsWith(agents('a'))).toEqual([{ agentId: 'a', runId: 'r1' }]);
  });

  it('allows a DIFFERENT agent to review the same PR in parallel', () => {
    // This is the case a naive "is anything running for this PR?" check would
    // wrongly reject, breaking multi-agent review.
    const inFlight = InFlightRuns.of([run('r1', 'a')]);
    expect(inFlight.blocks(agents('b'))).toBe(false);
    expect(inFlight.conflictsWith(agents('b'))).toEqual([]);
  });

  it('blocks a mixed request on the overlapping agent only', () => {
    const inFlight = InFlightRuns.of([run('r1', 'a')]);
    expect(inFlight.conflictsWith(agents('a', 'b'))).toEqual([{ agentId: 'a', runId: 'r1' }]);
  });

  it('"all" conflicts with any in-flight run', () => {
    // `all` re-runs every enabled agent, so whatever runs now is one of them.
    expect(InFlightRuns.of([run('r1', 'a')]).blocks(all)).toBe(true);
    expect(InFlightRuns.of([run('r1', null)]).blocks(all)).toBe(true);
  });

  it('never matches an explicit agent list against a run with no agent', () => {
    // agent_runs.agent_id is ON DELETE set null: a run whose agent was deleted
    // is still in flight, but it cannot duplicate a named agent.
    const orphan = InFlightRuns.of([run('r1', null)]);
    expect(orphan.blocks(agents('a'))).toBe(false);
    expect(orphan.isEmpty).toBe(false);
  });

  it('reports every conflicting run when more than one overlaps', () => {
    const inFlight = InFlightRuns.of([run('r1', 'a'), run('r2', 'b'), run('r3', 'c')]);
    expect(inFlight.conflictsWith(agents('a', 'c'))).toEqual([
      { agentId: 'a', runId: 'r1' },
      { agentId: 'c', runId: 'r3' },
    ]);
    expect(inFlight.runIds).toEqual(['r1', 'r2', 'r3']);
  });

  it('does not alias the array it was built from', () => {
    const source = [run('r1', 'a')];
    const inFlight = InFlightRuns.of(source);
    source.push(run('r2', 'b'));
    expect(inFlight.runIds).toEqual(['r1']);
  });
});

describe('ReviewService.assertNoDuplicateRun — 409 before any run row exists', () => {
  /** Minimal stand-in for the container: only what the constructor touches. */
  function serviceWith(inFlight: InFlightRun[]): ReviewService {
    const container = { db: {}, agentsRepo: {} } as never;
    const service = new ReviewService(container);
    // Replace the port implementation, not the module — the whole reason the
    // domain declares InFlightRunReader instead of leaning on ReviewRepository.
    (service as unknown as { inFlightRuns: { inFlightRunsFor: () => Promise<InFlightRun[]> } })
      .inFlightRuns = { inFlightRunsFor: async () => inFlight };
    return service;
  }

  it('resolves silently when nothing conflicts', async () => {
    await expect(
      serviceWith([run('r1', 'a')]).assertNoDuplicateRun('ws', 'pr', agents('b')),
    ).resolves.toBeUndefined();
  });

  it('throws 409 with the conflicting run id in details', async () => {
    const service = serviceWith([run('r1', 'a')]);
    const err = await service
      .assertNoDuplicateRun('ws', 'pr', agents('a'))
      .then(() => null)
      .catch((e: unknown) => e as AppError);

    expect(err).toBeInstanceOf(AppError);
    expect(err!.statusCode).toBe(409);
    expect(err!.code).toBe('conflict');
    expect(err!.details).toEqual({ conflicts: [{ run_id: 'r1', agent_id: 'a' }] });
  });

  it('pluralises the message when several runs conflict', async () => {
    const service = serviceWith([run('r1', 'a'), run('r2', 'b')]);
    const err = await service
      .assertNoDuplicateRun('ws', 'pr', agents('a', 'b'))
      .then(() => null)
      .catch((e: unknown) => e as AppError);

    expect(err!.message).toContain('2 reviews are already running');
  });
});
