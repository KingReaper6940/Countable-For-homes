import { getCoverage, getProject, listProjects } from './db';
import type { Scope } from './types';

export function getLedger(scope:Scope) {
  if (scope !== 'real') throw new Error('Only the real-record ledger is available.');
  const projects=listProjects().projects.filter(p=>p.scope==='real');
  const details=projects.map(p=>getProject(p.id)!);
  const coverage=getCoverage();
  const events=details.flatMap(d=>d.events.filter(e=>e.status==='verified-addition'&&e.reviewDecisionId&&e.units!==null&&e.eventDate).map(e=>{
    const audit=d.audit.find(a=>a.details.decisionId===e.reviewDecisionId);
    return {id:e.id,projectId:d.project.id,projectName:d.project.name,buildingLabel:e.buildingLabel,units:e.units!,eventDate:e.eventDate!,sourceRefs:e.sourceRecordIds.map(id=>d.records.find(r=>r.id===id)?.permitId??id),evidenceRefs:e.evidenceIds.map(id=>d.evidence.find(x=>x.id===id)?.sourceRef??id),reviewedQuote:String(audit?.details.evidenceQuote??''),pageRef:String(audit?.details.pageRef??''),decisionAt:audit?.at??null,reason:audit?.reason??''};
  }));
  const unresolvedProjects=details.filter(d=>d.project.reviewStatus==='unresolved'||d.events.some(e=>e.status!=='verified-addition')).map(d=>({id:d.project.id,name:d.project.name,reason:d.project.unresolved[0]??'Evidence review remains open.'}));
  return {scope:'real' as const,events,totalUnits:events.reduce((sum,e)=>sum+e.units,0),coverage,unresolvedProjects,audit:details.flatMap(d=>d.audit).sort((a,b)=>b.at.localeCompare(a.at))};
}

function csvCell(value:unknown):string { return `"${String(value??'').replaceAll('"','""')}"`; }
export function ledgerCsv(scope:Scope):string {
  const data=getLedger(scope);
  const rows=[['event_id','project_id','project','building','additional_units','housing_event_date','source_permits','occupancy_evidence','reviewed_quote','page_or_passage','reviewed_at','review_reason','scope'],...data.events.map(e=>[e.id,e.projectId,e.projectName,e.buildingLabel??'',e.units,e.eventDate,e.sourceRefs.join('; '),e.evidenceRefs.join('; '),e.reviewedQuote,e.pageRef,e.decisionAt??'',e.reason,'real'])];
  return rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';
}
export function evidenceReport(scope:Scope):string {
  const data=getLedger(scope);
  const coverage=data.coverage;
  return `# COUNTABLE evidence report\n\nScope: Focused real permit snapshot\nSnapshot retrieved: ${coverage.snapshotAt??'unknown'}\nSource: ${coverage.sourceUrl}\nCoverage: ${coverage.note}\n\n## Reviewed additions\n\n${data.events.length?data.events.map(e=>`- ${e.projectName}${e.buildingLabel?` / ${e.buildingLabel}`:''}: +${e.units} units on ${e.eventDate}. Source permits: ${e.sourceRefs.join(', ')}. Occupancy evidence: ${e.evidenceRefs.join(', ')}. Reviewed passage (${e.pageRef||'page unspecified'}): “${e.reviewedQuote}” Reviewed: ${e.decisionAt??'unknown'}. Decision: ${e.reason}`).join('\n'):'No events have passed occupancy evidence and human review.'}\n\n## Still unresolved\n\n${data.unresolvedProjects.map(x=>`- ${x.name}: ${x.reason}`).join('\n')||'None in this limited scope.'}\n\n## Counting limits\n\nThis is an additions-only ledger within stated coverage. Permit issue dates and Completed status do not establish occupancy dates. Parent totals and child buildings are not summed. Missing records do not imply zero units or housing loss.\n`;
}
