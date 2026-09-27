# COUNTABLE

**Every housing count has a receipt.** Countable is a local prototype for reviewing Pittsburgh housing permit records and the evidence required to support an additions ledger. The landing page at `/` is a narrated pitch; the working review application starts at `/app`. Countable is designed to assist analysts alongside existing reporting systems. It is not a City of Pittsburgh product, a certified reporting system, or a complete citywide housing count.

## Run locally

Requirements: Node.js 20.9 or newer.

```powershell
npm install
npm run dev
```

Open [the presentation](http://localhost:3000/) or go directly to [the working app](http://localhost:3000/app). The first run seeds a local SQLite database from the committed sanitized snapshot. Browser refreshes retain review work. The database defaults to `.countable/countable.db`; set `COUNTABLE_DB_PATH` to use another local path. Run `npm run seed` to import explicitly. Run `npm run typecheck`, `npm test`, `npm run evaluate`, and `npm run build` to verify the application.

No API key is required. Without one, deterministic extraction and precomputed showcase proposals remain available; the Bedford workspace also offers a clearly labeled [saved GPT-6 Sol analysis](docs/AI_REPLAY.md) of the exact public snapshot. Its source quotes are checked again when replayed. No model is called during the replay. To enable server-side live model analysis, copy `.env.example` to `.env.local`, set `OPENAI_API_KEY`, and optionally set `OPENAI_MODEL`. Keys are read only on the server.

## Data and reproduction

The included [permit snapshot](data/permits.snapshot.json) contains twelve selected records from the [WPRDC PLI Permits dataset](https://data.wprdc.org/dataset/pli-permits). The [source manifest](data/source-manifest.json) stores the retrieval time, exact `datastore_search` queries, source URL, fields, and hash. It includes the specified South Side conversion and Bedford development records plus three small independent review cases selected to challenge unit-count assumptions. This is a curated cohort, not a complete project or citywide extract. The WPRDC dataset explains that Building & Development Application records need to be included alongside legacy `BUILDING` permits.

To refetch and validate the same permit IDs:

```powershell
npm run fetch:permits
npm run validate:permits
```

This refresh replaces the snapshot and can change descriptions or statuses. Review new evidence and claims after a refresh. No owner names, contractor identities, or contact fields are requested or stored.

## Review model

The queue at `/app` opens five cases built from selected real permit records, including three extra unresolved review examples. The public `/methodology` page explains the counting rules and selected-cohort limits. The evidence workspace keeps source claims, proposed relationships, reviewer decisions, and potential housing events separate. Permit status and issue dates do not establish an occupancy date. The ledger lists additions only when identity, unit increment, residential scope, date, evidence, and a human decision support an event. Unknown remains unknown. The pitch follows Bedford's actual public records throughout and does not present a fabricated approval.

See [counting rules](docs/COUNTING_RULES.md) for the decision policy, [labeled evaluation](docs/EVALUATION.md) for measured extraction results and limits, [source selection notes](docs/RESOURCE_NOTES.md) for catalog resources and caveats, and [demo script](docs/DEMO.md) for a guided walkthrough. The interface offers CSV export, an evidence report, and an audit trail. Reversals create new audit entries.

## Two to three minute presenter script

Use the optional **Present** control or scroll normally. Arrow keys advance sections while Present is on; Escape exits it. Every section also remains available through ordinary scrolling.

| Time | Screen / click | Say |
| --- | --- | --- |
| 0:00–0:20 | Hero. Click the A3 sprinkler card to show its source text. | “How many new homes are ready for people to use? Here are real Pittsburgh records for Bedford Phase 2A. Several forms mention the same apartments, so a permit number cannot simply become a housing count.” |
| 0:20–0:45 | Start the story; show the crossed-out 88, then click **Separate the facts**. | “The development application describes 70 units across eight buildings. A3's building permit describes nine of them. Its sprinkler permit repeats those nine and names the building permit. Adding 70, nine and nine would falsely claim 88 finished homes.” |
| 0:45–1:10 | Method. Select **Check what status means**, then **Look for move-in proof**. | “Countable links related forms and highlights the exact words. Another real record is marked Completed but says work under A3 is still pending. We need a separate occupancy document to know when homes may legally be used. This snapshot has none.” |
| 1:10–1:25 | Honest result. | “So the verified addition is unresolved. That is not a claim that zero homes were built. It means these particular records cannot prove the answer yet.” |
| 1:25–1:45 | Why this exists. | “Pittsburgh's City Controller reported the same problem: duplicate permits and mismatched unit counts had to be reconciled by hand. The office recommended an ongoing public view of completed homes. This validates the data problem, not customer adoption.” |
| 1:45–2:00 | Why now. | “The City must publish an auditable construction dashboard by the end of 2026. Countable is an independent, limited prototype for the evidence work behind that kind of answer.” |
| 2:00–2:15 | AI / reviewer / rules. | “AI can suggest that the sprinkler and building permits belong together. A reviewer checks the originals and looks for occupancy proof. Code will not mark A3 verified without the document, date and human decision.” |
| 2:15–2:40 | Source trail. | “A catalog of hackathon data sources points us to OneStopPGH for current case documents. It is a search lead, not proof that Bedford's occupancy document exists there. The City also has a separate occupancy search.” |
| 2:40–3:00 | Open the Bedford case and A3 source text. | “The working app holds these public records, their proposed links and the unanswered questions. You can inspect the original words yourself. The count stays unresolved until sufficient original evidence is reviewed.” |

### Questions judges may ask

- **Does this prove demand for Countable?** The [City Controller's 2025 report](https://www.pittsburghpa.gov/files/assets/city/v/1/controller/documents/special-report-inclusionary-zoning-6.10.25.pdf) documents duplicate permits, unit discrepancies, manual reconciliation, and a recommendation for continuous housing development data. [WPRDC's dataset notes](https://data.wprdc.org/dataset/pli-permits) describe nonuniform source text and a permit-type transition. These validate the public-data problem; they are not customer interviews, adoption, or willingness-to-pay evidence.
- **What has the AI accomplished on the real snapshot?** A saved GPT-6 Sol analysis identifies five Bedford source passages and questions for reviewer inspection. The local app checks every quote against the snapshot before displaying it and links each finding to its source description. This is a replay, not a model call during the demo. Deterministic extraction and seeded relationship proposals power the default review state; the small evaluation in `docs/EVALUATION.md` checks those fixtures, not live-model or citywide accuracy. A server key enables fresh AI proposals, but never authorizes ledger events.
- **What makes occupancy evidence sufficient?** A reviewer needs an original linked document and verbatim passage supporting the specific building, residential units, and event date. They also check conditions or temporary use and whether the units were counted before. If any part is unresolved, the event stays out of the verified ledger.
- **Why are the parent 70 and A3 nine treated as overlapping?** The parent filing describes 70 new units across eight buildings in Phase 2A; the A3 permit describes one of those buildings, and its sprinkler filing references A3. These are proposed relationships for review. Shared parcel alone does not merge buildings, and the selected snapshot contains only four of the eight building permits.

## Scope and limitations

Countable does not calculate housing loss or net housing growth. The parent application's unit total is a source claim, and the listed child-building permits cover only part of the development. A completed permit alone cannot establish legally available occupancy. Occupancy documents are not included in this permit snapshot. The hackathon's public data catalog identifies [OneStopPGH](https://onestoppgh.pittsburghpa.gov/) as a place to check current cases and original project documents, though it does not confirm an occupancy document for Bedford. The [City's separate occupancy search](https://www.pittsburghpa.gov/Business-Development/Permits-Licenses-and-Inspections/References-Resources-and-Forms/Online-Occupancy-Search) is another starting point. A search by `BP-2024-13992` and `2702 LUCAS*` returned no documents on September 26, 2026; search results do not prove no certificate exists. PDF extraction is text based; scanned documents require manual transcription tied to the retained original document.

The [City ordinance text](https://pittsburgh.legistar.com/LegislationDetail.aspx?FullText=1&GUID=C2C4ED09-2E63-4E96-A4D5-49EB8F47947D&ID=7994765&Options=&Search=) defines constructed residential units by legal availability for occupancy and requires the City's construction dashboard by the last calendar day of 2026. Countable supports evidence review; the ordinance does not endorse this prototype.
