import snapshot from '../data/permits.snapshot.json';
import { getProject } from '../src/lib/db';
import { extractClaims, findBuildingLabel, supportedQuote } from '../src/lib/rules';
import type { SourceRecord } from '../src/lib/types';

type Label = { permitId: string; kind: string; units: number; passage: string };
const showcase: Label[] = [
  ['BDA-2024-03554','project-total',70,'70 NEW UNITS IN 8 NEW BUILDINGS'],
  ['BP-2024-13992','building-total',9,'9 APARTMENTS'],
  ['BP-2024-13991','building-total',9,'9 APARTMENTS'],
  ['BP-2024-13989','building-total',9,'9 APARTMENTS'],
  ['BP-2025-00108','building-total',13,'13 APARTMENTS'],
  ['SSP-2025-03861','building-total',9,'9 APARTMENTS'],
  ['BP-2020-11373','addition',1,'ADD A DWELLING UNIT'],
  ['BP-2020-11373','resulting',2,'AS TWO UNIT RESIDENTIAL'],
  ['EP-2021-10918','addition',1,'ADD A DWELLING UNIT'],
  ['EP-2021-10918','resulting',2,'AS TWO UNIT RESIDENTIAL'],
].map(([permitId,kind,units,passage])=>({permitId:String(permitId),kind:String(kind),units:Number(units),passage:String(passage)}));

// Challenge cases were selected after the showcase rules were designed.
// Labels capture text claims, not completed housing events.
const cohort: Label[] = [
  ['BDA-2024-00844','resulting',2,'AS TWO-UNIT RESIDENCE'],
  ['BP-2023-03827','existing',11,'CONVERSION OF 11 UNIT TO 8 UNIT'],
  ['BP-2023-03827','resulting',8,'11 UNIT TO 8 UNIT'],
  ['BP-2022-11140','resulting',3,'THREE-UNIT RESIDENTIAL'],
].map(([permitId,kind,units,passage])=>({permitId:String(permitId),kind:String(kind),units:Number(units),passage:String(passage)}));

const byPermit = new Map(snapshot.records.map(record=>[record.permit_id,record]));
const extracted = new Map<string,string[]>();
for (const record of snapshot.records) {
  const source:SourceRecord={id:record.permit_id,permitId:record.permit_id,type:record.permit_type,
    description:record.work_description,workType:record.work_type,issueDate:record.issue_date,
    parcel:record.parcel_num,address:record.address,status:record.status,
    buildingLabel:findBuildingLabel(record.work_description),sourceUrl:snapshot.sourceUrl};
  extracted.set(record.permit_id,extractClaims(source).map(claim=>`${claim.kind}/${claim.units}`));
}
function score(labels:Label[], permitIds:string[]) {
  for (const label of labels) {
    const source=byPermit.get(label.permitId);
    if (!source||!supportedQuote(source.work_description,label.passage)) throw new Error(`Unsupported manual label: ${label.permitId} / ${label.passage}`);
  }
  const missed=labels.filter(label=>!extracted.get(label.permitId)?.includes(`${label.kind}/${label.units}`));
  const expected=new Set(labels.map(label=>`${label.permitId}/${label.kind}/${label.units}`));
  const unsupported=permitIds.flatMap(permitId=>(extracted.get(permitId)??[]).map(claim=>`${permitId}/${claim}`)).filter(claim=>!expected.has(claim));
  return {labeled:labels.length,matched:labels.length-missed.length,missed:missed.map(label=>`${label.permitId}/${label.kind}/${label.units}`),unsupported};
}

const expectedRelationships=[
  'BDA-2024-03554/BP-2024-13992/parent-project','BDA-2024-03554/BP-2024-13991/parent-project',
  'BDA-2024-03554/BP-2024-13989/parent-project','BDA-2024-03554/BP-2025-00108/parent-project',
  'SSP-2025-03861/BP-2024-13992/supporting-trade',
  'BDA-2026-05107/BP-2024-13992/occupancy-related',
  'EP-2021-10918/BP-2020-11373/supporting-trade',
];
const actualRelationships=['development-10c','conversion-12k'].flatMap(id=>{
  const project=getProject(id)!;
  const ids=new Map(project.records.map(record=>[record.id,record.permitId]));
  return project.relationships.filter(rel=>!rel.id.includes(':ai-rel:'))
    .map(rel=>`${ids.get(rel.fromRecordId)}/${ids.get(rel.toRecordId)}/${rel.type}`);
});
const missedRelationships=expectedRelationships.filter(label=>!actualRelationships.includes(label));
const cohortProjects=['cohort-two-unit','cohort-conversion','cohort-revoked'].map(id=>getProject(id)!);
console.log(JSON.stringify({
  snapshotAt:snapshot.retrievedAt,
  showcaseClaims:score(showcase,['BP-2020-11373','EP-2021-10918','BDA-2024-03554','BP-2024-13992','BP-2024-13991','BP-2024-13989','BP-2025-00108','SSP-2025-03861','BDA-2026-05107']),
  additionalCohortClaims:score(cohort,['BDA-2024-00844','BP-2023-03827','BP-2022-11140']),
  showcaseRelationships:{labeled:expectedRelationships.length,matched:expectedRelationships.length-missedRelationships.length,missed:missedRelationships},
  additionalCohortEventAbstentions:{labeled:cohortProjects.length,correct:cohortProjects.filter(project=>project.events.length===0).length,
    note:'No countable addition or completed loss event is inferred from these permits.'},
  limitations:'Small manually labeled, implementation-inspected sample; no accuracy claim for live AI or citywide permits.',
},null,2));
