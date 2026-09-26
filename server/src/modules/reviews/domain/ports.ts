/**
 * Ports the reviews domain declares for itself — Dependency Inversion in the one
 * direction that matters: the interface is written in the domain's terms, and
 * infrastructure (`repository.ts` over Drizzle) implements it. The service
 * depends on THIS, not on `ReviewRepository`.
 *
 * Contrast with the repository method it replaces for this use case:
 * `activeRunsForPull()` returns `{ run_id, agent_id, agent_name, ran_at }` —
 * the snake_case HTTP DTO, complete with two fields the rule has no use for.
 * That is the transport shape leaking all the way into the innermost ring.
 */
import type { InFlightRun } from './in-flight-runs.js';

export interface InFlightRunReader {
  /**
   * Runs currently in flight for one pull request, workspace-scoped.
   * Empty array when nothing is running — never null.
   */
  inFlightRunsFor(workspaceId: string, pullId: string): Promise<InFlightRun[]>;
}
