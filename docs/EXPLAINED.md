# Understand Countable before presenting it

## What you are building

Countable helps a housing analyst answer: **“How many additional homes do these records actually prove, and why?”** A city analyst, researcher, or reporter could use it to turn a collection of housing documents into a count another person can check. Those are intended users; we have not established customer adoption.

Imagine one apartment building has a construction permit, an electrical permit, and a sprinkler permit. All three might say “nine apartments.” There are still nine apartments in the building. Adding the numbers on the forms would produce 27. A separate document might describe 70 homes across the whole development, including that same building. That adds another overlap.

There is a second problem: permission to build does not establish when a home became legally available to use. A permit marked “Completed” may describe a particular application or task. An occupancy certificate can establish the permitted use, but the reviewer still needs to read its scope and conditions.

Countable brings the records together, helps a person understand their relationships, and saves a supported addition with its evidence. Its “receipt” is the source document, exact passage, date, and decision behind the count.

## The three parts of the product

**Read evidence:** Open a case and read the original permit descriptions or the attached City certificate. The app retains where each document came from. Source text is the evidence; the interface's explanation helps you interpret it.

**Review findings:** GPT-6 Sol reads the selected permit descriptions and proposes useful findings, unit claims, and relationships. A finding includes an exact quote and a question for the reviewer. The app checks that the quote exists in the cited record. That check establishes where the words came from; it cannot guarantee the model interpreted them correctly. The reviewer can approve or correct the proposed links and claims.

**Record decision:** The reviewer chooses a particular housing event, attaches its supporting document, identifies the additional units and event date, records an exact passage, completes the evidence checks, and explains the decision. Only an approved event enters the ledger. Approving a link between two permits does not approve any homes.

## First case: Bedford — avoid a wrong answer

The real Bedford Phase 2A application describes **70 new units across eight buildings**. Building A3's permit describes **nine apartments**. A3's sprinkler permit repeats those nine and explicitly names A3's building permit, `BP-2024-13992`.

Those are three descriptions at different levels: the whole development, a building inside it, and work supporting that building. Adding 70 + 9 + 9 would give a misleading 88. Countable helps identify the overlap.

The selected snapshot has only four of the eight building permits. It also has a temporary-use application marked Completed whose description says work under A3's permit was pending. We have no linked occupancy certificate for Bedford in this app. **The correct result is “occupancy unresolved.”** This does not claim that no homes were built.

The demo actions:

1. From the review desk, choose **Trace the overlap**.
2. Click **Run live model** if available. This sends the selected public permit descriptions to GPT-6 Sol. Wait for the result and read its mode label. If a request fails and the app shows **Saved analysis**, describe it as saved.
3. Select the finding about the sprinkler permit. The app opens the cited record and highlights the exact phrase naming A3's building permit. Explain: “The model gives the reviewer a traceable starting point.”
4. Use **Review record links** or the guided step for the sprinkler relationship. Read the source passage. Enter a reason such as: “The sprinkler filing names BP-2024-13992 and repeats the same nine A3 apartments.” Click **Approve**.
5. Explain the result: “We saved a reviewed connection between two documents. We have not counted nine additional homes, because this case still lacks occupancy evidence.”

The value shown here is avoiding a false housing count and making the reasoning visible.

## Second case: South 20th Street — reach a supported answer

This is a separate property, not the missing Bedford certificate. Two real City occupancy certificates describe its before-and-after use:

- Certificate **47881** permits a doctor's office on the first floor and one dwelling on the second floor. The residential baseline is **one dwelling**.
- Certificate **BP-2020-11373**, issued **February 25, 2024**, permits **two dwellings**: one on the first floor and one across the second and third floors.
- The matching building permit explicitly describes changing office use to **add a dwelling unit**.

The supported proposed increase is therefore **2 − 1 = +1 dwelling**. Two is the new total in the building; one is the addition. The app includes privacy-redacted copies of both certificates. The older scanned document's selected text was manually transcribed. The [source notes](REAL_OCCUPANCY.md) explain retrieval, redaction, and the hashes of the City originals.

The demo actions:

1. Return to **Review queue**, then choose **Review the change** for South 20th Street.
2. In **Read evidence**, select each City certificate. Read its permitted use. Open the PDF copies if you want to show the official document on camera.
3. Choose **Review change** / **Record decision**. The new certificate is the supporting occupancy document. Leave additional units at **1**. Enter **February 25, 2024** as the housing event date; this demo uses the certificate's issuance date rather than the earlier permit issue date or inspection date.
4. Click **Insert cited passage from selected document**. It copies the retained certificate text; it does not generate evidence.
5. Complete the six checks after reviewing the source: correct property; residential use; supported increment; supported date; relevant conditions; no prior duplicate count.
6. Record your reason. For example: “Certificate 47881 permits one dwelling above an office. Certificate BP-2020-11373 permits two dwellings on February 25, 2024. The matching permit says add a dwelling unit. I reviewed the property, conditions, and prior count.”
7. Click **Approve event**, then **View ledger**. The ledger should show **+1**, the event date, links to both certificate copies, and the reviewer reason. Bedford remains unresolved.

This is a demonstration of a local review decision using real public documents. It is not a City certification of Countable's output.

## What is live, and what is saved?

The website is a working local application. Review decisions are stored in SQLite and remain after a refresh. The permit dataset is a **committed snapshot of 12 selected records across five cases**, not a continuously refreshed City feed. There are two additional City certificate documents.

When a usable API key is configured, **Run live model** makes a real GPT-6 Sol request and displays that request's source-checked findings. Its wording can vary. It cannot automatically approve a housing event. The app does not replace a successful live response with the saved answer.

If the live call fails, Bedford can show a clearly labelled saved GPT-6 Sol analysis. This is a previously generated, human-curated set of findings whose quotes are checked again against the source snapshot. Other cases retain their rule-extracted claims when no live result is available. A configured key alone does not establish that its billing, quota, model access, or connection works.

## How to explain why anyone needs this

“Public housing data comes as paperwork, but people want to know what changed in the real world. The same homes can appear on several forms, and a building permit is not an occupancy certificate. Countable helps an analyst follow the source evidence and keep a defensible count.”

The pitch links to the City Controller's report documenting duplicate records and manual reconciliation, and to Pittsburgh's construction-dashboard ordinance. Those sources support the existence of the data problem. They do not establish that the City endorses Countable or that customers have bought it.

## Questions you should be able to answer

**Why use AI if people still review everything?** The model helps locate relevant passages and interpret relationships across messy descriptions. The intended benefit is reducing the reading and reconciliation work. The prototype has not measured time saved with real analysts yet.

**What prevents hallucinations?** The app checks the cited record and exact quote, keeps model output as proposals, requires explicit evidence checks and a human decision, and records an audit. These controls reduce risk; an exact quote can still be interpreted incorrectly, so human review matters.

**Is the +1 a citywide result?** No. It is an approved addition for the selected South 20th Street case. The ledger does not count housing losses or calculate net citywide growth.

**What happens when new evidence changes the answer?** Adding evidence linked to an event reopens it for review. Reversing a decision creates another audit entry. Stable event identities prevent approving the same event twice from creating two ledger rows.

**What is next after the hackathon?** A sensible next step is a pilot with housing analysts on a larger, independently labelled sample. That would test whether the workflow reduces review time, handles ambiguous documents, and catches duplicate or unsupported additions. It would also require broader source ingestion and production access controls.
