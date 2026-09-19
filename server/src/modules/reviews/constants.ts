/**
 * Review module constants.
 */

/**
 * Studio review strategy. 'single-pass' = send the WHOLE diff in ONE LLM call.
 * We deliberately do NOT use 'auto'/map-reduce by default: map-reduce makes one
 * call PER FILE, which is slow and fragile (any single file's transient 5xx
 * fails the entire run) and unnecessary — the whole diff already fits the
 * model's context.
 */
export const REVIEW_STRATEGY = 'single-pass' as const;

/**
 * Output-token cap for the review LLM call. Left unset, a reasoning model
 * (e.g. OpenRouter's deepseek-v4-flash) can spend an unbounded number of
 * tokens "thinking" before emitting the structured JSON — observed taking
 * 10+ minutes on a real PR diff with zero intermediate log output, since the
 * whole thing happens inside one awaited LLM call. This bounds worst-case
 * latency/cost; if a review genuinely needs more than this to list its
 * findings, hitting the cap fails schema validation fast (triggering the
 * existing reprompt retry) instead of hanging indefinitely.
 */
export const REVIEW_MAX_OUTPUT_TOKENS = 8000;

/** Hard per-attempt LLM call timeout for a review (ms). */
export const REVIEW_TIMEOUT_MS = 90_000;
