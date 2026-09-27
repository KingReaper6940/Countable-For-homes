import { describe, expect, it } from 'vitest';
import snapshot from '../../data/permits.snapshot.json';
import { canApproveEvent, countApprovedEvents, extractClaims, extractPermitReferences, findBuildingLabel, supportedQuote } from './rules';
import type { Evidence, HousingEvent, SourceRecord } from './types';

const raw=snapshot.records;
function source(permitId:string):SourceRecord {
  const r=raw.find(x=>x.permit_id===permitId)!;
  return {id:r.permit_id,permitId:r.permit_id,type:r.permit_type,description:r.work_description,workType:r.work_type,issueDate:r.issue_date,parcel:r.parcel_num,address:r.address,status:r.status,buildingLabel:findBuildingLabel(r.work_description),sourceUrl:snapshot.sourceUrl};
}
function event(id:string, units:number|null, status:HousingEvent['status']='evidence-awaiting-review'):HousingEvent {
  return {id,kind:'addition',buildingLabel:null,units,eventDate:null,status,blockers:[],sourceRecordIds:['BP-2024-13992'],evidenceIds:[],reviewDecisionId:null,pendingEvidenceId:null};
}

describe('source-linked permit interpretation',()=>{
  it('keeps resulting units distinct from the one added dwelling, including the duplicate trade text',()=>{
    const building=extractClaims(source('BP-2020-11373'));
    const electrical=extractClaims(source('EP-2021-10918'));
    expect(building.map(x=>[x.kind,x.units])).toEqual([['addition',1],['resulting',2]]);
    expect(electrical.map(x=>[x.kind,x.units])).toEqual([['addition',1],['resulting',2]]);
    expect(countApprovedEvents([event('conversion:addition',1),event('conversion:addition',1)])).toBe(0);
  });
  it('keeps four buildings on the same parcel distinct and does not add the parent total',()=>{
    const ids=['BP-2024-13992','BP-2024-13991','BP-2024-13989','BP-2025-00108'];
    expect(ids.map(id=>findBuildingLabel(source(id).description))).toEqual(['A3','A4','A7','A8']);
    expect(ids.map(id=>extractClaims(source(id)).find(x=>x.kind==='building-total')?.units)).toEqual([9,9,9,13]);
    expect(extractClaims(source('BDA-2024-03554')).map(x=>[x.kind,x.units])).toContainEqual(['project-total',70]);
    expect(findBuildingLabel(source('BDA-2024-03554').description)).toBeNull();
  });
  it('treats a completed temporary-use application as a reference, not occupancy approval',()=>{
    const temp=source('BDA-2026-05107');
    expect(temp.status).toBe('Completed');
    expect(extractPermitReferences(temp.description)).toContain('BP-2024-13992');
    expect(extractClaims(temp)).toEqual([]);
    const e=event('A3',9);
    expect(e.eventDate).toBeNull();
  });
  it('rejects fabricated source quotations',()=>{
    expect(supportedQuote(source('BP-2024-13992').description,'9 APARTMENTS')).toBe(true);
    expect(supportedQuote(source('BP-2024-13992').description,'Certificate of occupancy issued')).toBe(false);
  });
  it('extracts additional cohort claims while abstaining from addition or completed-loss events',()=>{
    expect(extractClaims(source('BDA-2024-00844')).map(c=>[c.kind,c.units])).toEqual([['resulting',2]]);
    expect(extractClaims(source('BP-2023-03827')).map(c=>[c.kind,c.units])).toEqual([['existing',11],['resulting',8]]);
    expect(extractClaims(source('BP-2022-11140')).map(c=>[c.kind,c.units])).toEqual([['resulting',3]]);
  });
});

describe('ledger approval gate',()=>{
  const evidence:Evidence={id:'synthetic-occupancy',type:'occupancy',label:'Synthetic example',text:'Synthetic occupancy for A3',sourceRef:'simulation',pageRef:'1',synthetic:true,extractionStatus:'ready',createdAt:'2026-09-26',originalFileUrl:null,sha256:null};
  const checks={identity:true,residentialScope:true,units:true,date:true,conditions:true,priorCounting:true};
  it('keeps missing evidence unknown and blocks completed-status shortcuts',()=>{
    const errors=canApproveEvent({event:event('A3',9),evidence:{...evidence,text:'',extractionStatus:'manual-needed'},projectScope:'synthetic',checks,units:9,eventDate:'2025-11-01',evidenceQuote:'9 apartments on 2025-11-01'});
    expect(errors).toContain('Occupancy text requires extraction or manual transcription.');
  });
  it('isolates synthetic evidence from the real ledger',()=>{
    expect(canApproveEvent({event:event('A3',9),evidence,projectScope:'real',checks,units:9,eventDate:'2025-11-01',evidenceQuote:'9 apartments on 2025-11-01'})).toContain('Synthetic evidence cannot support a real ledger event.');
  });
  it('deduplicates stable approved event identities',()=>{
    const approved={...event('A3',9,'verified-addition'),eventDate:'2025-11-01',reviewDecisionId:'review-1'};
    expect(countApprovedEvents([approved,approved])).toBe(9);
  });
  it('accepts common certificate date renderings when the quoted passage is exact',()=>{
    for (const dateText of ['November 1, 2025','Nov 1, 2025','11/1/2025','11/01/2025']) {
      const quote=`9 apartments authorized on ${dateText}`;
      expect(canApproveEvent({event:event('A3',9),evidence:{...evidence,text:quote},projectScope:'synthetic',checks,units:9,eventDate:'2025-11-01',evidenceQuote:quote})).toEqual([]);
    }
  });
});
