# Small labeled evaluation

Run `npm run evaluate` against the pinned [12-record snapshot](../data/permits.snapshot.json). Labels identify exact passages in permit descriptions. The script fails if a labeled passage is absent from the source.

| Check | Result | Interpretation |
| --- | ---: | --- |
| Showcase unit claims | 10 / 10 matched; 0 unsupported | Includes the repeated trade description, parent total, separate building claims, and one-added versus two-resulting conversion. |
| Additional cohort unit claims | 4 / 4 matched; 0 unsupported | Includes two-unit resulting use, 11-to-8 description, and revoked three-unit use. |
| Showcase relationships | 7 / 7 matched | These are seeded proposals for the two showcase cases, not an independent relationship model benchmark. |
| Additional cohort housing-event abstentions | 3 / 3 correct | None of these permit descriptions establishes a countable addition or completed loss event. |

The deterministic extraction patterns were refined after inspecting all 12 records. This is a small, implementation-inspected fixture check and **not** a held-out accuracy estimate. It does not evaluate the live LLM path: no API key was configured during this run. No time savings, citywide accuracy, or occupancy coverage is claimed. Every extracted claim still requires source inspection and a reviewer decision before it can support a ledger entry.
