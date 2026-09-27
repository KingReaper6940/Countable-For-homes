import type { Metadata } from "next";
import Link from "next/link";
import "./methodology.css";

export const metadata: Metadata = {
  title: "Counting method | COUNTABLE",
  description: "How Countable separates permit claims, reviewed occupancy evidence, and verified housing additions in its selected Pittsburgh cohort.",
};

export default function MethodologyPage() {
  return <div className="methodology-page">
    <div className="methodology-container">
      <p className="methodology-eyebrow">COUNTABLE / Counting method</p>
      <h1>A source claim is not a housing event.</h1>
      <p className="methodology-lede">Countable keeps proposed interpretations, reviewer decisions, and ledger events separate. These are the rules behind the working Pittsburgh prototype.</p>

      <div className="methodology-grid">
        <section><span>01 / Source</span><h2>Keep the original words.</h2><p>Each claim retains its permit ID and exact passage. Parent totals, individual buildings, amendments, and trade filings can refer to overlapping homes. A shared parcel alone cannot merge buildings.</p></section>
        <section><span>02 / Review</span><h2>Check occupancy and identity.</h2><p>A reviewer checks the building or project, residential scope, unit increment, supported event date, conditions or temporary use, and prior counting. A completed permit or issue date alone does not establish legal availability for occupancy.</p></section>
        <section><span>03 / Ledger</span><h2>Count only reviewed events.</h2><p>Deterministic rules require supporting evidence, a human decision, and a stable event identity. Missing evidence stays unresolved. A sprinkler permit repeating nine apartments cannot create nine more.</p></section>
      </div>

      <div className="methodology-note"><strong>Scope matters.</strong><p>The demo uses 12 selected public Pittsburgh permit records, not a citywide sample. No occupancy document is included in that snapshot, so the real ledger begins with zero <em>verified additions within this coverage</em>. That zero does not mean the development delivered no homes. Invented walkthrough records and synthetic review evidence never enter the real ledger.</p></div>

      <div className="methodology-links"><Link href="/projects/development-10c?showcase=1">Inspect the Bedford case ↗</Link><Link href="/ledger?scope=real">Open the real ledger ↗</Link><a href="https://data.wprdc.org/dataset/pli-permits" target="_blank" rel="noreferrer">WPRDC source dataset ↗</a><a href="https://pittsburgh.legistar.com/LegislationDetail.aspx?FullText=1&GUID=C2C4ED09-2E63-4E96-A4D5-49EB8F47947D&ID=7994765&Options=&Search=" target="_blank" rel="noreferrer">Pittsburgh ordinance ↗</a></div>
    </div>
  </div>;
}
