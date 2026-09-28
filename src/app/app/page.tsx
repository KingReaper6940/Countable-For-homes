"use client";

import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {apiJson,formatDate,ProjectList,ProjectSummary,statusText} from "@/components/types";
import "../product-ui.css";

export default function QueuePage(){
  const [data,setData]=useState<ProjectList|null>(null);
  const [error,setError]=useState("");
  const [search,setSearch]=useState("");
  const load=()=>{setError("");apiJson<ProjectList>("/api/projects").then(setData).catch(e=>setError(e.message));};
  useEffect(()=>{let active=true;apiJson<ProjectList>("/api/projects").then(d=>{if(active)setData(d)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false};},[]);
  const otherCases=useMemo(()=>data?.projects.filter(p=>!["development-10c","conversion-12k"].includes(p.id)).filter(p=>`${p.name} ${p.address} ${p.parcel}`.toLowerCase().includes(search.toLowerCase()))??[],[data,search]);
  const bedford=data?.projects.find(p=>p.id==="development-10c");
  const south=data?.projects.find(p=>p.id==="conversion-12k");
  const total=data?.projects.reduce((sum,p)=>sum+(p.verifiedUnits??0),0)??0;
  return <div className="page queue-page product-page">
    <header className="product-hero">
      <div><div className="product-kicker"><span className="status-orbit"/>Pittsburgh · Housing review</div><h1>From paperwork<br/>to homes you can count.</h1><p>Find the evidence. Check the change. Save a count you can explain.</p></div>
      <div className="hero-flow" aria-label="Documents lead to evidence review, then to a supported count"><span>01<small>Source records</small></span><i aria-hidden="true">→</i><span>02<small>Human review</small></span><i aria-hidden="true">→</i><span className="flow-end">03<small>Supported count</small></span></div>
    </header>
    {error&&<div className="notice error" role="alert"><strong>Could not load cases.</strong>{error}<button className="btn btn-small" onClick={load}>Try again</button></div>}
    {!data&&!error?<div className="loading"><div className="spinner"/>Opening the review desk…</div>:data&&<>
      <div className="product-metrics"><span><strong>{data.coverage.caseCount}</strong>selected cases</span><span><strong>{data.coverage.recordCount}</strong>permit records</span><Link href="/ledger"><strong>{total}</strong>approved additions <b>↗</b></Link><span className="ai-availability"><i/>{data.mode==="live"?"API key detected":"Saved AI analysis available"}</span></div>
      <div className="product-section-head"><div><span className="eyebrow">Start here</span><h2>Two cases. The full workflow.</h2></div><Link href="/ledger" className="text-link">Open the ledger ↗</Link></div>
      <div className="featured-cases">{bedford&&<FeaturedCase project={bedford} type="bedford"/>}{south&&<FeaturedCase project={south} type="south"/>}</div>
      <details className="additional-cases"><summary>Explore {data.projects.filter(p=>!["development-10c","conversion-12k"].includes(p.id)).length} more cases <span>Different records, different evidence gaps</span></summary><label className="case-search"><span className="visually-hidden">Search other cases</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, address, or parcel"/></label><div className="compact-case-list">{otherCases.map(p=><Link key={p.id} href={`/projects/${encodeURIComponent(p.id)}`}><div><strong>{p.name}</strong><small>{p.subtitle}</small></div><span>{p.recordCount} records</span><span className="compact-status">{statusText[p.reviewStatus]}</span><b>↗</b></Link>)}{!otherCases.length&&<p>No cases match this search.</p>}</div></details>
      <details className="product-coverage"><summary>About these records <span>Snapshot {formatDate(data.coverage.snapshotAt)}</span></summary><p>{data.coverage.note} A permit allows work; it does not establish when a home can legally be used. Every addition needs source evidence and a reviewer decision.</p><a href={data.coverage.sourceUrl} target="_blank" rel="noreferrer">View the public dataset ↗</a><Link href="/methodology">Read the counting method ↗</Link></details>
    </>}
  </div>;
}

function FeaturedCase({project:p,type}:{project:ProjectSummary;type:"bedford"|"south"}){
  const isBedford=type==="bedford";
  const approved=p.verifiedUnits!==null&&p.verifiedUnits>0;
  return <article className={`feature-case feature-${type}`}>
    <div className="feature-top"><span>{isBedford?"01 / Avoid a double count":"02 / Verify an addition"}</span><span className={`feature-state ${approved?"is-approved":""}`}>{isBedford?"Occupancy proof missing":approved?"Reviewed +1":"Documents ready"}</span></div>
    <h2>{isBedford?"Bedford Phase 2A":"South 20th Street"}</h2><p className="feature-description">{isBedford?"Three forms mention overlapping homes. Find the connection before counting them.":"An office becomes a dwelling. Compare two City certificates to establish the change."}</p>
    <div className="case-equation" aria-label={isBedford?"70 planned units, nine in building A3, same nine in sprinkler permit":"One prior dwelling, two permitted dwellings, one proposed addition"}>
      {isBedford?<><div><strong>70</strong><span>Development plan</span></div><i>↳</i><div><strong>9</strong><span>Building A3</span></div><i>↔</i><div className="equation-accent"><strong>9</strong><span>Same homes</span></div></>:<><div><strong>1</strong><span>Prior dwelling</span></div><i>→</i><div><strong>2</strong><span>New certificate</span></div><i>=</i><div className="equation-accent"><strong>+1</strong><span>{approved?"Approved":"To review"}</span></div></>}
    </div>
    <div className="feature-bottom"><span>{p.recordCount} permit records{!isBedford?" · 2 City certificates":" · AI analysis"}</span><Link className="feature-action" href={`/projects/${p.id}${isBedford?"?showcase=1":""}`}>{isBedford?"Trace the overlap":approved?"View the decision":"Review the change"}<b aria-hidden="true">↗</b></Link></div>
  </article>;
}
