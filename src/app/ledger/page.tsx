"use client";

import {useEffect,useState} from "react";
import Link from "next/link";
import {apiJson,formatDate,LedgerData} from "@/components/types";
import "../product-ui.css";

export default function LedgerPage(){
  const [data,setData]=useState<LedgerData|null>(null);
  const [error,setError]=useState("");
  const load=()=>{setError("");apiJson<LedgerData>("/api/ledger").then(setData).catch(e=>setError(e.message));};
  useEffect(()=>{let active=true;apiJson<LedgerData>("/api/ledger").then(d=>{if(active)setData(d)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false};},[]);
  return <div className="page ledger-page product-page">
    <header className="product-hero ledger-hero"><div><div className="product-kicker"><span className="status-orbit"/>The reviewed ledger</div><h1>A count you can trace.</h1><p>Every approved addition keeps its documents, date, and human decision.</p></div><div className="ledger-score"><strong>{data?.totalUnits??"—"}</strong><span>approved additions</span><small>Within this selected cohort</small></div></header>
    {error&&<div className="notice error" role="alert"><strong>Could not load the ledger.</strong>{error}<button className="btn btn-small" onClick={load}>Try again</button></div>}
    {!data&&!error?<div className="loading"><div className="spinner"/>Loading reviewed events…</div>:data&&<>
      <div className="product-metrics"><span><strong>{data.events.length}</strong>reviewed events</span><span><strong>{data.unresolvedProjects.length}</strong>cases still open</span><span><strong>{data.coverage.recordCount}</strong>source records</span><span className="ai-availability">Additions only · selected records</span></div>
      <div className="product-section-head"><div><span className="eyebrow">The receipts</span><h2>Approved housing events</h2></div><div className="receipt-exports"><a href="/api/export/ledger" download="countable-ledger.csv">CSV ↓</a><a href="/api/export/report" download="countable-evidence-report.md">Evidence report ↓</a></div></div>
      {data.events.length?<div className="receipt-events">{data.events.map(e=><article className="event-receipt" key={e.id}><div className="receipt-unit">+{e.units}<small>{e.units===1?"home":"homes"}</small></div><div className="receipt-content"><div className="receipt-event-heading"><div><span className="receipt-approved">✓ Human reviewed</span><h2><Link href={`/projects/${encodeURIComponent(e.projectId)}`}>{e.projectName} ↗</Link></h2></div><time>{formatDate(e.eventDate)}</time></div><p>{e.sourceRefs.join(" · ")}{e.buildingLabel?` · Building ${e.buildingLabel}`:""}</p><div className="receipt-documents">{e.evidenceDocs.map((doc,index)=><span key={`${doc.sourceRef}-${index}`}>{doc.sourceRef.startsWith("/evidence/")&&doc.sourceRef.endsWith(".pdf")?<a href={doc.sourceRef} target="_blank" rel="noreferrer"><span aria-hidden="true">▤</span>{doc.label}<b>↗</b></a>:doc.label}</span>)}</div><details className="receipt-decision"><summary>Why this was counted</summary><p>{e.reason}</p><small>Reviewed {formatDate(e.decisionAt)} · Event {e.id}</small></details></div></article>)}</div>:<div className="ledger-empty"><span aria-hidden="true">◎</span><h2>The first receipt starts with a review.</h2><p>South 20th Street has two City certificates ready to compare. Approve a supported change to add it here.</p><Link className="feature-action" href="/projects/conversion-12k">Review South 20th Street <b>↗</b></Link><small>Zero approved here means evidence has not passed review. It does not mean zero homes were built.</small></div>}
      <div className="ledger-disclosures"><details className="additional-cases" open={!data.events.length}><summary>{data.unresolvedProjects.length} cases still need evidence <span>Kept visible, never treated as zero built</span></summary><div className="compact-case-list">{data.unresolvedProjects.map(p=><Link key={p.id} href={`/projects/${encodeURIComponent(p.id)}`}><div><strong>{p.name}</strong><small>{p.reason}</small></div><b>↗</b></Link>)}</div></details><details className="additional-cases"><summary>Decision history <span>{data.audit.length} audit entries</span></summary><ol className="product-audit">{data.audit.map(a=><li key={a.id}><time>{formatDate(a.at)}</time><div><strong>{a.action.replaceAll("_"," ")}</strong><p>{a.reason}</p></div></li>)}</ol></details></div>
      <details className="product-coverage"><summary>Coverage and counting limits <span>Snapshot {formatDate(data.coverage.snapshotAt)}</span></summary><p>{data.coverage.note} This ledger tracks approved additions. It does not calculate citywide totals or net growth. Stable event identities prevent repeat approvals from adding duplicate rows.</p><Link href="/methodology">Read the counting method ↗</Link></details>
    </>}
  </div>;
}
