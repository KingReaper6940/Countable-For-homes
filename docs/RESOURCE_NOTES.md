# Data sources selected for Countable

The user-supplied *AI Hackathon for Housing — Public Data Catalog* lists public sources, uses, join keys, and caveats. It is a source-finding guide, not evidence that any Bedford homes are complete. The page references below refer to that 27-page catalog.

| Priority | Source | What Countable uses it for | Boundary |
| --- | --- | --- | --- |
| In use | [WPRDC PLI Permits](https://data.wprdc.org/dataset/pli-permits) (pp. 1, 10, 19) | The 12 selected public records, original descriptions, permit IDs, dates, and statuses behind the Bedford story and review app. | The dataset starts in 2019, text is manually entered, and a permit is not proof of legal occupancy. The selected extract is not citywide. |
| Source search | [OneStopPGH](https://onestoppgh.pittsburghpa.gov/) (pp. 2, 11, 20) | A direct next step from the case and pitch to check current status and inspect original case documents by application number or address. | An interactive portal; no claim that Bedford's occupancy document is available there, and no bulk scraping assumed. |
| In use | [City occupancy search](https://onbasesecure.city.pittsburgh.pa.us/PublicAccessOCC/) (outside the catalog) | Two original certificates for 142 S 20th St establish a prior one-dwelling use and a newer two-dwelling authorization. [Redacted copies and provenance](REAL_OCCUPANCY.md) support a real review-to-ledger path. | The scanned 1985 document needs a checked transcription; certificates for the Bedford case remain unconfirmed. |
| Later | [Historical PLI permits](https://data.wprdc.org/dataset/pli-permits) (pp. 1, 10, 19) | Could add older permitting context when an analysis requires it. | Older schemas need normalization; not needed to resolve Bedford's current occupancy gap. |
| Later | [Parcel boundaries](https://data.wprdc.org/dataset/allegheny-county-parcel-boundaries) and [property assessments](https://data.wprdc.org/dataset/property-assessments) (pp. 1, 10, 19) | Could add map or parcel context for multi-building projects. | Parcel equality does not prove two forms describe the same building; assessment fields can be stale and cannot establish occupancy or a prior-unit baseline by themselves. |

The catalog also lists broad affordability, transit, hazard, and market sources. They may suit site-feasibility products, but they do not answer Countable's current evidence question: which additional homes are supported as legally available for use? The City Controller's documented reconciliation work remains the stronger pitch evidence for this product need.
