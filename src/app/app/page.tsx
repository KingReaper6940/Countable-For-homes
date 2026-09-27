"use client";

import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {apiJson,formatDate,ProjectList,ProjectSummary,ReviewStatus,statusClass,statusText} from "@/components/types";
import "../queue.css";
import "../app-polish.css";

const statuses:(ReviewStatus|"all")[]=["all","unresolved","evidence-awaiting-review","documented-permitted-change","verified-addition"];

export default function QueuePage(){
  const [data,setData]=useState<ProjectList|null>(null);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState("");
  const [status,setStatus]=useState<ReviewStatus|"all">("all");
  const [coverageOpen,setCoverageOpen]=useState(false);
  const [guideOpen,setGuideOpen]=useState(true);
  const load=()=>{setLoading(true);setError("");apiJson<ProjectList>("/api/projects").then(setData).catch(e=>setError(e.message)).finally(()=>setLoading(false));};
  useEffect(()=>{let active=true;apiJson<ProjectList>("/api/projects").then(d=>{if(active)setData(d)}).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false};},[]);
  const visible=useMemo(()=>data?.projects.filter(p=>(status==="all"||p.reviewStatus===status)&&(`${p.name} ${p.subtitle} ${p.parcel} ${p.address} ${p.claimSummary}`.toLowerCase().includes(search.trim().toLowerCase()))).sort((a,b)=>Number(b.id==="development-10c")-Number(a.id==="development-10c"))||[],[data,status,search]);
  const scoped=data?.projects||[];
  const showcase=data?.projects.find(p=>p.recordCount>=4)||data?.projects[0];
  return <div className="page queue-page">
    <div className="page-heading">
      <div><div className="eyebrow">Housing evidence / Pittsburgh</div><h1 className="page-title">Review queue</h1><p className="page-intro">Reconcile permit records into supported housing events. Source claims stay separate from approved facts, and every counted addition needs evidence and a reviewer decision.</p></div>
      {showcase&&<Link className="btn btn-primary" href={`/projects/${encodeURIComponent(showcase.id)}?showcase=1`}>Open guided showcase <span aria-hidden="true">↗</span></Link>}
    </div>
    {guideOpen&&<section className="judge-guide panel" aria-label="Try this case guide"><div><span className="eyebrow">Start with the source</span><h2>Follow Bedford&apos;s record trail.</h2><p>Start with A3&apos;s nine-unit permit, open the sprinkler filing that repeats it, then check why the ledger stays unresolved without occupancy evidence.</p><div className="judge-guide-actions"><Link className="btn btn-primary" href="/projects/development-10c?showcase=1">Inspect Bedford ↗</Link><Link className="btn" href="/ledger">Review ledger</Link></div></div><button type="button" className="guide-dismiss" onClick={()=>{setGuideOpen(false);}} aria-label="Dismiss case guide">×</button></section>}
    {error&&<div className="notice error" role="alert"><strong>Could not load review cases.</strong>{error} <button className="btn btn-small" onClick={load}>Try again</button></div>}
    {loading?<div className="loading"><div className="spinner"/>Loading source coverage and cases…</div>:data&&<>
      <div className="coverage-bar panel">
        <div className="coverage-icon" aria-hidden="true">◎</div>
        <div className="coverage-copy"><strong>What this workspace covers</strong><span>{data.coverage.caseCount} seeded case{data.coverage.caseCount===1?"":"s"} · {data.coverage.recordCount} cached permit record{data.coverage.recordCount===1?"":"s"} · Snapshot {formatDate(data.coverage.snapshotAt)}</span></div>
        <span className="pill teal">{data.mode==="live"?"Live AI available":"Rules-only mode"}</span>
        <button className="btn btn-small" aria-expanded={coverageOpen} onClick={()=>setCoverageOpen(!coverageOpen)}>{coverageOpen?"Hide":"View"} coverage</button>
      </div>
      {coverageOpen&&<div className="coverage-detail panel panel-pad"><h2 className="panel-heading">Source and limits</h2><p>{data.coverage.note}</p><p className="tiny muted">Permit data is a starting point for review. A permit status and issue date do not establish a housing event date. Missing records do not mean zero units.</p><a href={data.coverage.sourceUrl} target="_blank" rel="noreferrer">Open source dataset ↗</a></div>}
      <div className="queue-toolbar">
        <div className="queue-controls"><label className="search-box"><span className="visually-hidden">Search projects</span><span aria-hidden="true">⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search address, parcel, or case" /></label><label className="visually-hidden" htmlFor="status-filter">Filter status</label><select className="select" id="status-filter" value={status} onChange={e=>setStatus(e.target.value as ReviewStatus|"all")}>{statuses.map(s=><option key={s} value={s}>{s==="all"?"All review states":statusText[s]}</option>)}</select></div>
      </div>
      <div className="queue-count">{visible.length} of {scoped.length} real cases shown</div>
      <div className="case-grid">{visible.map(p=><CaseCard key={p.id} project={p}/>)}</div>
      {visible.length===0&&<div className="panel empty"><strong>No cases match these filters.</strong><p>Change the search or review state to see more cases.</p><button className="btn" onClick={()=>{setSearch("");setStatus("all")}}>Clear filters</button></div>}
    </>}
  </div>;
}

function CaseCard({project:p}:{project:ProjectSummary}){return <article className="case-card panel">
  <div className="case-top"><div className="case-index">CASE / {p.parcel||p.id}</div><span className={`pill ${statusClass[p.reviewStatus]}`}>{statusText[p.reviewStatus]}</span></div>
  <h2><Link href={`/projects/${encodeURIComponent(p.id)}`}>{p.name}</Link></h2><p className="case-subtitle">{p.subtitle||p.address}</p>
  <div className="case-rule"/><div className="case-facts"><div><strong>{p.recordCount}</strong><span>source records</span></div><div><strong>{p.verifiedUnits===null?"Unknown":p.verifiedUnits}</strong><span>reviewed additions</span></div></div>
  <p className="case-claim"><span>DOCUMENTED CLAIMS</span>{p.claimSummary||"No unit claim identified in cached records."}</p>
  <div className="case-bottom"><div className="case-question">{p.unresolved.length?<><span aria-hidden="true">◌</span> {p.unresolved[0]}</>:"No open question recorded."}</div><Link className="btn btn-small" href={`/projects/${encodeURIComponent(p.id)}`}>Open evidence <span aria-hidden="true">→</span></Link></div>
</article>}
