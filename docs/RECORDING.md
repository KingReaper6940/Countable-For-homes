# Record Countable with OBS

The [participant packet](https://docs.google.com/document/d/1L-UYid6Q0JDRH3iy4cpqGIDlZNpJspok_rPxIsILbLQ/edit?usp=sharing) asks for a 3–5 minute demo video. The presenter records and submits the video. This guide keeps the website ready for a clean local take.

## Before pressing Record

1. Open `http://localhost:3000/` in a desktop browser. Use a 1920 × 1080 capture if available. A browser zoom around 90% keeps all three Bedford workspace columns visible; increase it if the text becomes too small in the recording.
2. Check `http://localhost:3000/projects/development-10c?showcase=1` has **Replay saved AI review** and `http://localhost:3000/projects/conversion-12k` has **two City certificates**. If either is missing, the server is using an older build. Restart from this checkout.
3. For a fresh rehearsal or take, use a new `COUNTABLE_DB_PATH` filename. Each new local SQLite database seeds the same committed public snapshot and certificates. Keep previous database files if you want to retain earlier decisions.

```powershell
$env:COUNTABLE_DB_PATH = ".countable/obs-demo-1.db"
npm run build
npm run start
```

The site opens on port 3000 by default. If another Countable process already owns that port, stop that process first. Do not run `npm run dev` and `npm run start` against the same port at once. A server key is unnecessary: the Bedford AI analysis is a labeled saved replay, and South 20th Street uses the committed documents.

## Suggested 4-minute take

| Time | On screen | Presenter point |
| --- | --- | --- |
| 0:00–0:35 | Landing hero; click the A3 sprinkler card, then **Start with the real records**. | “Pittsburgh's public permit records can name the same apartments several times. A development plan says 70 homes, A3 says nine, and its sprinkler form repeats those nine. Paperwork is not a count of finished homes.” |
| 0:35–1:10 | **Separate the facts**, then scroll through **Why this exists** and **Why now**. | “The City Controller documented manual reconciliation of duplicate permits, and Pittsburgh now requires an auditable construction dashboard. Countable is an independent prototype for tracing a claim to evidence.” |
| 1:10–2:00 | Open **Inspect real Bedford** from the last pitch section, or go to `/projects/development-10c?showcase=1`. Click **Replay saved AI review**, select the sprinkler finding, and show its highlighted source words. In guided step 3, use **Review this link**, enter a reason, and approve the relationship. | “The saved GPT-6 Sol analysis points us to the exact permit reference. A human confirms the relationship. The homes remain unresolved because these selected records have no linked occupancy certificate.” |
| 2:00–3:20 | Open `/projects/conversion-12k`. Show the **1 dwelling → 2 dwellings** comparison and both redacted City PDFs. Choose the newer certificate; enter `2024-02-25`, click **Insert cited passage**, complete all six evidence checks, and enter a reason citing both certificates. Click **Approve event**. | “Here we found the missing kind of document. An older City certificate permits one dwelling above an office; the 2024 certificate permits two. The matching permit says a dwelling was added. After a reviewer checks the originals, the supported change is +1.” |
| 3:20–4:00 | Open **Reviewed ledger**. Show +1, both linked certificates, the decision audit, and Bedford in **Unresolved cases**. | “The ledger gives one supported addition in this small selected cohort. It does not claim a citywide total. Bedford stays open until its own occupancy proof is found.” |

For the South 20th Street decision reason, a concise source-based example is: “Certificate 47881 permits one dwelling above a first-floor office. Certificate BP-2020-11373 permits two dwellings on February 25, 2024. The matching permit says add a dwelling unit. I checked the address, conditions, and prior count.” Read the PDFs before asserting those checks on camera.

## Capture notes

- In OBS, capture the browser window rather than your entire desktop if you want to keep notifications and unrelated windows out of frame. Keep the browser maximized and avoid showing terminal windows or local environment files.
- Record one short rehearsal. Play it back once to check that source text, the +1 result, and your voice are legible. The app remembers decisions, so start the final take with a new database filename if you want the approval action again.
- The occupancy PDFs are privacy-redacted copies. The originals are available in the [City occupancy search](https://onbasesecure.city.pittsburgh.pa.us/PublicAccessOCC/) by property address `142 S 20TH*`; [source notes](REAL_OCCUPANCY.md) explain the retained hashes and transcription limits.
- Keep the distinction clear: a saved, curated AI analysis helps locate passages; rules and reviewer checks control the ledger. Neither a model suggestion nor a permit marked Completed establishes occupancy.

The [repository](https://github.com/KingReaper6940/Countable-For-homes), this video, and the [hackathon submission form](https://docs.google.com/forms/d/e/1FAIpQLSfDK_aD-miOV3D92Bl4NOFa1Skb8_u-GTCH5j1FE-VEWTr4DQ/viewform) are separate submission items. Confirm the repository is public and the video link is viewable before submitting.
