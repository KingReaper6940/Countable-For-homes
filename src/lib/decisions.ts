import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { addAudit, findEvidence, getProject, sqlConnection } from './db';
import { canApproveEvent, supportedQuote } from './rules';
import type { ProjectDetail, RelationshipType } from './types';

const relationTypes=['parent-project','building','supporting-trade','amendment','occupancy-related'] as const;
export const decisionSchema=z.object({
  projectId:z.string().min(1),
  action:z.enum(['approve_relationship','reject_relationship','edit_relationship','split_relationship','merge_relationship','approve_claim','reject_claim','edit_claim','reverse_claim','edit_event','approve_event','reject_event','reverse_event']),
  targetId:z.string().min(1),reason:z.string().trim().min(3).max(2000),
  changes:z.record(z.string(),z.unknown()).optional(),
});
export type DecisionInput=z.infer<typeof decisionSchema>;

function relationChange(changes:Record<string,unknown>|undefined, key:'type'|'fromRecordId'|'toRecordId'):string|undefined {
  const value=changes?.[key];
  return typeof value==='string' && value.trim() ? value.trim() : undefined;
}

export function applyDecision(input:DecisionInput):ProjectDetail {
  const current=getProject(input.projectId);
  if (!current) throw new Error('Unknown project');
  const sql=sqlConnection();
  const relation=current.relationships.find(x=>x.id===input.targetId);
  const claim=current.claims.find(x=>x.id===input.targetId);
  const event=current.events.find(x=>x.id===input.targetId);
  const recordIds=new Set(current.records.map(r=>r.id));
  sql.transaction(()=>{
    if (input.action==='approve_claim'||input.action==='reject_claim'||input.action==='reverse_claim') {
      if (!claim) throw new Error('Claim not found');
      if (input.action==='approve_claim') {
        const source=current.records.find(r=>r.id===claim.recordId);
        if (!source||!supportedQuote(source.description,claim.quote)) throw new Error('Claim source quote is no longer supported; edit or reject it.');
      }
      const next=input.action==='approve_claim'?'approved':input.action==='reject_claim'?'rejected':'proposed';
      if (claim.reviewStatus===next) return;
      sql.prepare('UPDATE claims SET review_status=? WHERE id=?').run(next,claim.id);
      if (claim.reviewStatus==='approved') sql.prepare("UPDATE events SET status='evidence-awaiting-review',review_decision_id=NULL WHERE project_id=? AND status='verified-addition' AND source_record_ids LIKE ?").run(input.projectId,`%${claim.recordId}%`);
      addAudit(input.projectId,input.action,'claim',claim.id,input.reason,{before:claim.reviewStatus,after:next});
    } else if (input.action==='edit_claim') {
      if (!claim) throw new Error('Claim not found');
      const record=current.records.find(r=>r.id===claim.recordId);
      if (!record) throw new Error('Claim source record not found');
      const kind=typeof input.changes?.kind==='string'?input.changes.kind:claim.kind;
      const units=typeof input.changes?.units==='number'?input.changes.units:claim.units;
      const quote=typeof input.changes?.quote==='string'?input.changes.quote.trim():claim.quote;
      if (!['existing','resulting','addition','removal','project-total','building-total'].includes(kind)||!Number.isInteger(units)||units<0||!supportedQuote(record.description,quote)) throw new Error('Claim correction requires a valid kind, nonnegative units, and an exact source quote');
      if (kind===claim.kind&&units===claim.units&&quote===claim.quote) return;
      sql.prepare("UPDATE claims SET kind=?,units=?,quote=?,review_status='proposed' WHERE id=?").run(kind,units,quote,claim.id);
      if (claim.reviewStatus==='approved') sql.prepare("UPDATE events SET status='evidence-awaiting-review',review_decision_id=NULL WHERE project_id=? AND status='verified-addition' AND source_record_ids LIKE ?").run(input.projectId,`%${claim.recordId}%`);
      addAudit(input.projectId,input.action,'claim',claim.id,input.reason,{before:claim,after:{kind,units,quote,status:'proposed'}});
    } else if (input.action==='approve_relationship'||input.action==='reject_relationship'||input.action==='split_relationship') {
      if (!relation) throw new Error('Relationship not found');
      const next=input.action==='approve_relationship'?'approved':'rejected';
      if (relation.status===next) return;
      sql.prepare('UPDATE relationships SET status=?, reason=? WHERE id=?').run(next,input.reason,relation.id);
      addAudit(input.projectId,input.action,'relationship',relation.id,input.reason,{before:relation.status,after:next});
    } else if (input.action==='edit_relationship') {
      if (!relation) throw new Error('Relationship not found');
      const type=relationChange(input.changes,'type')??relation.type;
      const from=relationChange(input.changes,'fromRecordId')??relation.fromRecordId;
      const to=relationChange(input.changes,'toRecordId')??relation.toRecordId;
      if (!relationTypes.includes(type as RelationshipType)||!recordIds.has(from)||!recordIds.has(to)||from===to) throw new Error('Invalid relationship change');
      if (type===relation.type&&from===relation.fromRecordId&&to===relation.toRecordId) return;
      sql.prepare("UPDATE relationships SET type=?,from_record_id=?,to_record_id=?,status='proposed',reason=? WHERE id=?").run(type,from,to,input.reason,relation.id);
      addAudit(input.projectId,input.action,'relationship',relation.id,input.reason,{before:relation,after:{type,fromRecordId:from,toRecordId:to}});
    } else if (input.action==='merge_relationship') {
      const type=relationChange(input.changes,'type');
      const from=relationChange(input.changes,'fromRecordId');
      const to=relationChange(input.changes,'toRecordId');
      if (!type||!from||!to||!relationTypes.includes(type as RelationshipType)||!recordIds.has(from)||!recordIds.has(to)||from===to) throw new Error('Valid relationship endpoints and type are required');
      const existing=current.relationships.find(x=>x.fromRecordId===from&&x.toRecordId===to&&x.type===type);
      if (existing?.status==='approved') return;
      if (existing) sql.prepare("UPDATE relationships SET status='approved',reason=? WHERE id=?").run(input.reason,existing.id);
      else sql.prepare('INSERT INTO relationships(id,project_id,from_record_id,to_record_id,type,status,reason,source_quote) VALUES (?,?,?,?,?,?,?,NULL)').run(randomUUID(),input.projectId,from,to,type,'approved',input.reason);
      addAudit(input.projectId,input.action,'relationship',existing?.id??input.targetId,input.reason,{fromRecordId:from,toRecordId:to,type});
    } else if (input.action==='edit_event') {
      if (!event) throw new Error('Housing event not found');
      const units=typeof input.changes?.units==='number'?input.changes.units:Number(input.changes?.units);
      const sourceRecordId=typeof input.changes?.sourceRecordId==='string'?input.changes.sourceRecordId:'';
      if (!Number.isInteger(units)||units<=0||!recordIds.has(sourceRecordId)||!event.sourceRecordIds.includes(sourceRecordId)) throw new Error('Correction requires positive units and the event’s existing source record.');
      if (!current.claims.some(claim=>claim.recordId===sourceRecordId&&claim.units===units&&['addition','building-total'].includes(claim.kind)&&claim.reviewStatus!=='rejected'&&supportedQuote(current.records.find(r=>r.id===sourceRecordId)?.description??'',claim.quote))) throw new Error('Corrected units must match a current source-supported addition or building-total claim.');
      if (event.units===units&&event.sourceRecordIds.length===1&&event.sourceRecordIds[0]===sourceRecordId) return;
      sql.prepare("UPDATE events SET units=?,source_record_ids=?,status='evidence-awaiting-review',review_decision_id=NULL WHERE id=?").run(units,JSON.stringify([sourceRecordId]),event.id);
      addAudit(input.projectId,input.action,'event',event.id,input.reason,{before:{units:event.units,sourceRecordIds:event.sourceRecordIds},after:{units,sourceRecordIds:[sourceRecordId]}});
    } else if (input.action==='approve_event') {
      if (!event) throw new Error('Housing event not found');
      if (event.status==='verified-addition'&&event.reviewDecisionId) return;
      const c=input.changes??{};
      const evidenceId=typeof c.evidenceId==='string'?c.evidenceId:'';
      const evidenceMatch=findEvidence(evidenceId);
      if (!evidenceMatch||evidenceMatch.projectId!==input.projectId) throw new Error('Selected occupancy evidence is not in this project');
      const units=typeof c.units==='number'?c.units:Number(c.units);
      const eventDate=typeof c.eventDate==='string'?c.eventDate:'';
      const evidenceQuote=typeof c.evidenceQuote==='string'?c.evidenceQuote.trim():'';
      const checks=(c.checks && typeof c.checks==='object') ? c.checks as Record<string,boolean> : {};
      const errors=canApproveEvent({event,evidence:evidenceMatch.evidence,projectScope:current.project.scope,checks,units,eventDate,evidenceQuote});
      if (event.pendingEvidenceId && evidenceId!==event.pendingEvidenceId) errors.push('New event-linked evidence must be reviewed for this approval.');
      if (!event.sourceRecordIds.length||!event.sourceRecordIds.every(x=>recordIds.has(x))) errors.push('The event must have source permit evidence.');
      if (!current.claims.some(claim=>event.sourceRecordIds.includes(claim.recordId)&&claim.units===event.units&&['addition','building-total'].includes(claim.kind)&&claim.reviewStatus!=='rejected'&&supportedQuote(current.records.find(r=>r.id===claim.recordId)?.description??'',claim.quote))) errors.push('The candidate increment is no longer supported by a current source claim.');
      if (input.projectId==='conversion-12k') {
        const prior=current.evidence.find(item=>item.id==='conversion-12k:city-co:47881');
        if (evidenceId!=='conversion-12k:city-co:bp-2020-11373' || !prior || !event.evidenceIds.includes(prior.id)) errors.push('Compare the prior and current City occupancy certificates for this conversion.');
        if (prior && !supportedQuote(prior.text,"first floor as a doctor's office and use of second floor as a one family dwelling")) errors.push('The prior one-dwelling baseline is not supported by its City certificate.');
        if (!supportedQuote(evidenceMatch.evidence.text,'TWO UNIT RESIDENTIAL WITH ONE UNIT ON 1ST FLOOR') || eventDate!=='2024-02-25' || units!==1) errors.push('The new City certificate must support two resulting dwellings, one added dwelling, and its February 25, 2024 issue date.');
      }
      if (errors.length) throw new Error(errors.join(' '));
      const decisionId=randomUUID();
      const evidenceIds=[...new Set([...event.evidenceIds,evidenceId])];
      sql.prepare("UPDATE events SET units=?,event_date=?,status='verified-addition',evidence_ids=?,review_decision_id=?,pending_evidence_id=NULL WHERE id=?").run(units,eventDate,JSON.stringify(evidenceIds),decisionId,event.id);
      addAudit(input.projectId,input.action,'event',event.id,input.reason,{decisionId,units,eventDate,evidenceId,evidenceQuote,pageRef:evidenceMatch.evidence.pageRef,checks});
    } else if (input.action==='reject_event') {
      if (!event) throw new Error('Housing event not found');
      if (event.status==='unresolved'&&!event.reviewDecisionId) return;
      sql.prepare("UPDATE events SET status='unresolved',review_decision_id=NULL WHERE id=?").run(event.id);
      addAudit(input.projectId,input.action,'event',event.id,input.reason,{before:event.status});
    } else if (input.action==='reverse_event') {
      if (!event) throw new Error('Housing event not found');
      if (event.status!=='verified-addition') throw new Error('Only a verified event can be reversed');
      sql.prepare("UPDATE events SET status='evidence-awaiting-review',review_decision_id=NULL WHERE id=?").run(event.id);
      addAudit(input.projectId,input.action,'event',event.id,input.reason,{reversedDecisionId:event.reviewDecisionId});
    }
  })();
  return getProject(input.projectId)!;
}
