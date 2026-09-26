---
name: git-commit
description: >
  Write and run commits in the DevDigest house style — a Conventional Commits
  subject capped at 80 characters, an 80-column body that opens with the
  problem rather than the change, states what the change deliberately does NOT
  do, backs every claim with a number, and closes with a Fortune footer. Use
  this whenever the user asks to commit, says "write a commit message",
  "save this", "check this in", "/commit", or whenever you are about to run
  `git commit` for any reason at all — including a one-line typo fix, where
  the temptation to skip the body is strongest and the convention slips most
  often. Also use it when reviewing or rewording an existing commit message.
---

# DevDigest commit style

Nothing enforces this convention — no commitlint, no hook, no CONTRIBUTING
file. It survives only because each commit is written to match the ones before
it. That makes the history itself the spec, and it means a single lazy commit
degrades the standard for everyone reading `git log` later.

The subject line is the easy part and most people get it right. The body is
what makes this repo's history unusually useful, so that is where to spend the
effort.

## Workflow

**1. Read the change before you name it.**

```bash
git status --short
git diff --staged
git diff            # unstaged, if nothing is staged yet
```

You cannot write a problem-first body from a filename list. Read the actual
hunks — the body has to explain what the code did *before*, and that
information only exists in the diff.

**2. Check the branch.** If you are on `main`, stop and ask the user before
committing. `main` is the course starter branch and is meant to ship unsolved;
a commit landing there directly has caused a full revert in this repo's history
before. Offer to branch instead.

**3. Decide the commit's boundary.** One commit = one logical change. If the
diff clearly holds two unrelated changes, say so and ask whether to split
rather than silently bundling them. The exception the history already
establishes: a bug you tripped over *while building the feature* belongs in the
same commit, called out in its own body paragraph — it is part of the story of
that work.

**4. Stage deliberately.** If the user already staged something, respect that
selection and commit exactly it. If nothing is staged, stage the files that
belong to the change you are describing — never `git add -A`, which sweeps up
scratch files, local config, and half-finished work the user did not mean to
ship.

**5. Commit via a file, not `-m`.** Multi-paragraph messages full of backticks,
quotes, and em-dashes do not survive shell quoting. Write the message out, then
point git at it:

```bash
cat > "$SCRATCH/commit-msg.txt" <<'EOF'
feat(reviews): subject goes here
...
EOF
git commit -F "$SCRATCH/commit-msg.txt"
```

**6. Show the result** with `git log -1 --stat` so the user can see what landed.

## The subject line

```
type(scope): description
```

Hard ceiling of **80 characters** for the whole line. This is a real ceiling,
not a target — several commits in the history sit exactly on 80 and none go
over. If it does not fit, cut adjectives before you cut information.

**Types**, in rough order of how often this repo uses them: `feat`, `docs`,
`chore`, `fix`, `ci`, `refactor`, `test`, `revert`.

**Scopes** are usually a server module (`reviews`, `agents`, `repos`, `pulls`,
`settings`, `polling`, `repo-intel`, `workspace`) or a cross-cutting area
(`db`, `dev`, `skills`, `insights`, `claude`, `server`, `client`, `e2e`,
`reviewer`). Omit the scope only when the change genuinely spans everything.

Lowercase after the colon. No trailing period. Describe the change, not the
activity — `add`, `thread`, `repair`, `drop`, `surface`, not "changes to" or
"updates for". When one commit covers two visible things, join them with `+`
or `—` rather than inventing a vague umbrella term:

```
feat(reviews): per-run severity filter + PR list Findings column
fix(db): repair the migration journal and declare the missing fflate dep
ci(server): drop the Windows typecheck matrix — Linux-only, platform-agnostic
```

## The body

Wrap at **80 columns**. Prose paragraphs carry the reasoning; bullets or
numbered sections carry the change surface. A body of nothing but bullets
loses the *why*, which is the part that cannot be recovered from the diff.

Four moves define this style. Each one exists because of a specific way a
future reader gets stuck.

### Open with the problem, not the change

The reader arriving from `git bisect` or `git blame` needs the prior state of
the code before your change makes any sense.

> reviewer-core already computed a real per-run USD cost
> (ReviewOutcome.costUsd, via OpenRouter-reported $ or a PriceBook estimate)
> but run-executor.ts dropped it before persistence. Thread it through
> instead:

"Thread it through instead" is only meaningful after "dropped it before
persistence". Lead with the state of the world; the change then explains
itself.

### State the negative space

Say what the change deliberately does *not* do. Without this, a reader hits a
gap later and cannot tell whether it is an intentional boundary or a bug worth
filing.

