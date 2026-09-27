import { describe, expect, it, vi } from 'vitest';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

async function workflow() {
  vi.resetModules();
  process.env.COUNTABLE_DB_PATH=join(tmpdir(),`countable-test-${randomUUID()}.db`);
  const db=await import('./db');
  const decisions=await import('./decisions');
  const ledger=await import('./ledger');
  return {...db,...decisions,...ledger};
}

describe('persisted reviewer workflow',()=>{
  it('approves only the synthetic sandbox event, idempotently, then reverses with audit history',async()=>{
    const app=await workflow();
    const project=app.getProject('development-10c-sandbox')!;
    const event=project.events[0];
    const evidence=project.evidence[0];
    const decision={projectId:project.project.id,action:'approve_event' as const,targetId:event.id,reason:'Synthetic fixture explicitly identifies A3, nine apartments, and a housing-event date.',changes:{evidenceId:evidence.id,eventDate:'2025-11-01',units:9,evidenceQuote:'9 new apartments on 2025-11-01',checks:{identity:true,residentialScope:true,units:true,date:true,conditions:true,priorCounting:true}}};
    app.applyDecision(decision);
    expect(app.getLedger('synthetic').totalUnits).toBe(9);
    expect(app.getLedger('real').totalUnits).toBe(0);
    expect(app.getLedger('real').unresolvedProjects).toHaveLength(5);
    app.applyDecision(decision);
    expect(app.getProject(project.project.id)!.audit.filter(a=>a.action==='approve_event')).toHaveLength(1);
    app.applyDecision({projectId:project.project.id,action:'reverse_event',targetId:event.id,reason:'Reviewer corrected the approval.'});
    expect(app.getLedger('synthetic').totalUnits).toBe(0);
    expect(app.getProject(project.project.id)!.audit.map(a=>a.action)).toEqual(expect.arrayContaining(['approve_event','reverse_event']));
  });
  it('records relationship corrections without double-counting the trade permit',async()=>{
    const app=await workflow();
    const p=app.getProject('development-10c')!;
    const trade=p.relationships.find(x=>x.type==='supporting-trade')!;
    app.applyDecision({projectId:p.project.id,action:'approve_relationship',targetId:trade.id,reason:'Sprinkler permit explicitly references BP-2024-13992.'});
    expect(app.getLedger('real').totalUnits).toBe(0);
    app.applyDecision({projectId:p.project.id,action:'split_relationship',targetId:trade.id,reason:'Reviewer found the proposed link unsupported.'});
    const updated=app.getProject(p.project.id)!;
    expect(updated.relationships.find(x=>x.id===trade.id)?.status).toBe('rejected');
    expect(updated.audit.map(x=>x.action)).toEqual(expect.arrayContaining(['approve_relationship','split_relationship']));
  });
  it('requires real evidence for real approval and reopens approvals when new evidence arrives',async()=>{
    const app=await workflow();
    const real=app.getProject('development-10c')!;
    const sandbox=app.getProject('development-10c-sandbox')!;
    expect(()=>app.applyDecision({projectId:real.project.id,action:'approve_event',targetId:real.events[0].id,reason:'Trying to use synthetic example.',changes:{evidenceId:sandbox.evidence[0].id,eventDate:'2025-11-01',units:9,checks:{identity:true,residentialScope:true,units:true,date:true,conditions:true,priorCounting:true}}})).toThrow(/not in this project/);
    const ev=sandbox.events[0];
    app.applyDecision({projectId:sandbox.project.id,action:'approve_event',targetId:ev.id,reason:'Complete synthetic review.',changes:{evidenceId:sandbox.evidence[0].id,eventDate:'2025-11-01',units:9,evidenceQuote:'9 new apartments on 2025-11-01',checks:{identity:true,residentialScope:true,units:true,date:true,conditions:true,priorCounting:true}}});
    app.saveEvidence({projectId:sandbox.project.id,type:'occupancy',label:'Unrelated simulated evidence',text:'SYNTHETIC unrelated parcel',sourceRef:'simulation unrelated',pageRef:'1',synthetic:true,extractionStatus:'ready'});
    expect(app.getLedger('synthetic').totalUnits).toBe(9);
    const revised=app.saveEvidence({projectId:sandbox.project.id,type:'occupancy',label:'Superseding simulated evidence',text:'SYNTHETIC A3 occupancy for 9 apartments on 2025-11-02 with revised conditions.',sourceRef:'simulation 2',pageRef:'1',synthetic:true,extractionStatus:'ready',relatedEventId:ev.id});
    expect(app.getLedger('synthetic').totalUnits).toBe(0);
    expect(app.getProject(sandbox.project.id)!.events[0].pendingEvidenceId).toBe(revised.id);
    expect(()=>app.applyDecision({projectId:sandbox.project.id,action:'approve_event',targetId:ev.id,reason:'Improperly ignoring superseding evidence.',changes:{evidenceId:sandbox.evidence[0].id,eventDate:'2025-11-01',units:9,evidenceQuote:'9 new apartments on 2025-11-01',checks:{identity:true,residentialScope:true,units:true,date:true,conditions:true,priorCounting:true}}})).toThrow(/New event-linked evidence/);
    expect(app.getProject(sandbox.project.id)!.audit.map(a=>a.action)).toContain('add_evidence');
  });
  it('rejects unsupported unit inflation and occupancy dates despite checked boxes',async()=>{
    const app=await workflow();
    const p=app.getProject('development-10c-sandbox')!;
    const event=p.events[0],evidence=p.evidence[0];
    const checks={identity:true,residentialScope:true,units:true,date:true,conditions:true,priorCounting:true};
    expect(()=>app.applyDecision({projectId:p.project.id,action:'approve_event',targetId:event.id,reason:'Attempted inflation.',changes:{evidenceId:evidence.id,eventDate:'2025-11-01',units:999,evidenceQuote:'9 new apartments on 2025-11-01',checks}})).toThrow(/candidate increment/);
    expect(()=>app.applyDecision({projectId:p.project.id,action:'approve_event',targetId:event.id,reason:'Invented date.',changes:{evidenceId:evidence.id,eventDate:'2026-01-01',units:9,evidenceQuote:'9 new apartments on 2025-11-01',checks}})).toThrow(/selected event date/);
    expect(app.getLedger('synthetic').totalUnits).toBe(0);
  });
  it('re-imports the same snapshot without spurious source updates',async()=>{
    const app=await workflow();
    const before=app.getProject('development-10c')!.audit.length;
    vi.resetModules();
    const reloaded=await import('./db');
    expect(reloaded.getProject('development-10c')!.audit.length).toBe(before);
    expect(reloaded.getProject('development-10c')!.audit.filter(a=>a.action==='source_updated')).toHaveLength(0);
  });
  it('reviews, corrects, and reverses a source-quoted claim with audit',async()=>{
    const app=await workflow();
    const p=app.getProject('conversion-12k')!;
    const claim=p.claims.find(c=>c.kind==='resulting'&&c.recordId.includes('BP-2020'))!;
    app.applyDecision({projectId:p.project.id,action:'approve_claim',targetId:claim.id,reason:'Source says two-unit residential.'});
    expect(app.getProject(p.project.id)!.claims.find(c=>c.id===claim.id)?.reviewStatus).toBe('approved');
    expect(()=>app.applyDecision({projectId:p.project.id,action:'edit_claim',targetId:claim.id,reason:'Unsupported correction.',changes:{quote:'five units',units:5}})).toThrow(/exact source quote/);
    app.applyDecision({projectId:p.project.id,action:'edit_claim',targetId:claim.id,reason:'Clarify source quote.',changes:{quote:'TWO UNIT RESIDENTIAL',units:2}});
    expect(app.getProject(p.project.id)!.claims.find(c=>c.id===claim.id)?.reviewStatus).toBe('proposed');
    app.applyDecision({projectId:p.project.id,action:'approve_claim',targetId:claim.id,reason:'Corrected claim approved.'});
    app.applyDecision({projectId:p.project.id,action:'reverse_claim',targetId:claim.id,reason:'Reopen for second review.'});
    const updated=app.getProject(p.project.id)!;
    expect(updated.claims.find(c=>c.id===claim.id)?.reviewStatus).toBe('proposed');
    expect(updated.audit.map(a=>a.action)).toEqual(expect.arrayContaining(['approve_claim','edit_claim','reverse_claim']));
  });
  it('persists an uploaded original PDF reference beside extracted evidence',async()=>{
    const app=await workflow();
    const bytes=Buffer.from('%PDF-1.4\nsynthetic fixture');
    const saved=app.saveEvidence({projectId:'development-10c-sandbox',type:'occupancy',label:'Scanned synthetic example',text:'',sourceRef:'scan.pdf',pageRef:null,synthetic:true,extractionStatus:'manual-needed',originalFile:{name:'scan.pdf',bytes}});
    expect(saved.originalFileUrl).toBe(`/api/evidence/${saved.id}/file`);
    expect(saved.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(app.getOriginalPdf(saved.id)?.bytes).toEqual(bytes);
    expect(app.getProject('development-10c-sandbox')!.evidence.find(e=>e.id===saved.id)?.extractionStatus).toBe('manual-needed');
  });
  it('reopens an approved event if its source permit changes on a later import',async()=>{
    const originalCwd=process.cwd();
    const testRoot=join(tmpdir(),`countable-import-${randomUUID()}`);
    mkdirSync(join(testRoot,'data'),{recursive:true});
    const sourceJson=JSON.parse(readFileSync(join(originalCwd,'data','permits.snapshot.json'),'utf8'));
    writeFileSync(join(testRoot,'data','permits.snapshot.json'),JSON.stringify(sourceJson));
    writeFileSync(join(testRoot,'data','source-manifest.json'),readFileSync(join(originalCwd,'data','source-manifest.json')));
    try {
      process.chdir(testRoot);
      vi.resetModules();
      process.env.COUNTABLE_DB_PATH=join(testRoot,'countable.db');
      const app=await import('./db');
      const decisions=await import('./decisions');
      const sandbox=app.getProject('development-10c-sandbox')!;
      const ev=sandbox.events[0];
      decisions.applyDecision({projectId:sandbox.project.id,action:'approve_event',targetId:ev.id,reason:'Synthetic example initially reviewed.',changes:{evidenceId:sandbox.evidence[0].id,eventDate:'2025-11-01',units:9,evidenceQuote:'9 new apartments on 2025-11-01',checks:{identity:true,residentialScope:true,units:true,date:true,conditions:true,priorCounting:true}}});
      const revisedRecord=sourceJson.records.find((r:{permit_id:string})=>r.permit_id==='BP-2024-13992');
      revisedRecord.status='Amended';
      revisedRecord.work_description='AMENDED CONSTRUCTION OF BUILDING NO A3 WITH 10 APARTMENTS';
      writeFileSync(join(testRoot,'data','permits.snapshot.json'),JSON.stringify(sourceJson));
      vi.resetModules();
      const imported=await import('./db');
      expect(imported.getProject(sandbox.project.id)!.events[0].status).toBe('evidence-awaiting-review');
      expect(imported.getProject(sandbox.project.id)!.audit.map(a=>a.action)).toContain('source_updated');
      expect(imported.getProject(sandbox.project.id)!.claims.find(c=>c.recordId.endsWith('BP-2024-13992')&&c.units===9)?.reviewStatus).toBe('rejected');
      expect(imported.getProject(sandbox.project.id)!.claims.find(c=>c.recordId.endsWith('BP-2024-13992')&&c.units===10)?.reviewStatus).toBe('proposed');
      expect(imported.getProject(sandbox.project.id)!.audit.map(a=>a.action)).toContain('source_claim_superseded');
      const review=await import('./decisions');
      review.applyDecision({projectId:sandbox.project.id,action:'edit_event',targetId:ev.id,reason:'Amended source changes A3 proposed units.',changes:{units:10,sourceRecordId:ev.sourceRecordIds[0]}});
      expect(imported.getProject(sandbox.project.id)!.events[0].units).toBe(10);
      expect(imported.getProject(sandbox.project.id)!.audit.map(a=>a.action)).toContain('edit_event');
    } finally { process.chdir(originalCwd); }
  });
});
