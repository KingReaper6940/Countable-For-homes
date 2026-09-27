# Counting rules

Countable's verified ledger uses deterministic checks. Model output may propose claims and relationships but cannot authorize a ledger event.

1. A source description is a **claim**. A proposed interpretation is editable. A reviewer decision is recorded separately. A countable event requires a stable event identity, evidence, and a human approval.
2. `unknown` is distinct from `0`. Missing prior-unit, occupancy, or removal records do not prove zero, vacancy, or loss.
3. Permit issue date, current permit status, certificate date, and housing event date are different fields. `Completed` does not replace occupancy review.
4. A trade permit repeating a building's unit count supports that building; it does not create another addition.
5. A parcel can contain several buildings. Parcel equality alone cannot merge their events.
6. Parent-project totals and child-building claims overlap in scope. Their numbers are not summed. Amendments need reconciliation before a claimed total can be relied on.
7. A description of resulting units does not by itself state net additional units. Both are retained as separate claims.
8. An occupancy document must be reviewed for identity, residential scope, units, date, conditions, and prior counting. Approval records an exact passage from the document supporting the candidate units and event date. Temporary authorizations require explicit classification and applicability review.
9. Demolition permits alone do not prove completed unit removal. Housing-loss accounting is outside this version.
10. New evidence explicitly linked to an event reopens that event for review. A repeat approval must address the newly linked document. Repeated imports and repeat approvals must not create duplicate events.
11. Synthetic documents and decisions remain in a separate sandbox. They never support a real-data event.

Visible states are **Documented permitted change**, **Evidence awaiting review**, **Verified addition within stated coverage**, and **Unresolved**. The verified ledger reports additions in this limited cohort and never labels them net housing growth.
