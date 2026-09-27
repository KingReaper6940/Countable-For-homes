# COUNTABLE

**Every housing count has a receipt.** Countable is a local prototype for reviewing Pittsburgh housing permit records and the evidence required to support an additions ledger. The landing page at `/` is a narrated pitch; the working review application starts at `/app`. Countable is designed to assist analysts alongside existing reporting systems. It is not a City of Pittsburgh product, a certified reporting system, or a complete citywide housing count.

## Run locally

Requirements: Node.js 20.9 or newer.

```powershell
npm install
npm run dev
```

Open [the presentation](http://localhost:3000/) or go directly to [the working app](http://localhost:3000/app). The first run seeds a local SQLite database from the committed sanitized snapshot. Browser refreshes retain review work. The database defaults to `.countable/countable.db`; set `COUNTABLE_DB_PATH` to use another local path. Run `npm run seed` to import explicitly. Run `npm run typecheck`, `npm test`, `npm run evaluate`, and `npm run build` to verify the application.

No API key is required. Without one, the interface explicitly runs in **Rules-only mode** with deterministic extraction and precomputed showcase proposals. To enable server-side model analysis, copy `.env.example` to `.env.local`, set `OPENAI_API_KEY`, and optionally set `OPENAI_MODEL`. Keys are read only on the server.

## Data and reproduction

The included [permit snapshot](data/permits.snapshot.json) contains twelve selected records from the [WPRDC PLI Permits dataset](https://data.wprdc.org/dataset/pli-permits). The [source manifest](data/source-manifest.json) stores the retrieval time, exact `datastore_search` queries, source URL, fields, and hash. It includes the specified South Side conversion and Bedford development records plus three small independent review cases selected to challenge unit-count assumptions. This is a curated cohort, not a complete project or citywide extract. The WPRDC dataset explains that Building & Development Application records need to be included alongside legacy `BUILDING` permits.

To refetch and validate the same permit IDs:

```powershell
npm run fetch:permits
npm run validate:permits
```

This refresh replaces the snapshot and can change descriptions or statuses. Review new evidence and claims after a refresh. No owner names, contractor identities, or contact fields are requested or stored.

## Review model

The queue at `/app` opens five real-data cases, including three extra unresolved review examples. The public `/methodology` page explains the counting rules and selected-cohort limits. The evidence workspace keeps source claims, proposed relationships, reviewer decisions, and potential housing events separate. Permit status and issue dates do not establish an occupancy date. The ledger lists additions only when identity, unit increment, residential scope, date, evidence, and a human decision support an event. Unknown remains unknown. A synthetic occupancy example is isolated in its own labeled sandbox and ledger; it never enters the real-data ledger. The landing page uses a second, plainly labeled invented 24-unit scenario for explanation; it is never stored as a real project.

See [counting rules](docs/COUNTING_RULES.md) for the decision policy, [labeled evaluation](docs/EVALUATION.md) for measured extraction results and limits, and [demo script](docs/DEMO.md) for a guided walkthrough. The interface offers CSV export, an evidence report, and an audit trail. Reversals create new audit entries.

## Two to three minute presenter script

Use the optional **Present** control or scroll normally. Arrow keys advance sections while Present is on; Escape exits it. Every section also remains available through ordinary scrolling.

| Time | Screen / click | Say |
| --- | --- | --- |
| 0:00–0:18 | Hero. Click the sprinkler card to change the quoted text. | “How many new homes are actually ready for people to use? City paperwork can mention the same apartments more than once. Countable helps someone check the records and save the proof behind every number—that's the receipt.” |
| 0:18–0:43 | Start the story; show the crossed-out 56, then click **Separate the facts**. | “A building permit gives permission to build; it does not prove anyone may move in. In this made-up project, 24 apartments are planned: eight in A and 16 in B. A sprinkler form mentions A's eight again. Adding every form gives a false 56.” |
| 0:43–1:10 | Method. Select **Look for move-in approval**. | “Countable groups forms that may belong together and highlights the exact words behind each number. A person checks the originals and looks for a separate occupancy approval showing when finished homes may legally be used. The software cannot approve the count for them.” |
| 1:10–1:25 | Receipt. | “In our example, that proof supports eight new homes in A. We still lack proof for B's 16, so they are unknown—not zero. The document, date, and review decision stay with the eight.” |
| 1:25–1:45 | Why this exists. | “Pittsburgh's City Controller reported this same work: duplicate project permits and mismatched unit numbers had to be checked by hand. Its office called for an ongoing public view of completed homes. That is evidence of a problem, not a Countable customer.” |
| 1:45–2:00 | Why now. | “Pittsburgh now has to publish a construction dashboard by the end of 2026 with numbers that can be traced back to records. Our small prototype is independent of the City.” |
| 2:00–2:15 | AI / reviewer / rules. | “AI can suggest a match and show the relevant words. A person decides if the documents prove the homes are ready. Code adds only what that person approved. This demo also works without an AI key.” |
| 2:15–2:40 | Real Pittsburgh records. | “Now the same question on real permits: a Bedford plan mentions 70 apartments, one building mentions nine, and its sprinkler permit repeats nine. We have no occupancy document in this selected sample, so Countable cannot yet verify any new homes. That does not mean none were built.” |
| 2:40–3:00 | Click **Explore the Bedford case**. Advance to A3's highlighted text. | “Open the case to read the original words and see what's still missing. The separate practice case shows a completed review. Its invented proof never changes the real result.” |

### Questions judges may ask

- **Does this prove demand for Countable?** The [City Controller's 2025 report](https://www.pittsburghpa.gov/files/assets/city/v/1/controller/documents/special-report-inclusionary-zoning-6.10.25.pdf) documents duplicate permits, unit discrepancies, manual reconciliation, and a recommendation for continuous housing development data. [WPRDC's dataset notes](https://data.wprdc.org/dataset/pli-permits) describe nonuniform source text and a permit-type transition. These validate the public-data problem; they are not customer interviews, adoption, or willingness-to-pay evidence.
- **What has the AI accomplished on the real snapshot?** The local Rules-only demo shows extracted claims, precomputed proposed links, exact source passages, and correct abstention from counting without occupancy evidence. The small labeled evaluation in `docs/EVALUATION.md` checks these seeded proposals; it is not a measured accuracy claim for live model analysis or citywide data. A server key enables live AI proposals, but never authorizes ledger events.
- **What makes occupancy evidence sufficient?** A reviewer needs an original linked document and verbatim passage supporting the specific building, residential units, and event date. They also check conditions or temporary use and whether the units were counted before. If any part is unresolved, the event stays out of the verified ledger.
- **Why are the parent 70 and A3 nine treated as overlapping?** The parent filing describes 70 new units across eight buildings in Phase 2A; the A3 permit describes one of those buildings, and its sprinkler filing references A3. These are proposed relationships for review. Shared parcel alone does not merge buildings, and the selected snapshot contains only four of the eight building permits.

## Scope and limitations

Countable does not calculate housing loss or net housing growth. The parent application's unit total is a source claim, and the listed child-building permits cover only part of the development. A completed permit alone cannot establish legally available occupancy. Occupancy documents are not included in this permit snapshot; the [City's separate occupancy search](https://www.pittsburghpa.gov/Business-Development/Permits-Licenses-and-Inspections/References-Resources-and-Forms/Online-Occupancy-Search) is a starting point for source review. A search by `BP-2024-13992` and `2702 LUCAS*` returned no documents on September 26, 2026; search results do not prove no certificate exists. Any example occupancy document is clearly synthetic and separate from real results. PDF extraction is text based; scanned documents require manual transcription tied to the retained original document.

The [City ordinance text](https://pittsburgh.legistar.com/LegislationDetail.aspx?FullText=1&GUID=C2C4ED09-2E63-4E96-A4D5-49EB8F47947D&ID=7994765&Options=&Search=) defines constructed residential units by legal availability for occupancy and requires the City's construction dashboard by the last calendar day of 2026. Countable supports evidence review; the ordinance does not endorse this prototype.