> No new LLM calls — this is pure plumbing of an already-computed value. A
> PR/run with no cost-tracked data renders "—", never a fake "$0.00"; no
> backfill of historical rows.

That one paragraph pre-empts three separate bug reports.

### Give incidental fixes their own root-cause paragraph

If you fixed something the subject line does not mention, the body is the only
place it is discoverable — `git log --grep` will never find it otherwise.
Explain the mechanism, not just the symptom:

> Also fixes an unrelated but real bug surfaced while manually testing this
> feature: a review run could hang 10-20+ minutes with zero log output,
> because the review LLM call never set maxTokens. Reasoning models spend part
> of the output budget on internal "reasoning" tokens before the JSON content;
> left uncapped, that generation is unbounded and the existing 90s SDK timeout
> never fires since the request is genuinely still generating, not stalled.

### Verify with numbers

"Fixed the hang" is unfalsifiable. A number lets a future reader detect a
regression by comparison.

> Verified against the exact PR/model that was stuck: 10m46s+ (had to be
> cancelled) -> a consistent 60s post-fix, using 4443 of the 8000-token budget.

> Verified: `pnpm install --frozen-lockfile` clean, typecheck clean, and the
> full suite green — 158 tests across 25 files, including the integration lane
> that runs every migration against a fresh testcontainer.

Use the numbers you actually observed. If you did not run the suite, do not
write that it is green — a fabricated verification line is worse than none,
because the next person will trust it.

### Multi-part changes

When a commit repairs several distinct things, number them and give each its
own root cause and resolution. See the `fix(db)` example below.

## The Fortune footer

Close every commit with a single-line `Fortune:` trailer — a dry, observational
joke about *this* change.

```
Fortune: the cost was there the whole time, just quietly falling on the floor.
```

```
Fortune: 158 tests agreed the journal was fiction. The journal disagreed.
```

Keep it a valid git trailer (`Fortune: ` then the line) so `git interpret-trailers`
and `git log --grep` keep working. One line, inside 80 columns.

Two things keep the joke from doing damage. It must never state anything untrue
about the code — a reader skimming the body should not be able to mistake the
quip for a fact, so keep it observational rather than descriptive. And it never
targets a person, including the author of the code being fixed; the history is
permanent and public to the team. Aim dry rather than punchline-forced; if
nothing lands, a flat observation about the change is better than a stretch.

This trailer replaces the `Co-Authored-By:` attribution line.

## Worked example

A multi-part fix, showing numbered sections, root causes, and numeric
verification:

```
fix(db): repair the migration journal and declare the missing fflate dep

Two CI failures introduced by 641b637, which copied the whole migrations
directory over upstream's instead of merging with it.

1. The journal rewrote history instead of appending. Entry 10 was replaced
   with `0010_polite_sasquatch` — a file that exists on no branch — and
   upstream's `0011_nasty_pretty_boy` was dropped entirely, so every
   fresh-database lane crashed with "No file …0010_polite_sasquatch.sql
   found" while already-migrated databases kept passing.

   Repaired by restoring upstream's entries and meta/0011_snapshot.json,
   renumbering this branch's migrations 0011-0015 to 0012-0016 after them,
   and relinking the first renumbered snapshot's prevId. Journal and files
   now agree: 17 entries, 17 files, tags in order.

2. `fflate` is imported by src/modules/skills/service.ts but appeared in
   neither package.json nor the lockfile. It passed locally only because a
   stray copy sat in node_modules; a clean `pnpm install --frozen-lockfile`
   surfaced it as TS2307.

Verified: `pnpm install --frozen-lockfile` clean, typecheck clean, and the
full suite green — 158 tests across 25 files.

Fortune: the lockfile knew. The lockfile always knows.
```

## Small commits still get a body

The convention weakens fastest on trivial changes, because a body feels like
overkill. It usually is not — the reason a one-line change was necessary is
exactly the thing the diff cannot show. Two or three sentences is a complete
body; it does not need sections.

A genuine exception: a pure mechanical change where the subject is already the
whole truth (a dependency bump with no behavior change, a formatting-only pass).
There, subject plus `Fortune:` is honest and padding it would add noise.

## Avoid

- Subjects over 80 characters, or bodies wrapped wider than 80.
- Bodies that restate the diff file by file. The diff is already in the commit.
- "Updated X", "changes to Y", "various fixes" — activity, not change.
- Claims of verification you did not run.
- `git add -A` when the user has staged a deliberate subset.
- Committing to `main` without asking.
