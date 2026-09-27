import { describe, expect, it, vi } from 'vitest';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import Database from 'better-sqlite3';

async function workflow() {
  vi.resetModules();
  process.env.COUNTABLE_DB_PATH=join(tmpdir(),`countable-test-${randomUUID()}.db`);
  const db=await import('./db');
  const decisions=await import('./decisions');
  const ledger=await import('./ledger');
  return {...db,...decisions,...ledger};
}

describe('real permit workflow',()=>{
  it('shows only real projects and no verified additions before occupancy review',async()=>{
    const app=await workflow();
    expect(app.listProjects().projects).toHaveLength(5);
    expect(app.listProjects().projects.every(p=>p.scope==='real')).toBe(true);
    expect(app.getProject('development-10c-sandbox')).toBeNull();
    expect(app.getLedger('real').totalUnits).toBe(0);
    expect(()=>app.getLedger('synthetic')).toThrow(/Only the real-record ledger/);
    expect(app.getLedger('real').unresolvedProjects).toHaveLength(5);
  });

  it('reviews two original City certificates into one additional South 20th dwelling',async()=>{
    const app=await workflow();
    const project=app.getProject('conversion-12k')!;
    const event=project.events[0];
    const prior=project.evidence.find(item=>item.id==='conversion-12k:city-co:47881')!;
    const current=project.evidence.find(item=>item.id==='conversion-12k:city-co:bp-2020-11373')!;
    expect(prior.text).toContain("doctor's office and use of second floor as a one family dwelling");
    expect(current.text).toContain('TWO UNIT RESIDENTIAL WITH ONE UNIT ON 1ST FLOOR');
    expect(event.evidenceIds).toEqual(expect.arrayContaining([prior.id,current.id]));
    const decision={projectId:project.project.id,action:'approve_event' as const,targetId:event.id,reason:'Prior City certificate 47881 allows one dwelling above an office; new City certificate BP-2020-11373 allows two dwellings and the permit says add one dwelling. Conditions and prior counting reviewed.',changes:{evidenceId:current.id,eventDate:'2024-02-25',units:1,evidenceQuote:current.text,checks:{identity:true,residentialScope:true,units:true,date:true,conditions:true,priorCounting:true}}};
    app.applyDecision(decision);
    expect(app.getLedger('real').totalUnits).toBe(1);
    expect(app.getLedger('real').events[0].evidenceRefs).toHaveLength(2);
    app.applyDecision(decision);
    expect(app.getProject(project.project.id)!.audit.filter(entry=>entry.action==='approve_event')).toHaveLength(1);
  });

  it('removes only legacy sandbox rows and uploads while preserving real reviews',async()=>{
    const app=await workflow();
    const real=app.getProject('development-10c')!;
    const trade=real.relationships.find(x=>x.type==='supporting-trade')!;
    app.applyDecision({projectId:real.project.id,action:'approve_relationship',targetId:trade.id,reason:'Source explicitly references the building permit.'});
    const sql=new Database(process.env.COUNTABLE_DB_PATH!);
    const evidenceId=randomUUID();
    const uploadDir=join(process.cwd(),'.countable','uploads');
    mkdirSync(uploadDir,{recursive:true});
    const upload=join(uploadDir,`${evidenceId}.pdf`);
    writeFileSync(upload,Buffer.from('%PDF-1.4\nlegacy'));
    sql.prepare("INSERT INTO projects(id,scope,name,subtitle,parcel,address) VALUES ('development-10c-sandbox','synthetic','Legacy example','','','')").run();
    sql.prepare("INSERT INTO evidence(id,project_id,type,label,text,source_ref,synthetic,extraction_status,created_at,original_file_name) VALUES (?, 'development-10c-sandbox','occupancy','Legacy example','','legacy',1,'ready','2026-01-01','legacy.pdf')").run(evidenceId);
    sql.prepare("INSERT INTO audit(id,project_id,action,target_type,target_id,reason,at,details) VALUES (?, 'development-10c-sandbox','add_evidence','evidence',?,'Legacy review','2026-01-01','{}')").run(randomUUID(),evidenceId);
    sql.close();
    vi.resetModules();
    const reloaded=await import('./db');
    expect(reloaded.getProject('development-10c-sandbox')).toBeNull();
    expect(reloaded.listProjects().projects).toHaveLength(5);
    expect(reloaded.getProject('development-10c')!.relationships.find(x=>x.id===trade.id)?.status).toBe('approved');
    const check=new Database(process.env.COUNTABLE_DB_PATH!);
    expect(check.prepare("SELECT id FROM projects WHERE id='development-10c-sandbox'").get()).toBeUndefined();
    expect(check.prepare("SELECT id FROM evidence WHERE project_id='development-10c-sandbox'").get()).toBeUndefined();
    expect(check.prepare("SELECT id FROM audit WHERE project_id='development-10c-sandbox'").get()).toBeUndefined();
    expect(existsSync(upload)).toBe(false);
    check.close();
  });

  it('reviews and corrects real permit relationships without counting them',async()=>{
    const app=await workflow();
    const real=app.getProject('development-10c')!;
    const trade=real.relationships.find(x=>x.type==='supporting-trade')!;
    app.applyDecision({projectId:real.project.id,action:'approve_relationship',targetId:trade.id,reason:'Sprinkler permit explicitly references BP-2024-13992.'});
    expect(app.getLedger('real').totalUnits).toBe(0);
    app.applyDecision({projectId:real.project.id,action:'split_relationship',targetId:trade.id,reason:'Reviewer found the proposed link unsupported.'});
    const updated=app.getProject(real.project.id)!;
    expect(updated.relationships.find(x=>x.id===trade.id)?.status).toBe('rejected');
    expect(updated.audit.map(x=>x.action)).toEqual(expect.arrayContaining(['approve_relationship','split_relationship']));
  });

  it('requires sourced occupancy evidence before an event can be approved',async()=>{
    const app=await workflow();
    const real=app.getProject('development-10c')!;
    expect(()=>app.applyDecision({projectId:real.project.id,action:'approve_event',targetId:real.events[0].id,reason:'No occupancy document is available.',changes:{evidenceId:'missing',eventDate:'2025-11-01',units:9,evidenceQuote:'',checks:{identity:true,residentialScope:true,units:true,date:true,conditions:true,priorCounting:true}}})).toThrow(/not in this project/);
    expect(app.getLedger('real').totalUnits).toBe(0);
  });

  it('approves and reverses a test-only evidence review on a real case',async()=>{
    const app=await workflow();
    const project=app.getProject('development-10c')!;
    const event=project.events.find(e=>e.buildingLabel==='A3')!;
    const quote='Residential occupancy authorized for 9 new apartments on 2025-11-01.';
    const evidence=app.saveEvidence({projectId:project.project.id,type:'occupancy',label:'Isolated test evidence',text:quote,sourceRef:'test-only document',pageRef:'1',synthetic:false,extractionStatus:'ready'});
    const decision={projectId:project.project.id,action:'approve_event' as const,targetId:event.id,reason:'Test review checks source quote, unit count, and date.',changes:{evidenceId:evidence.id,eventDate:'2025-11-01',units:9,evidenceQuote:quote,checks:{identity:true,residentialScope:true,units:true,date:true,conditions:true,priorCounting:true}}};
    app.applyDecision(decision);
    expect(app.getLedger('real').totalUnits).toBe(9);
    app.applyDecision(decision);
    expect(app.getProject(project.project.id)!.audit.filter(a=>a.action==='approve_event')).toHaveLength(1);
    app.applyDecision({projectId:project.project.id,action:'reverse_event',targetId:event.id,reason:'Test reversal.'});
    expect(app.getLedger('real').totalUnits).toBe(0);
  });

  it('keeps reviewer work across identical source reimports',async()=>{
    const app=await workflow();
    const real=app.getProject('development-10c')!;
    const trade=real.relationships.find(x=>x.type==='supporting-trade')!;
    app.applyDecision({projectId:real.project.id,action:'approve_relationship',targetId:trade.id,reason:'Explicit permit reference.'});
    vi.resetModules();
    const reloaded=await import('./db');
    const updated=reloaded.getProject(real.project.id)!;
    expect(updated.relationships.find(x=>x.id===trade.id)?.status).toBe('approved');
    expect(updated.audit.filter(a=>a.action==='source_updated')).toHaveLength(0);
  });

  it('invalidates a real review when its permit source changes',async()=>{
    const originalCwd=process.cwd();
    const testRoot=join(tmpdir(),`countable-refresh-${randomUUID()}`);
    mkdirSync(join(testRoot,'data'),{recursive:true});
    const sourceJson=JSON.parse(readFileSync(join(originalCwd,'data','permits.snapshot.json'),'utf8'));
    writeFileSync(join(testRoot,'data','permits.snapshot.json'),JSON.stringify(sourceJson));
    writeFileSync(join(testRoot,'data','source-manifest.json'),readFileSync(join(originalCwd,'data','source-manifest.json')));
    try {
      process.chdir(testRoot);
      vi.resetModules();
      process.env.COUNTABLE_DB_PATH=join(testRoot,'countable.db');
      const db=await import('./db');
      const decisions=await import('./decisions');
      const project=db.getProject('development-10c')!;
      const claim=project.claims.find(c=>c.recordId.endsWith('BP-2024-13992')&&c.units===9)!;
      decisions.applyDecision({projectId:project.project.id,action:'approve_claim',targetId:claim.id,reason:'Permit passage supports the claim.'});
      const changed=sourceJson.records.find((r:{permit_id:string})=>r.permit_id==='BP-2024-13992');
      changed.status='Amended';
      changed.work_description='AMENDED CONSTRUCTION OF BUILDING NO A3 WITH 10 APARTMENTS';
      writeFileSync(join(testRoot,'data','permits.snapshot.json'),JSON.stringify(sourceJson));
      vi.resetModules();
      const reloaded=await import('./db');
      const updated=reloaded.getProject(project.project.id)!;
      expect(updated.claims.find(c=>c.id===claim.id)?.reviewStatus).toBe('rejected');
      expect(updated.claims.find(c=>c.recordId.endsWith('BP-2024-13992')&&c.units===10)?.reviewStatus).toBe('proposed');
      expect(updated.audit.map(a=>a.action)).toEqual(expect.arrayContaining(['source_updated','source_claim_superseded']));
    } finally {
      process.chdir(originalCwd);
    }
  });

  it('stores reviewer supplied PDFs with real cases',async()=>{
    const app=await workflow();
    const bytes=Buffer.from('%PDF-1.4\nfixture');
    const saved=app.saveEvidence({projectId:'development-10c',type:'other',label:'Scan requiring transcription',text:'',sourceRef:'scan.pdf',pageRef:null,synthetic:false,extractionStatus:'manual-needed',originalFile:{name:'scan.pdf',bytes}});
    expect(saved.originalFileUrl).toBe(`/api/evidence/${saved.id}/file`);
    expect(saved.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(app.getOriginalPdf(saved.id)?.bytes).toEqual(bytes);
  });
});
