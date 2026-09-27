# COUNTABLE permit source snapshot

`permits.snapshot.json` contains twelve live records retrieved on **2026-09-26 23:05:47 UTC** from the [WPRDC PLI Permits dataset](https://data.wprdc.org/dataset/pli-permits), CKAN resource `f4d1177a-f597-4c32-8cbf-7885f56253f6`. `source-manifest.json` records each exact `datastore_search` URL, the requested fields, record count, retrieval time, and a SHA-256 digest of the sanitized record array. The snapshot's own `sha256` matches that digest. This is a pinned demo sample, not a live citywide feed.

Refresh and validate with:

```text
npm run fetch:permits
npm run validate:permits
```

The Node fetch script in `scripts/fetch-permits.ts` uses ordinary CKAN `datastore_search`, one `permit_id` equality filter per seed ID. It requests only the eleven allowlisted fields. It fails if a seed ID is missing or the query exceeds its 100-row limit. It strips leading and trailing description whitespace, redacts email addresses and phone numbers, and removes apartment/unit suffixes from street addresses. A manual check of the current twelve descriptions found no incidental personal names or contact details. Every future refresh still needs a description privacy review before publication.

## Coverage and interpretation

- Conversion case: `BP-2020-11373` and `EP-2021-10918` on parcel `0012K00286000000` repeat the same description. It says one dwelling is added and two residential units result. The electrical record is not a second addition.
- Bedford case: `BDA-2024-03554` states 70 new units in eight buildings. This is an application description and its current status is `Amendment Applicant Revisions`. The four sampled building permits describe A3 (9), A4 (9), A7 (9), and A8 (13) apartments. Their **partial 40-unit sum is not the development total** and cannot be added to the parent's 70-unit claim. `SSP-2025-03861` repeats A3's nine units and references `BP-2024-13992`. `BDA-2026-05107` describes temporary use pending completion of that building permit; its `Completed` status alone does not establish permanent residential occupancy.
- The original nine showcase IDs were chosen for focused review. Other records may exist on either parcel or for these projects. The snapshot does not establish complete project coverage, completed construction, certificates, dates of occupancy, or a citywide housing total.
- Additional review cohort: `BDA-2024-00844` describes alteration to a two-unit residence without stating the prior number of units; no net increment is established. `BP-2023-03827` describes an 11-unit to 8-unit conversion, but a permit description and `Completed` status do not establish an executed housing-loss event. `BP-2022-11140` describes a three-unit change of use and currently has `Revoked` status; it is not a verified addition. These three records are on separate parcels and remain unresolved.
- The additional IDs were selected from the first 100 results of a bounded `datastore_search` query with `q=UNITS` because their descriptions expose distinct interpretation hazards. The exact selection query and individual ID refetches are in the manifest. They are illustrative cases, not a statistical sample.
- The WPRDC dataset documentation states that its permit records cover June 2019 onward, excludes plumbing permits, and warns that manual data entry can be non-uniform. It also says Building & Development Application records should be considered alongside legacy `BUILDING` records. Permit `issue_date` and current `status` serve different purposes from an independently verified housing event date.
- The City provides a [separate online Certificate of Occupancy search](https://www.pittsburghpa.gov/Business-Development/Permits-Licenses-and-Inspections/References-Resources-and-Forms/Online-Occupancy-Search). On 2026-09-26, searches in that interface for `BP-2024-13992` and `2702 LUCAS*` returned “No documents found.” That limited search result does not prove that no certificate exists or that occupancy did not occur. No Bedford occupancy document is included in this selected sample. Two separate [South 20th Street City certificates](../docs/REAL_OCCUPANCY.md) were found on 2026-09-27 and are included as linked evidence outside the permit snapshot.

The source is public permitting data. COUNTABLE is an independent prototype; neither the City of Pittsburgh nor WPRDC endorses its interpretations. The [dataset page](https://data.wprdc.org/dataset/pli-permits) provides further source context and terms.
