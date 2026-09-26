import { describe, it, expect } from 'vitest';
import type { Finding, Review, UnifiedDiff } from '@devdigest/shared';
import { reduceReviews, sliceDiff } from '../src/index.js';
import { scoreFromFindings } from '../src/review/reduce.js';

/**
 * The map-reduce strategy (`agents.strategy = 'map-reduce' | 'auto'`, a reachable
 * option in the agent editor) had ZERO test coverage: neither this package's
 * suite nor server/test referenced reduceReviews, sliceDiff or
 * scoreFromFindings. These tests pin the two contracts that matter most there —
 * the deterministic score, and "worst verdict wins" when partials disagree.
 *
 * scoreFromFindings is imported from its module rather than the barrel: it is
 * intentionally NOT part of the public surface (index.ts exports only
 * reduceReviews and sliceDiff), and pinning it is still worth it because the
 * penalty table is a documented user-visible contract.
 */

function finding(severity: Finding['severity'], file = 'src/x.ts'): Finding {
  return {
    id: `f-${severity}-${file}`,
    severity,
    category: 'security',
    title: `${severity} finding`,
    file,
    start_line: 1,
    end_line: 1,
    rationale: 'because',
  } as Finding;
}

function review(over: Partial<Review> = {}): Review {
  return { verdict: 'approve', score: 100, summary: '', findings: [], ...over } as Review;
}

describe('scoreFromFindings — deterministic score, not the model’s self-report', () => {
  // The exact numbers documented on SEVERITY_PENALTY. They are user-visible (the
  // score renders on the PR), so they are a contract, not an implementation detail.
  it.each([
    ['no findings', [] as Finding[], 100],
    ['one suggestion', [finding('SUGGESTION')], 97],
    ['one warning', [finding('WARNING')], 88],
    ['one critical', [finding('CRITICAL')], 65],
  ])('%s → %i', (_label, findings, expected) => {
    expect(scoreFromFindings(findings)).toBe(expected);
  });

  it('accumulates penalties across severities', () => {
    // 100 - 35 - 12 - 3
    expect(scoreFromFindings([finding('CRITICAL'), finding('WARNING'), finding('SUGGESTION')])).toBe(50);
  });

  it('clamps at 0 instead of going negative', () => {
    // 3 criticals = 105 penalty, which would otherwise render as -5.
    const findings = [finding('CRITICAL', 'a.ts'), finding('CRITICAL', 'b.ts'), finding('CRITICAL', 'c.ts')];
    expect(scoreFromFindings(findings)).toBe(0);
  });

  it('ignores a severity it does not know rather than producing NaN', () => {
    const rogue = { ...finding('WARNING'), severity: 'NITPICK' } as unknown as Finding;
    expect(scoreFromFindings([rogue])).toBe(100);
  });
});

describe('reduceReviews — merging one partial per mapped file', () => {
  it('returns the single partial untouched (identity shortcut)', () => {
    const only = review({ verdict: 'comment', score: 42, summary: 'one', findings: [finding('WARNING')] });
    expect(reduceReviews([only])).toBe(only);
  });

  it('concatenates findings from every partial, in order', () => {
    const merged = reduceReviews([
      review({ findings: [finding('WARNING', 'a.ts')] }),
      review({ findings: [finding('CRITICAL', 'b.ts'), finding('SUGGESTION', 'b.ts')] }),
    ]);
    expect(merged.findings.map((f) => f.file)).toEqual(['a.ts', 'b.ts', 'b.ts']);
  });

  it('takes the WORST verdict, regardless of partial order', () => {
    const partials = [review({ verdict: 'approve' }), review({ verdict: 'request_changes' }), review({ verdict: 'comment' })];
    expect(reduceReviews(partials).verdict).toBe('request_changes');
    expect(reduceReviews([...partials].reverse()).verdict).toBe('request_changes');
  });

  it('prefers comment over approve', () => {
    expect(reduceReviews([review({ verdict: 'approve' }), review({ verdict: 'comment' })]).verdict).toBe('comment');
  });

  it('averages the partial scores and rounds', () => {
    // (100 + 88 + 65) / 3 = 84.33…
    const merged = reduceReviews([review({ score: 100 }), review({ score: 88 }), review({ score: 65 })]);
    expect(merged.score).toBe(84);
  });

  it('joins summaries with a space and drops empty ones', () => {
    const merged = reduceReviews([
      review({ summary: 'First file.' }),
      review({ summary: '' }),
      review({ summary: 'Third file.' }),
    ]);
    expect(merged.summary).toBe('First file. Third file.');
  });

  it('reduces an empty set to a clean approve rather than NaN', () => {
    // Guards the `partials.length ? mean : 0` branch — a map phase where every
    // chunk failed must not produce score: NaN.
    const merged = reduceReviews([]);
    expect(merged).toEqual({ verdict: 'approve', score: 0, summary: '', findings: [] });
  });
});

describe('sliceDiff — one file’s slice of a multi-file diff', () => {
  const raw = [
    'diff --git a/src/a.ts b/src/a.ts',
    '--- a/src/a.ts',
    '+++ b/src/a.ts',
    '@@ -1 +1 @@',
    '-const a = 1;',
    '+const a = 2;',
    'diff --git a/src/b.ts b/src/b.ts',
    '--- a/src/b.ts',
    '+++ b/src/b.ts',
    '@@ -1 +1 @@',
    '-const b = 1;',
    '+const b = 2;',
  ].join('\n');

  const diff: UnifiedDiff = {
    raw,
    files: [
      { path: 'src/a.ts', additions: 1, deletions: 1, hunks: [] },
      { path: 'src/b.ts', additions: 1, deletions: 1, hunks: [] },
      { path: 'src/hunks-only.ts', additions: 1, deletions: 0, hunks: [] },
    ],
  };

  it('captures the requested file’s block and stops at the next file header', () => {
    const slice = sliceDiff(diff, 'src/a.ts');
    expect(slice).toContain('diff --git a/src/a.ts b/src/a.ts');
    expect(slice).toContain('+const a = 2;');
    expect(slice).not.toContain('src/b.ts');
    expect(slice).not.toContain('+const b = 2;');
  });

  it('captures a later file without leaking the earlier one', () => {
    const slice = sliceDiff(diff, 'src/b.ts');
    expect(slice).toContain('+const b = 2;');
    expect(slice).not.toContain('+const a = 2;');
  });

  it('synthesizes a header stub for a file present in files[] but not in raw', () => {
    // The map phase iterates diff.files, so a path can be requested that the raw
    // text does not contain; the engine must not hand the model the WHOLE diff.
    expect(sliceDiff(diff, 'src/hunks-only.ts')).toBe(
      'diff --git a/src/hunks-only.ts b/src/hunks-only.ts\n--- a/src/hunks-only.ts\n+++ b/src/hunks-only.ts',
    );
  });

  it('falls back to the full diff for a path it knows nothing about', () => {
    expect(sliceDiff(diff, 'src/does-not-exist.ts')).toBe(raw);
  });
});
