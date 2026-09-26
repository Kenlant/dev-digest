#!/usr/bin/env python3
"""Mechanically check DevDigest commit-format rules against commits in a repo.

Usage: check_format.py <repo-path> [--base N]
  --base N  number of pre-existing (seeded) commits to ignore; default 3.

Emits JSON: one result per scripted assertion id.
"""
import json
import re
import subprocess
import sys

TYPES = r"feat|fix|docs|chore|ci|refactor|test|revert|perf|style|build|merge"
SUBJECT_RE = re.compile(rf"^({TYPES})(\([a-z0-9._-]+\))?: .+$")


def git(repo, *args):
    return subprocess.run(
        ["git", "-C", repo, *args], capture_output=True, text=True, check=True
    ).stdout


def main():
    repo = sys.argv[1]
    base = 3
    if "--base" in sys.argv:
        base = int(sys.argv[sys.argv.index("--base") + 1])

    shas = [s for s in git(repo, "log", "--format=%H").split() if s]
    new = shas[: max(0, len(shas) - base)]
    msgs = [git(repo, "log", "-1", "--format=%B", s).rstrip("\n") for s in new]

    res, ev = {}, {}

    def record(key, passed, evidence):
        res[key] = passed
        ev[key] = evidence

    if not msgs:
        for k in ("subject_conventional", "subject_within_80", "body_wrapped_80",
                  "fortune_present", "no_coauthor", "body_substantive",
                  "body_not_skipped"):
            record(k, False, "no new commit was created")
        print(json.dumps({"commit_count": 0, "results": res, "evidence": ev}, indent=2))
        return

    subjects = [m.splitlines()[0] for m in msgs]

    bad = [s for s in subjects if not SUBJECT_RE.match(s)]
    record("subject_conventional", not bad, "all subjects conventional"
           if not bad else f"non-conforming: {bad}")

    longs = [(s, len(s)) for s in subjects if len(s) > 80]
    record("subject_within_80", not longs,
           f"max subject length {max(len(s) for s in subjects)}"
           if not longs else f"over 80: {longs}")

    over = []
    for m in msgs:
        for ln in m.splitlines()[1:]:
            if len(ln) > 80:
                over.append((len(ln), ln[:60] + "..."))
    record("body_wrapped_80", not over,
           "all body lines <= 80" if not over else f"{len(over)} line(s) over 80: {over[:3]}")

    fort = [bool(re.search(r"^Fortune: \S.*$", m, re.M)) for m in msgs]
    fort_lines = re.findall(r"^Fortune: .*$", "\n".join(msgs), re.M)
    record("fortune_present", all(fort) and len(fort_lines) >= len(msgs),
           f"{len(fort_lines)} Fortune trailer(s) across {len(msgs)} commit(s): {fort_lines}")

    coauth = [m for m in msgs if re.search(r"^Co-Authored-By:", m, re.M)]
    record("no_coauthor", not coauth,
           "no Co-Authored-By" if not coauth else f"{len(coauth)} commit(s) still carry Co-Authored-By")

    def body_lines(m):
        rest = m.splitlines()[1:]
        return [l for l in rest if l.strip() and not l.startswith("Fortune:")]

    counts = [len(body_lines(m)) for m in msgs]
    record("body_substantive", all(c >= 3 for c in counts),
           f"body content lines per commit: {counts}")
    record("body_not_skipped", all(c >= 1 for c in counts),
           f"body content lines per commit: {counts}")

    print(json.dumps({
        "commit_count": len(msgs),
        "subjects": subjects,
        "results": res,
        "evidence": ev,
    }, indent=2))


if __name__ == "__main__":
    main()
