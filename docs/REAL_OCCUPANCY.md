# South 20th Street: original occupancy evidence

Countable includes two City of Pittsburgh certificates for **142 S 20th St**, the same address and parcel as permit `BP-2020-11373` in the selected WPRDC snapshot. These documents were found in the [City occupancy portal](https://onbasesecure.city.pittsburgh.pa.us/PublicAccessOCC/) on September 27, 2026. Search the property address `142 S 20TH*` to retrieve both originals. The portal's direct document links can change between searches, so the address and certificate numbers are the reproducible lookup.

| City certificate | Relevant original text | Interpretation for review |
| --- | --- | --- |
| 47881, stamped October 21, 1985 | “Use of first floor as a doctor's office and use of second floor as a one family dwelling.” | Prior authorized residential baseline: one dwelling. This older PDF is scanned; its selected text in the app is a manual transcription checked against the image. |
| BP-2020-11373, issued February 25, 2024 | “USE OF THREE STORY STRUCTURE AS TWO UNIT RESIDENTIAL WITH ONE UNIT ON 1ST FLOOR FLOOR & SECOND UNIT ON 2ND & 3RD FLOOR.” | New certificate authorizes two dwellings. The same permit's public work description says it will “ADD A DWELLING UNIT” in the former office space. |

Together these support a **candidate increase of one dwelling**, dated to issuance of the newer certificate. The app keeps it awaiting review until someone checks the originals, identity, residential scope, conditions, date, and prior counting, then records a reason. A permit's `Completed` status alone was not used as the event date. This is a selected case, not a citywide or net housing count.

The repository contains [privacy-redacted copies of the 1985 certificate](../public/evidence/south-20th-prior-redacted.pdf) and [2024 certificate](../public/evidence/south-20th-2024-redacted.pdf). Only owner information was covered. All relevant address, certificate, occupancy, date, and conditions fields remain visible. The selected source text and hashes are in [`data/occupancy-evidence.json`](../data/occupancy-evidence.json). SHA-256 of the unredacted City originals as retrieved:

- Certificate 47881: `5a885687b20f36d031ca60013f541ebe31b6893168822e0c8123f6ec8ecb6b73`
- Certificate BP-2020-11373: `bc3a9022585ea4a8df0d630a3d0d04be431250a2b91b05308c455ea5cf2a3577`

The app's redacted copies preserve the visible decision fields for presentation. Reviewers can independently retrieve the City originals through the portal and compare their hashes. The app does not claim City endorsement or independent authentication of arbitrary documents users may later add.
